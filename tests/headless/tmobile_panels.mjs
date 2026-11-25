// MP-1 (UI only): compact, action-first panels in every mode. Removals live in a labelled header More menu that names the
// exact object or fixture and opens the same paused review; Lights & cameras and collections sit on the action rail; the
// simulation state is never touched by rendering, toggling More or opening/cancelling a removal review.
// usage: node tests/headless/tmobile_panels.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeScenario, makeSandbox, SCENARIOS } from '../../js/scenarios.js';
import { makeMaple, makePublicMaple, makeEmptyLot } from '../../js/maple.js';
import { upgradeEligible, unitOccupied, mountedOn } from '../../js/unitupgrades.js';
import { idleCorralCarts } from '../../js/removal.js';
import { UI } from '../../js/ui.js';

let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const MODES = [
  ['Tutorial', () => makeMaple()],
  ['Career', () => { const s = makePublicMaple(); s.dispatch({ type: 'tutSkip' }); return s; }],
  ['Sandbox business', () => makeSandbox({ start: 'starter', cash: 100000 })],
  ['Free Build', () => makeSandbox({ kind: 'free', start: 'starter' })],
  ['Creative lot', () => makeEmptyLot({ creative: true })],
  ...Object.keys(SCENARIOS).map((id) => ['Scenario ' + id, () => makeScenario(id, 11)]),
];
const REMOVE = /data-a="(?:removeObject|gateRemove|removeCart|removeKeypad|removeFloor)"/g;
function uiFor(s) {
  const ui = Object.create(UI.prototype), els = { abar: { innerHTML: '' }, modal: { innerHTML: '' }, sheet: { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] } };
  ui.g = { sim: s, rend: { view: 'ext', setPreview() {}, setSelection() {}, setOverlay() {} }, audio: { unlock() {} } }; ui.$ = (id) => els[id]; ui.renderTut = () => {};
  ui.reserveWait = null; ui.root = { querySelectorAll: () => [], querySelector: () => null }; ui.title = false; ui.toast = () => {}; ui.sfx = () => {};
  ui.do = (a) => s.dispatch(a); ui.tab = null; return { ui, els };
}
const parts = (h) => { const body = h.indexOf('<div class="body">'), head = h.indexOf('</header>'); return { header: h.slice(0, head), beforeBody: h.slice(0, body), rail: h.includes('class="dock-actions"') ? h.slice(h.indexOf('class="dock-actions"'), body) : '', body: h.slice(body) }; };
const selectable = (s) => Object.values(s.s.objects).filter((o) => !o.mount && o.cstate !== 'construction');
// The removal set before MP-1, written out independently: the object, its mounted fixtures, idle carts, keypad and top floor.
function expected(s, o) {
  if (o.type === 'gate') return [['gateRemove', o.id]];
  const r = [['removeObject', o.id], ...Object.values(s.s.objects).filter((f) => f.mount?.host === o.id).map((f) => ['removeObject', f.id])];
  if (o.type === 'corral') r.push(...idleCorralCarts(s.s, o.id).map((c) => ['removeCart', c.id]));
  if (o.type === 'door' && o.keypad) r.push(['removeKeypad', o.id]);
  if (o.type === 'shell' && o.floors > 1) r.push(['removeFloor', o.id]);
  return r;
}

await test('every mode, every selectable object: no removal outside More; More holds the full removal set, each naming its target', async () => {
  let objs = 0;
  for (const [mode, make] of MODES) {
    const s = make(); s.ensure(); const { ui } = uiFor(s);
    // Pre-existing (same on parent 74274b6): the first inspection lazily initialises the owner's work-day counters.
    for (const o of selectable(s)) { ui.sel = o.id; ui.inspector(); } const before = JSON.stringify(s.s);
    for (const o of selectable(s)) {
      ui.sel = o.id; objs++;
      for (const tall of [false, true]) {
        ui.sheetTall = tall; ui.moreOpen = false; const h = ui.inspector(); if (!h) continue;
        assert.equal((h.match(REMOVE) || []).length, 0, `${mode} ${o.type} #${o.id}: no removal with More closed`);
        assert.doesNotMatch(h, /class="btn danger"/, `${mode} ${o.type}: no destructive button with More closed`);
        const want = expected(s, o), P = parts(h);
        assert.equal(/data-a="sheetMore"/.test(P.header), want.length > 0, `${mode} ${o.type}: More shown exactly when there is something to remove`);
        if (!want.length) continue;
        assert.match(P.header, /<button class="panel-more" data-a="sheetMore" aria-expanded="false" aria-controls="sheet-more">More<\/button>/);
        ui.moreOpen = true; const m = ui.inspector(), Q = parts(m);
        const menu = m.slice(m.indexOf('<div id="sheet-more" class="more-menu"'), m.indexOf('</div></div>', m.indexOf('<div id="sheet-more"')) + 12);
        assert.ok(m.indexOf('id="sheet-more"') > m.indexOf('</header>') && m.indexOf('id="sheet-more"') < m.indexOf('<div class="body">'), 'menu sits under the header');
        assert.match(Q.header, /aria-expanded="true" aria-controls="sheet-more">More</);
        const got = [...menu.matchAll(/data-a="(\w+)" data-v="(\d+)">([^<]+)<small class="more-target">([^<]+)<\/small>/g)];
        assert.deepEqual(got.map((g) => [g[1], +g[2]]), want, `${mode} ${o.type} #${o.id}: the same removal set`);
        for (const g of got) { assert.match(g[3], /…$/, 'each opens a review (ellipsis)'); assert.ok(g[4].trim().length > 2, 'each names its exact target'); }
        assert.equal((m.match(REMOVE) || []).length, want.length, 'removals only inside More');
      }
    }
    ui.sel = { kind: 'cart', id: 1 }; ui.moreOpen = true; assert.match(ui.removalActions(), /data-a="removeCart" data-v="1">Dispose of cart…<small class="more-target">Cart #1</);
    const after = JSON.parse(JSON.stringify(s.s)), b0 = JSON.parse(before), diff = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(b0[k]));
    assert.deepEqual(diff, [], `${mode}: rendering and More never touch the simulation (changed: ${diff.join(',')})`);
  }
  assert.ok(objs > 400, `covered ${objs} objects`);
});

await test('Lights & cameras on the action rail for every eligible unit (vacant and occupied outside-only); status metric in the summary', async () => {
  let vac = 0, occ = 0, off = 0;
  for (const [mode, make] of MODES) {
    const s = make(); s.ensure(); const { ui } = uiFor(s);
    for (const u of s.objs('unit').filter((x) => x.cstate === 'operating')) {
      ui.sel = u.id;
      for (const tall of [false, true]) {
        ui.sheetTall = tall; const P = parts(ui.inspector()), el = upgradeEligible(s, u), canAdd = el && (unitOccupied(u) ? ['light', 'camera'] : ['unitLight', 'light', 'camera']).some((t) => !mountedOn(s, u.id).some((f) => f.type === t));
        if (canAdd) {
          assert.match(P.rail, new RegExp(`data-a="upgradeRetrofit" data-v="${u.id}">${unitOccupied(u) ? 'Outside lights &amp; cameras…' : 'Lights &amp; cameras…'}</button>`), `${mode} unit #${u.id} on the rail`);
          assert.doesNotMatch(P.body, /data-a="upgradeRetrofit"/, 'not repeated in details'); if (!tall) unitOccupied(u) ? occ++ : vac++;
        } else { assert.doesNotMatch(P.beforeBody + P.body, /data-a="upgradeRetrofit"/); if (!tall) off++; }
        if (s.s.tut?.on || s.s.lesson) assert.doesNotMatch(P.body, /Lights &amp; cameras<\/small>/, `${mode}: no equipment metric while the tutorial/lesson is on`);
        else assert.match(P.body, /<div><small>Lights &amp; cameras<\/small><b>(None|Installing|\d+ lights?( · \d+ cameras?)?|\d+ cameras?)<\/b><\/div>/, `${mode}: equipment metric`);
      }
    }
  }
  assert.ok(vac > 20 && occ > 20 && off > 0, `vacant ${vac}, occupied ${occ}, not offered ${off}`);
});

await test('occupied unit: outside retrofit reachable from the rail, opens the outside-only review; installed fixtures show in the metric', async () => {
  const s = makeSandbox({ start: 'starter', cash: 100000 }); s.ensure(); const { ui, els } = uiFor(s);
  const u = s.objs('unit').find((x) => x.cstate === 'operating' && unitOccupied(x) && upgradeEligible(s, x)); assert.ok(u);
  ui.sel = u.id; ui.sheetTall = false; const h = ui.inspector(); assert.match(parts(h).rail, /Outside lights &amp; cameras…/);
  ui.beginRetrofit(u.id); assert.ok(ui.retrofitReview); ui.changeUpgrade('lighting', 'both'); ui.changeUpgrade('outsideCameras', true);
  const R = ui.retrofitReview.quote; assert.ok(R.occupied); assert.ok(!R.creates.some((c) => c.type === 'unitLight'), 'never an interior light while occupied');
  const r = s.dispatch({ type: 'unitRetrofit', ...ui.retrofitReview.args, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, r.msg); ui.endRetrofit();
  ui.sel = u.id; assert.match(ui.inspector(), /<small>Lights &amp; cameras<\/small><b>Installing<\/b>/);
  const ord = s.s.orders.find((o) => o.id === r.order); for (let i = 0; i < 40000 && ord.st === 'construction'; i++) s.step(); s.ensure();
  assert.match(ui.inspector(), /<small>Lights &amp; cameras<\/small><b>\d+ lights?/);
});

await test('collections are on the rail; routine actions are never behind More', async () => {
  const s = makeSandbox({ start: 'starter', cash: 100000 }); s.ensure(); const { ui } = uiFor(s);
  const u = s.objs('unit').find((x) => x.lease && s.s.leases[x.lease]); const L = s.s.leases[u.lease];
  L.status = 'pastdue'; L.dueSince = s.day - 31; L.fees = 20; L.planTried = false;
  ui.sel = u.id; for (const tall of [false, true]) { ui.sheetTall = tall; ui.moreOpen = true; const h = ui.inspector(), P = parts(h);
    for (const op of ['notice', 'plan', 'waive']) assert.match(P.rail, new RegExp(`&quot;type&quot;:&quot;collect&quot;,&quot;op&quot;:&quot;${op}&quot;|"type":"collect","op":"${op}"`), `collect ${op} on the rail`);
    const menu = h.slice(h.indexOf('id="sheet-more"'), h.indexOf('class="dock-actions"')); assert.doesNotMatch(menu, /collect|ownerMakeReady|upgradeRetrofit/); }
});

await test('every removal route opens its paused review from More and Cancel leaves the game unchanged; More closes on select, tab, session and review', async () => {
  let routes = 0;
  for (const [mode, make] of [MODES[1], MODES[2], MODES.find((m) => m[0] === 'Scenario ratereset')]) {
    const s = make(); s.ensure(); s.s.speed = 4; const { ui, els } = uiFor(s); ui.notePause = () => {}; ui.closeModal = function () { els.modal.innerHTML = ''; this.removalReview = null; this.gateRemovalReview = null; };
    const before = JSON.stringify(s.s.objects);
    for (const o of selectable(s)) for (const [a, v] of expected(s, o)) {
      ui.sel = o.id; ui.moreOpen = true;
      const target = a === 'gateRemove' ? null : a === 'removeObject' ? { kind: 'object', id: v } : a === 'removeCart' ? { kind: 'cart', id: v } : a === 'removeKeypad' ? { kind: 'keypad', id: v } : { kind: 'floor', id: v, f: s.s.objects[v].floors - 1 };
      if (a === 'gateRemove') { ui.showGateRemoval(v); assert.match(els.modal.innerHTML, /Remove Gate #\d+[\s\S]*Keep gate[\s\S]*Confirm removal/); }
      else { ui.showRemoval(target); assert.match(els.modal.innerHTML, /role="alertdialog"[\s\S]*Paused · exact highlighted target[\s\S]*data-a="modalClose">Cancel[\s\S]*data-a="removeConfirm"/); }
      assert.equal(ui.moreOpen, false, 'opening a review closes More'); ui.closeModal(); routes++;
    }
    assert.equal(JSON.stringify(s.s.objects), before, `${mode}: reviews and Cancel never remove anything`);
    ui.moreOpen = true; ui.setTab = UI.prototype.setTab; ui.renderSheet = () => {}; ui.applySheetSize = () => {}; ui.pickTool = () => {}; ui.endRetrofit = () => {};
    ui.select(null); assert.equal(ui.moreOpen, false); ui.moreOpen = true; ui.setTab('operate'); assert.equal(ui.moreOpen, false);
  }
  assert.ok(routes > 60, `${routes} removal routes`);
  const src = readFileSync(new URL('../../js/ui.js', import.meta.url), 'utf8');
  assert.match(src, /resetSession\(view\) \{[\s\S]*?this\.moreOpen = false;/); assert.match(src, /case 'sheetMore': this\.moreOpen = !this\.moreOpen;/);
  assert.doesNotMatch(src, /html\.replace\('<div class="body">', this\.removalActions\(\)/, 'no removal row injected ahead of the panel');
});

await test('phone layout rules: 2-column rail, compact and Details caps, office one-line summaries, landscape untouched', async () => {
  const css = readFileSync(new URL('../../css/game.css', import.meta.url), 'utf8'), mp = css.slice(css.indexOf('/* MP-1 (mobile panels)'));
  assert.ok(mp.length > 100);
  assert.match(mp, /@media \(max-width:600px\) and \(orientation:portrait\) \{/);
  assert.match(mp, /#ui \.sheet \.dock-actions \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
  assert.match(mp, /#ui \.sheet:has\(\.dock-actions\) \{ max-height:min\(44dvh, 400px\); \}/);
  assert.match(mp, /#ui \.sheet\.tall, #ui \.sheet\.tall:has\(\.dock-actions\) \{ max-height:min\(60dvh,/);
  assert.match(mp, /#ui \.more-menu \.btn \{[^}]*min-height:48px/); assert.match(mp, /#ui \.panel-more \{[^}]*min-height:44px/);
  assert.doesNotMatch(mp, /orientation:landscape/);
});

console.log(`ALL PASS: ${n} mobile panel groups; native checks only, physical Safari NOT TESTED`);
