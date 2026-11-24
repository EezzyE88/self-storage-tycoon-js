// UL-2 (display only): unit lighting & camera fixtures sit on the unit, light a soft pool, and the equipment quote separates
// what was asked, what will be installed, why a type is left out, and what it costs. Expansions of an open property are
// announced as new units, not a grand opening. Mechanics, prices, coverage, power, saves and Pause are unchanged from deb16a9.
// usage: node tests/headless/tunit_lighting_display.mjs <export of deb16a9, the parent without this change>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { makeScenario, makeSandbox, SCENARIOS } from '../../js/scenarios.js';
import { makeMaple, makeEmptyLot } from '../../js/maple.js';
import { UPGRADE, retrofitEligible, mountedOn } from '../../js/unitupgrades.js';
import { UI } from '../../js/ui.js';

registerHooks({ resolve(specifier, context, next) { return specifier === 'three' ? { url: new URL('../../vendor/three.module.min.js', import.meta.url).href, shortCircuit: true } : next(specifier, context); } });
const PARENT = process.argv[2];
assert.ok(PARENT, 'usage: node tests/headless/tunit_lighting_display.mjs <export of the parent commit>');
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
const P = { ...(await import(PARENT + '/js/scenarios.js')), ...(await import(PARENT + '/js/maple.js')) };
const PU = await import(PARENT + '/js/unitupgrades.js');
const LOCAL = { makeScenario, makeSandbox, makeMaple, makeEmptyLot };
const career = (M) => { const s = M.makeMaple(); s.dispatch({ type: 'tutSkip' }); return s; };
const MODES = [
  ['Career', (M) => career(M)],
  ['Sandbox business', (M) => M.makeSandbox({ start: 'starter', cash: 100000 })],
  ['Free Build', (M) => M.makeSandbox({ kind: 'free', start: 'starter' })],
  ['Creative lot', (M) => M.makeEmptyLot({ creative: true })],
  ...Object.keys(SCENARIOS).map((id) => ['Scenario ' + id, (M) => M.makeScenario(id, 11)]),
];
const COMBOS = [];
for (const lighting of ['none', 'interior', 'outside', 'both']) for (const outsideCameras of [false, true]) COMBOS.push({ lighting, outsideCameras });
function freeSpot(s) {
  for (let y = 1; y < s.s.H - 1; y++) for (let x = 1; x < s.s.W - 1; x++) for (const rotation of [0, 2]) {
    const a = { tool: 'du5x10', a: { x, y }, b: { x: x + 4, y }, rotation, f: 0 };
    if (s.plan({ ...a, lighting: 'none' }).status !== 'invalid') return a;
  }
  return null;
}
// The quote minus the UL-2 display fields must equal the parent's quote exactly.
const strip = (R) => { const c = JSON.parse(JSON.stringify(R)); if (c.upgrades) { delete c.upgrades.omit; delete c.upgrades.asked; } if (c.tool === 'unitRetrofit' && !c.creates.length) c.reasons = c.reasons.slice(0, -1); return JSON.stringify(c); };
const finish = (s, id) => { const ord = s.s.orders.find((o) => o.id === id); for (let i = 0; i < 40000 && ord.st === 'construction'; i++) s.step(); assert.equal(ord.st, 'done'); s.ensure(); };
const sandbox = (M = LOCAL) => { const s = M.makeSandbox({ start: 'starter', cash: 100000 }); s.s.open = false; s.ensure(); return s; };
const ROW = { tool: 'du5x10', a: { x: 10, y: 3 }, b: { x: 14, y: 3 }, rotation: 2, f: 0 }; // dark sandbox row used by tunit_upgrades
// Sandbox with the dark ROW built (no equipment) so neighbouring vacant units exist for coverage cases.
const rowSandbox = () => { const s = sandbox(), R = s.plan({ ...ROW, lighting: 'none' }), r = s.dispatch({ type: 'build', ...ROW, lighting: 'none', upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, r.msg); finish(s, r.order); for (let i = 0; i < 120; i++) s.step(); s.ensure(); return s; };
const vacants = (s) => s.objs('unit').filter((u) => retrofitEligible(s, u));
const retro = (s, u, a) => s.plan({ tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], lighting: 'none', outsideCameras: false, ...a });

await test('every mode: quotes, costs, creates and review stamps equal deb16a9 for every lighting/camera choice (display fields aside)', async () => {
  let compared = 0;
  for (const [name, mk] of MODES) {
    const a = mk(LOCAL), b = mk(P); a.ensure(); b.ensure();
    const spot = freeSpot(a);
    if (spot) for (const c of COMBOS) { assert.equal(strip(a.plan({ ...spot, ...c })), strip(b.plan({ ...spot, ...c })), name + ' build ' + JSON.stringify(c)); compared++; }
    for (const u of vacants(a).slice(0, 2)) for (const c of COMBOS) {
      const args = { tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], ...c };
      assert.equal(strip(a.plan(args)), strip(b.plan(args)), name + ' retrofit ' + JSON.stringify(c)); compared++;
    }
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), name + ': planning leaves state untouched');
  }
  assert.ok(compared > 200, 'compared ' + compared);
});

await test('omission reasons: turned off, already installed, already covered, install pending and no wall to mount on', async () => {
  // Turned off: deselecting every suggested wall light.
  { const s = sandbox(), spot = ROW, R = s.plan({ ...spot, lighting: 'outside' });
    const keys = R.upgrades.options.filter((o) => o.fixture.type === 'light').map((o) => o.key); assert.ok(keys.length);
    const off = s.plan({ ...spot, lighting: 'outside', excludedFixtures: keys }); assert.equal(off.upgrades.counts.light, 0); assert.equal(off.upgrades.omit.light, 'off'); }
  // Install pending, then already installed / already covered, on real retrofits.
  { const s = rowSandbox(), V = vacants(s), u = V[Math.floor(V.length / 2)], args = { lighting: 'both', outsideCameras: true }, R = retro(s, u, args);
    assert.ok(R.creates.length, R.reasons.join(';')); const r = s.dispatch({ type: 'unitRetrofit', tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], ...args, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, r.msg);
    const pend = vacants(s).filter((v) => v.id !== u.id).map((v) => retro(s, v, { outsideCameras: true })).find((q) => q.upgrades?.omit?.camera === 'pending');
    assert.ok(pend, 'a neighbour whose door is covered by the pending camera'); assert.equal(pend.status, 'invalid'); assert.equal(pend.reasons.at(-1), 'Nothing can be installed here');
    finish(s, r.order);
    const own = retro(s, u, args);
    assert.ok(retrofitEligible(s, u)); { assert.equal(own.upgrades.omit.unitLight, 'installed'); assert.equal(own.upgrades.omit.light, 'installed'); assert.equal(own.upgrades.omit.camera, 'installed'); assert.equal(own.reasons.at(-1), 'Already covered: nothing to install'); }
    const cov = vacants(s).filter((v) => v.id !== u.id).map((v) => retro(s, v, { outsideCameras: true })).find((q) => q.upgrades?.omit?.camera === 'covered');
    assert.ok(cov, 'a neighbour already covered by the installed camera'); assert.equal(cov.upgrades.counts.camera, 0); assert.equal(cov.reasons.at(-1), 'Already covered: nothing to install'); }
  // No wall to mount on: Harborview 3-unit 10x20 rows whose doors face the parcel edge or a blocked cell quote 3/0/0.
  { const s = makeScenario('ratereset', 11); s.ensure(); s.s.cash = 1e5; let found = null;
    for (let y = 1; y < s.s.H - 1 && !found; y++) for (let x = 1; x < s.s.W - 1 && !found; x++) for (const rotation of [0, 1, 2, 3]) {
      const a = { tool: 'du10x20', a: { x, y }, b: rotation % 2 ? { x, y: y + 5 } : { x: x + 5, y }, rotation, f: 0 };
      if (s.plan({ ...a, lighting: 'none' }).status === 'invalid') continue;
      const R = s.plan({ ...a, lighting: 'both', outsideCameras: true }); if (R.upgrades.counts.light === 0 && R.upgrades.counts.camera === 0 && R.upgrades.counts.unitLight === 3) { found = R; break; }
    }
    assert.ok(found, 'a 3/0/0 placement exists'); assert.equal(found.upgrades.omit.light, 'nomount'); assert.equal(found.upgrades.omit.camera, 'nomount'); }
  // Nothing asked.
  { const s = sandbox(), R = retro(s, vacants(s)[0], {}); assert.equal(R.reasons.at(-1), 'Choose lights or cameras to install'); }
});

function uiFor(s) {
  const ui = Object.create(UI.prototype), els = { abar: { innerHTML: '' } };
  ui.g = { sim: s, rend: { setPreview(R) { this.preview = R; } } }; ui.$ = (id) => els[id]; ui.renderTut = () => {}; ui.reserveWait = null; ui.do = (a) => s.dispatch(a);
  return { ui, els };
}
await test('panel: one quote row per requested type with cost or a short reason, a total, unit-named chips and no hold sentence when nothing installs', async () => {
  const s = sandbox(), spot = ROW, { ui } = uiFor(s);
  const R = s.plan({ ...spot, lighting: 'both', outsideCameras: true }); R.args = { ...spot, lighting: 'both', outsideCameras: true }; const html = ui.upgradeHtml(R, R.args);
  assert.match(html, /class="eq-quote"/);
  for (const [t, label] of [['unitLight', 'Interior light'], ['light', 'Wall light'], ['camera', 'Outside camera']]) {
    const c = R.upgrades.counts[t]; const row = html.match(new RegExp(`<tr class="[^"]*"><th>${label}</th><td>([^<]*)</td><td>([^<]*)</td></tr>`)); assert.ok(row, label);
    if (c) { assert.equal(row[1], '× ' + c); assert.equal(row[2].replace(/[$,]/g, ''), String(c * UPGRADE[t].build)); } else assert.match(row[2], /Already|pending|No wall|Turned off/);
  }
  assert.match(html, new RegExp(`<tr class="tot"><th>Equipment</th><td></td><td>\\$${R.upgrades.cost.toLocaleString('en-US')}</td>`));
  assert.doesNotMatch(html, /\(\d+, \d+\)/, 'no grid coordinates in chips'); assert.match(html, /· unit \d|· new unit/);
  assert.doesNotMatch(html, /Include outside cameras|interior lights · /);
  const c = R.upgrades.counts, cost = '$' + R.upgrades.cost.toLocaleString('en-US');
  assert.equal(ui.upgradeSummary(R), 'Both + cameras · ' + c.unitLight + ' interior · ' + c.light + ' wall · ' + c.camera + (c.camera === 1 ? ' camera · ' : ' cameras · ') + cost);
  { const Z = s.plan({ ...spot, lighting: 'none' }); Z.args = { ...spot, lighting: 'none' }; assert.equal(ui.upgradeSummary(Z), 'Lighting &amp; cameras · none'); }
  const none = s.plan({ ...spot, lighting: 'interior' }); const h2 = ui.upgradeHtml(none, { lighting: 'interior' }); assert.doesNotMatch(h2, /<th>Wall light|<th>Outside camera/, 'types not asked are not listed');
  // Retrofit where nothing would install: the reason replaces the generic line and the rental-hold sentence is hidden.
  const t = rowSandbox(), V = vacants(t), u = V[Math.floor(V.length / 2)], a = { lighting: 'both', outsideCameras: true }, Q = retro(t, u, a);
  const r = t.dispatch({ type: 'unitRetrofit', tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], ...a, upgradeStamp: Q.upgradeStamp }); assert.ok(r.ok); finish(t, r.order);
  const v = vacants(t).filter((x) => x.id !== u.id).find((x) => retro(t, x, { outsideCameras: true }).upgrades.omit.camera === 'covered'); assert.ok(v);
  const W = uiFor(t); W.ui.beginRetrofit(v.id); W.ui.changeUpgrade('outsideCameras', true);
  assert.match(W.els.abar.innerHTML, /Already covered: nothing to install/); assert.doesNotMatch(W.els.abar.innerHTML, /cannot rent during installation|No additional fixtures selected/);
  assert.match(W.els.abar.innerHTML, /<th>Outside camera<\/th><td>0<\/td><td>Already covered<\/td>/); W.ui.endRetrofit();
  // Unit sheet lists the equipment the unit actually has.
  const sheet = W.ui.objSheet(u, 'Unit'); assert.match(sheet, /<span>Equipment<\/span><span class="eq-row">Interior light · Wall light · Camera<\/span>/);
  const bare = W.ui.objSheet(v, 'Unit'); assert.match(bare, /<span>Equipment<\/span><span class="eq-row">None<\/span>/);
});

await test('rendered fixtures: heads at or below the wall top on drive-up and interior units, soft radial pools, coverage cells only in previews', async () => {
  const THREE = await import('three'), { Renderer } = await import('../../js/render.js');
  const s = rowSandbox();
  const r = Object.create(Renderer.prototype);
  Object.assign(r, { sim: s, previewG: new THREE.Group(), staticG: new THREE.Group(), geo: { box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1), cone: new THREE.ConeGeometry(.5, 1, 8) }, mat: { lamp: new THREE.MeshStandardMaterial(), office: new THREE.MeshStandardMaterial() }, ringGeo: {}, tx: { plaques: {}, glow: new THREE.Texture() }, anim: [], view: 0, sel: null });
  const top = (m) => { m.geometry.computeBoundingBox(); return m.position.y + m.scale.y * m.geometry.boundingBox.max.y; };
  let checked = 0;
  for (const u of vacants(s).slice(0, 3)) {
    const a = { lighting: 'both', outsideCameras: true }, Q = retro(s, u, a); if (!Q.creates.length) continue;
    const res = s.dispatch({ type: 'unitRetrofit', tool: 'unitRetrofit', unit: u.id, excludedFixtures: [], ...a, upgradeStamp: Q.upgradeStamp }); assert.ok(res.ok); finish(s, res.order);
    const wall = u.access === 'drive' ? 1.25 : 1.05;
    for (const o of mountedOn(s, u.id)) { r.anim.length = 0; r.buildObj(o); const A = r.anim[0]; assert.ok(top(A.mesh) <= wall + 1e-6, `${o.type} top ${top(A.mesh)} > wall ${wall}`); checked++;
      if (A.glow) { assert.equal(A.glow.material.map, r.tx.glow, o.type + ' soft glow'); assert.equal(A.glow.geometry, r.geo.plane); } }
  }
  // Interior unit (1.05 tall) in a dark hallway: the mounted hallway light and camera also stay on the unit.
  { const t = sandbox(); for (const o of t.objs('light')) delete t.s.objects[o.id]; t.markDirty(); t.ensure();
    const inside = { tool: 'iu5x5', a: { x: 16, y: 7 }, b: { x: 16, y: 7 }, rotation: 1, f: 0, lighting: 'both', outsideCameras: true }, R = t.plan(inside);
    const res = t.dispatch({ type: 'build', ...inside, upgradeStamp: R.upgradeStamp }); assert.ok(res.ok, res.msg); finish(t, res.order);
    const iu = t.s.objects[t.s.orders.find((o) => o.id === res.order).objs[0]]; assert.equal(iu.access, 'interior'); r.sim = t; let k = 0;
    for (const o of mountedOn(t, iu.id)) { r.anim.length = 0; r.buildObj(o); const A = r.anim[0]; assert.ok(top(A.mesh) <= 1.05 + 1e-6, `interior ${o.type} top ${top(A.mesh)}`); k++; checked++; }
    assert.ok(k >= 2, 'interior fixtures ' + k); r.sim = s; }
  assert.ok(checked >= 5, 'checked ' + checked);
  const pv = s.plan({ ...freeSpot(s), lighting: 'outside', outsideCameras: true }); r.setPreview(pv);
  assert.ok(r.previewG.children.length > 0, 'previews still show coverage');
});

await test('with no equipment, 10 days of every mode (and the tutorial) are byte-identical to deb16a9', async () => {
  for (const [name, mk] of [['Tutorial', (M) => M.makeMaple()], ...MODES]) {
    const a = mk(LOCAL), b = mk(P); a.s.speed = 1; b.s.speed = 1; days(a, 10); days(b, 10);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), name);
  }
});

await test('with equipment bought, 10 days of every mode are byte-identical to deb16a9', async () => {
  let bought = 0;
  for (const [name, mk] of MODES) {
    const run = (M, U) => { const s = mk(M); s.ensure(); s.s.speed = 1; const spot = freeSpot(s);
      if (spot) { const R = s.plan({ ...spot, lighting: 'both', outsideCameras: true }); if (R.status !== 'invalid' && (s.unlimited() || s.s.cash >= R.cost)) { const r = s.dispatch({ type: 'build', ...spot, lighting: 'both', outsideCameras: true, upgradeStamp: R.upgradeStamp }); if (r.ok && U === PU) bought++; } }
      const v = s.objs('unit').find((x) => U.retrofitEligible(s, x));
      if (v) { const args = { tool: 'unitRetrofit', unit: v.id, excludedFixtures: [], lighting: 'both', outsideCameras: true }, R = s.plan(args); if (R.creates.length && (s.unlimited() || s.s.cash >= R.cost)) { const r = s.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R.upgradeStamp }); if (r.ok && U === PU) bought++; } }
      days(s, 10); return JSON.stringify(s.s); };
    assert.equal(run(LOCAL, { retrofitEligible }), run(P, PU), name);
  }
  assert.ok(bought >= 10, 'purchases ' + bought);
});

console.log(`ALL PASS: ${n} unit lighting display groups; native checks only, physical Safari NOT TESTED`);
