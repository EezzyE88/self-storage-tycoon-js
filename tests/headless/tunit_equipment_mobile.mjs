// UL-3 (display only): the equipment review and unit equipment list on phones. Choices first, quote, then the result
// (reason or rental hold) and one cash summary beside Cancel/Confirm; each mounted fixture has its own row with state and
// the same Remove… review. Simulation state stays byte-identical to the parent 008c40b in every mode.
// usage: node tests/headless/tunit_equipment_mobile.mjs <export of 008c40b>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeScenario, makeSandbox, SCENARIOS } from '../../js/scenarios.js';
import { makeMaple, makeEmptyLot } from '../../js/maple.js';
import { retrofitEligible, mountedOn } from '../../js/unitupgrades.js';
import { UI } from '../../js/ui.js';

const PARENT = process.argv[2];
assert.ok(PARENT, 'usage: node tests/headless/tunit_equipment_mobile.mjs <export of the parent commit>');
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
const P = { ...(await import(PARENT + '/js/scenarios.js')), ...(await import(PARENT + '/js/maple.js')) };
const LOCAL = { makeScenario, makeSandbox, makeMaple, makeEmptyLot };
const MODES = [
  ['Tutorial', (M) => M.makeMaple()],
  ['Career', (M) => { const s = M.makeMaple(); s.dispatch({ type: 'tutSkip' }); return s; }],
  ['Sandbox business', (M) => M.makeSandbox({ start: 'starter', cash: 100000 })],
  ['Free Build', (M) => M.makeSandbox({ kind: 'free', start: 'starter' })],
  ['Creative lot', (M) => M.makeEmptyLot({ creative: true })],
  ...Object.keys(SCENARIOS).map((id) => ['Scenario ' + id, (M) => M.makeScenario(id, 11)]),
];
const ROW = { tool: 'du5x10', a: { x: 10, y: 3 }, b: { x: 14, y: 3 }, rotation: 2, f: 0 };
const finish = (s, id) => { const ord = s.s.orders.find((o) => o.id === id); for (let i = 0; i < 40000 && ord.st === 'construction'; i++) s.step(); assert.equal(ord.st, 'done'); s.ensure(); };
const rowSandbox = () => { const s = makeSandbox({ start: 'starter', cash: 100000 }); s.s.open = false; s.ensure(); const R = s.plan({ ...ROW, lighting: 'none' }), r = s.dispatch({ type: 'build', ...ROW, lighting: 'none', upgradeStamp: R.upgradeStamp }); assert.ok(r.ok); finish(s, r.order); for (let i = 0; i < 120; i++) s.step(); s.ensure(); return s; };
const vacants = (s) => s.objs('unit').filter((u) => retrofitEligible(s, u));
function uiFor(s) { const ui = Object.create(UI.prototype), els = { abar: { innerHTML: '' } }; ui.g = { sim: s, rend: { setPreview(R) { this.preview = R; } } }; ui.$ = (id) => els[id]; ui.renderTut = () => {}; ui.reserveWait = null; ui.do = (a) => s.dispatch(a); return { ui, els }; }
const order = (html, parts) => { let at = -1; for (const p of parts) { const i = html.indexOf(p, at + 1); assert.ok(i > at, `${p} after previous part`); at = i; } };

await test('retrofit review: choices, quote, then result and cash beside Cancel/Confirm; hold only when fixtures install', async () => {
  const s = rowSandbox(), V = vacants(s), u = V[Math.floor(V.length / 2)], { ui, els } = uiFor(s);
  ui.beginRetrofit(u.id); ui.changeUpgrade('lighting', 'both'); ui.changeUpgrade('outsideCameras', true);
  const h = els.abar.innerHTML, R = ui.retrofitReview.quote; assert.ok(R.creates.length);
  order(h, ['class="actionbar unit-review retrofit-review"', `${s.objName(u)} · equipment`, '<div class="review-body">', 'data-a="upgradeMode"', 'data-a="upgradeCamera"', 'class="eq-quote"', '<div class="review-commitment">', 'cannot rent during installation', 'Cash after install:', 'Available after bills &amp; reserve', '<div class="bot">', 'data-a="upgradeCancel"', 'data-a="upgradeConfirm"']);
  assert.match(h, new RegExp(`Confirm · \\$${R.cost.toLocaleString('en-US')}<`)); assert.equal(s.s.speed, 0);
  const res = s.dispatch({ type: 'unitRetrofit', ...ui.retrofitReview.args, upgradeStamp: R.upgradeStamp }); assert.ok(res.ok); ui.endRetrofit(); finish(s, res.order);
  const v = vacants(s).filter((x) => x.id !== u.id).find((x) => s.plan({ tool: 'unitRetrofit', unit: x.id, excludedFixtures: [], lighting: 'none', outsideCameras: true }).upgrades.omit.camera === 'covered'); assert.ok(v);
  ui.beginRetrofit(v.id); ui.changeUpgrade('outsideCameras', true); const h2 = els.abar.innerHTML;
  order(h2, ['class="eq-quote"', '<div class="review-commitment">', 'class="status invalid eq-reason"', 'Already covered: nothing to install', 'data-a="upgradeConfirm" disabled']);
  assert.doesNotMatch(h2, /cannot rent during installation|Cash after install/); ui.endRetrofit();
});

await test('construction review: choices before quote, no footnote; financial figures kept with the same words in two columns', async () => {
  const s = makeSandbox({ start: 'starter', cash: 100000 }); s.s.open = false; s.ensure(); const { ui } = uiFor(s);
  const R = s.plan({ ...ROW, lighting: 'both', outsideCameras: true }), h = ui.upgradeHtml(R, { lighting: 'both', outsideCameras: true });
  order(h, ['<span class="eq-label">Lighting</span>', 'data-v="none"', 'data-v="interior"', 'data-v="outside"', 'data-v="both"', '<span class="eq-label">Cameras</span>', '✓ Cameras · added where needed', 'class="eq-quote"']);
  assert.doesNotMatch(h, /Outside fixtures are shared|Rent is unchanged/);
  const src = readFileSync(new URL('../../js/ui.js', import.meta.url), 'utf8');
  assert.match(src, /<span class="spend-more"><span class="fin-sub">Bills owed \$\{money\(P\.committed\)\} · reserve \$\{money\(P\.reserve\)\} · added costs \$\{money\(daily, true\)\}\/day when operating<\/span><span class="fin-k">Available after bills &amp; reserve<\/span><b class="fin-v/);
  const css = readFileSync(new URL('../../css/game.css', import.meta.url), 'utf8');
  assert.match(css, /\.review-commitment \.spending \{ display: grid; grid-template-columns: 1fr auto;/); assert.match(css, /\.review-commitment \.spend-more \{ display: contents; \}/);
  assert.match(css, /#ui \.actionbar\.unit-review:not\(\.placing\):not\(\.idle-strip\):has\(\.unit-options\[open\]\),\n #ui \.actionbar\.retrofit-review:not\(\.placing\):not\(\.idle-strip\) \{ max-height:min\(72dvh/);
});

await test('unit panel: fixtures listed with state; MP-1: Remove unit… and each fixture Remove… are in the More menu, not the list', async () => {
  const s = rowSandbox(), V = vacants(s), u = V[Math.floor(V.length / 2)];
  const Q = s.plan({ tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], lighting: 'both', outsideCameras: true }); const r = s.dispatch({ type: 'unitRetrofit', tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], lighting: 'both', outsideCameras: true, upgradeStamp: Q.upgradeStamp }); assert.ok(r.ok);
  const { ui } = uiFor(s); ui.sel = u.id;
  let sheet = ui.objSheet(u, s.objName(u)); assert.match(sheet, /<small>Installing · /, 'pending fixtures show Installing'); for (const f of mountedOn(s, u.id)) { assert.doesNotMatch(sheet, new RegExp(`data-a="removeObject" data-v="${f.id}"`)); assert.match(ui.removalActions(), new RegExp(`data-a="removeObject" data-v="${f.id}"`), 'pending fixtures keep their Remove… (More menu)'); }
  finish(s, r.order); sheet = ui.objSheet(u, s.objName(u));
  const top = ui.removalActions(); assert.match(top, /data-a="removeObject" data-v="\d+">Remove unit…/); assert.equal((top.match(/data-a="removeObject"/g) || []).length, 4, 'MP-1: unit plus its three fixtures');
  const fx = mountedOn(s, u.id); assert.equal(fx.length, 3);
  for (const f of fx) assert.match(sheet, new RegExp(`data-a="unitAttachment" data-v="${f.id}"><b>[^<]+</b><small>Installed · [^<]+</small></button></div>`));
  assert.ok(sheet.indexOf('<h3>Unit equipment</h3>') < sheet.indexOf('class="eq-list"'));
});

await test('with and without equipment, 10 days of every mode are byte-identical to the parent 008c40b', async () => {
  let bought = 0;
  for (const [name, mk] of MODES) {
    const a = mk(LOCAL), b = mk(P); a.s.speed = 1; b.s.speed = 1; days(a, 10); days(b, 10); assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), name + ' (no equipment)');
    if (name === 'Tutorial') continue;
    const run = (M) => { const s = mk(M); s.ensure(); s.s.speed = 1; let k = 0;
      for (let y = 1; y < s.s.H - 1 && !k; y++) for (let x = 1; x < s.s.W - 1 && !k; x++) { const sp = { tool: 'du5x10', a: { x, y }, b: { x: x + 1, y }, rotation: 2, f: 0, lighting: 'both', outsideCameras: true }; const R = s.plan(sp); if (R.status !== 'invalid' && (s.unlimited() || s.s.cash >= R.cost)) { if (s.dispatch({ type: 'build', ...sp, upgradeStamp: R.upgradeStamp }).ok) k = 1; } }
      days(s, 10); return { j: JSON.stringify(s.s), k }; };
    const x = run(LOCAL), y = run(P); assert.equal(x.j, y.j, name + ' (equipment)'); bought += x.k;
  }
  assert.ok(bought >= 10, 'purchases ' + bought);
});

console.log(`ALL PASS: ${n} unit equipment mobile groups; native checks only, physical Safari NOT TESTED`);
