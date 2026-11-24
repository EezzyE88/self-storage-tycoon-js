// SI-1 Door-based security (owner rule, Nov 24 2026: a unit's vulnerability is its door, not its walls).
// Thefts, the Security map and the unit panel share one door rule (sim.doorCover). Occupied units may get outside
// wall lights and cameras with no rental hold; interior lights are not offered while occupied. Gate and keypad unchanged.
// usage: node tests/headless/tsecurity_integrity.mjs <export of fd648bf, the parent without this change>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, makeSandbox, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple, makeEmptyLot } from '../../js/maple.js';
import { mountedOn, retrofitEligible, exteriorRetrofitEligible, unitOccupied, attachmentCoverage } from '../../js/unitupgrades.js';
import { UI } from '../../js/ui.js';

const PARENT = process.argv[2];
assert.ok(PARENT, 'usage: node tests/headless/tsecurity_integrity.mjs <export of the parent commit>');
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
const clean = (v) => typeof v === 'string' ? v.replace(/[<>"`]/g, '').replace(/'/g, '’').slice(0, 2000) : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v;
const same = (a, b) => JSON.stringify(clean(JSON.parse(JSON.stringify(a)))) === JSON.stringify(clean(JSON.parse(JSON.stringify(b))));
function harness() {
  const main = readFileSync('./js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  return (sim) => { const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g; };
}
const here = harness();
const reload = async (sim) => { const g = here(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.reason); return p.company.props[p.company.active].sim; };
const origin = (sim, u) => { const i = sim.idx(u.x, u.y); return !(sim.D.lit[u.f || 0][i] >= 0.5) && !sim.D.cam[u.f || 0][i]; };
const kitStep = (sim) => { const s = sim.s, k = s.scenario?.kit; if (k?.pending) sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i: k.pending.def });
  for (const c of [...s.convos]) { const x = sim.dispatch({ type: 'convo', id: c.id, i: c.auto ?? 0 }); if (!x || !x.ok) s.convos = s.convos.filter((y) => y !== c); } sim.step(); sim.events.length = 0; };
// The review reproduction: Harborview seed 13, a new row of four drive-up 10x10s with Both + cameras. Only cash is synthetic.
const ROW = { tool: 'du10x10', a: { x: 9, y: 19 }, b: { x: 16, y: 19 }, rotation: 0, f: 0, lighting: 'both', outsideCameras: true };
function equippedRow(M = LOCAL) {
  const sim = M.makeScenario('ratereset', 13); sim.ensure(); sim.s.cash += 60000;
  const R = sim.plan(ROW); assert.equal(R.status, 'valid'); const r = sim.dispatch({ type: 'build', ...ROW, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, r.msg);
  const ord = sim.s.orders.find((o) => o.id === r.order); for (let i = 0; i < 20000 && ord.st === 'construction'; i++) { sim.step(); sim.events.length = 0; } sim.ensure();
  const row = ord.objs.map((id) => sim.s.objects[id]).filter((o) => o.type === 'unit'); return { sim, row };
}
function uiFor(s) { const ui = Object.create(UI.prototype), els = { abar: { innerHTML: '' } }; ui.g = { sim: s, rend: { setPreview(R) { this.preview = R; } } }; ui.$ = (id) => els[id]; ui.renderTut = () => {}; ui.reserveWait = null; ui.do = (a) => s.dispatch(a); return { ui, els }; }
// a leased Harborview unit whose door can take a wall light and a camera
function occupiedPick(seed = 12) {
  const sim = makeScenario('ratereset', seed); sim.ensure(); sim.s.speed = 0;
  for (const u of sim.objs('unit').filter((x) => x.lease)) { const R = sim.plan({ tool: 'unitRetrofit', unit: u.id, lighting: 'outside', outsideCameras: true, excludedFixtures: [] }); if (R.status === 'valid' && R.upgrades.counts.light && R.upgrades.counts.camera) return { sim, u }; }
  throw new Error('no occupied unit takes both fixtures');
}

await test('door rule: door cells are the open ground (drive-up) or hallway (interior) in front of the door; full only when every cell is lit or watched', () => {
  const { sim, row } = equippedRow();
  for (const u of row) { const dc = sim.doorCover(u); assert.equal(dc.total, 2); assert.deepEqual(dc.cells, sim.unitFront(u)); assert.equal(dc.state, 'full', `${u.num} door front is lit/watched`); assert.equal(sim.doorExposed(u), false); }
  // the reviewed defect: the old corner rule called the units carrying their own wall light or camera dark
  assert.deepEqual(row.filter((u) => origin(sim, u)).map((u) => mountedOn(sim, u.id).map((o) => o.type).sort().join('+')), ['light+unitLight', 'camera+unitLight']);
  for (const o of [...sim.objs('light'), ...sim.objs('camera')].filter((x) => x.mount)) assert.ok(!attachmentCoverage(sim, o).some((c) => sim.D.unitAt[c.f][c.i]), 'mounted coverage geometry unchanged (never on a unit)');
  // partial and exposed: darken one / both door cells of a unit
  const u = row[0], [c0, c1] = sim.doorCells(u), f = 0;
  const lit = sim.D.lit[f], cam = sim.D.cam[f], save = [c0, c1].map((c) => [lit[sim.idx(c.x, c.y)], cam[sim.idx(c.x, c.y)]]);
  lit[sim.idx(c0.x, c0.y)] = 0; cam[sim.idx(c0.x, c0.y)] = 0; assert.equal(sim.doorCover(u).state, 'partial'); assert.equal(sim.doorExposed(u), true, 'a partly covered door is still a target');
  lit[sim.idx(c1.x, c1.y)] = 0.49; cam[sim.idx(c1.x, c1.y)] = 0; assert.equal(sim.doorCover(u).state, 'exposed');
  lit[sim.idx(c1.x, c1.y)] = 0.5; assert.equal(sim.doorCover(u).state, 'partial', 'lit means >= 0.5, as before');
  [c0, c1].forEach((c, k) => { lit[sim.idx(c.x, c.y)] = save[k][0]; cam[sim.idx(c.x, c.y)] = save[k][1]; }); assert.equal(sim.doorCover(u).state, 'full');
  // interior units: hallway cells only
  const m = makeMaple(); m.dispatch({ type: 'tutSkip' }); m.ensure(); const iu = m.objs('unit').filter((x) => x.access === 'interior' && x.cstate === 'operating');
  assert.ok(iu.length > 0); for (const x of iu) { const dc = m.doorCover(x); assert.ok(dc.total > 0); assert.ok(dc.cells.every((c) => m.s.hall[x.f || 0][m.idx(c.x, c.y)] === 1)); }
});

await test('thefts: the equipped row is never hit; every Harborview theft lands on a unit whose door was not fully covered; wave count and days match the parent', () => {
  const { sim, row } = equippedRow(); const s = sim.s, k = s.scenario.kit;
  for (const u of row) { u.commercial = 'ready'; sim.signLease(u, null); }
  const hits = []; const orig = sim.breakIn.bind(sim); sim.breakIn = (u, day, story) => { hits.push({ num: u.num, exposed: sim.doorExposed(u), day }); return orig(u, day, story); };
  while (s.scenario.status === 'active' && sim.day <= 70) kitStep(sim);
  assert.ok(hits.length >= 1); assert.ok(hits.every((h) => h.exposed), JSON.stringify(hits));
  assert.equal(hits.filter((h) => row.some((u) => u.num === h.num)).length, 0, 'equipped row not robbed');
  assert.ok(k.log.some((l) => /Theft at Unit .*door dark or not fully covered/.test(l.text)));
  // same attempts, same days, same RNG order: only the eligible pool changed
  for (const seed of [11, 12, 13, 14]) {
    const run = (M) => { const a = M.makeScenario('ratereset', seed), kk = a.s.scenario.kit; while (a.s.scenario.status === 'active' && a.day <= 70) kitStep(a); return { thefts: kk.thefts, days: kk.log.filter((l) => /Theft at Unit|found nothing dark|night patrol turned/.test(l.text)).map((l) => l.day) }; };
    const x = run(LOCAL), y = run(P); assert.deepEqual(x, y, 'seed ' + seed);
  }
});

await test('occupied unit: outside wall light and camera install without a hold; lease, tenant, account, rent, occupancy and visits unchanged; no interior light', async () => {
  const { sim, u } = occupiedPick(); const s = sim.s, L = s.leases[u.lease], tn = s.tenants[L.tenant];
  assert.equal(retrofitEligible(sim, u), false); assert.equal(exteriorRetrofitEligible(sim, u), true); assert.equal(unitOccupied(u), true);
  const snap = () => JSON.stringify({ L: s.leases[u.lease], tn: s.tenants[L.tenant], a: s.customerAccounts[tn.accountId], c: u.commercial, lease: u.lease });
  const before = snap();
  const inside = sim.plan({ tool: 'unitRetrofit', unit: u.id, lighting: 'interior', outsideCameras: false, excludedFixtures: [] });
  assert.equal(inside.status, 'invalid'); assert.equal(inside.upgrades.omit.unitLight, 'occupied'); assert.match(inside.reasons[0], /Interior light needs the unit empty/);
  const args = { tool: 'unitRetrofit', unit: u.id, lighting: 'both', outsideCameras: true, excludedFixtures: [] }, R = sim.plan(args);
  assert.equal(R.occupied, true); assert.equal(R.upgrades.counts.unitLight, 0); assert.equal(R.upgrades.omit.unitLight, 'occupied'); assert.equal(R.cost, 150 + 500, 'retrofit prices unchanged');
  const cash = s.cash, r = sim.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, r.msg); assert.equal(s.cash, cash - R.cost); assert.equal(s.speed, 0, 'Pause kept');
  const ord = s.orders.find((o) => o.id === r.order); assert.equal(ord.tenantSafe, true); assert.equal(u.retrofitOrder, ord.id);
  assert.equal(exteriorRetrofitEligible(sim, u), false, 'one installation at a time');
  // twin without the install, to compare the tenant's own records over the same minutes
  const twin = occupiedPick().sim, tu = twin.s.objects[u.id];
  const lost = [], cant = []; const th = sim.thought.bind(sim); sim.thought = (ag, text, ...x) => { if (ag.unit === u.id && /can't reach my unit/.test(text)) cant.push(text); return th(ag, text, ...x); };
  s.speed = 1; twin.s.speed = 1;
  for (let i = 0; i < 2 * 1440; i++) { kitStep(sim); kitStep(twin); if (!sim.events) continue; }
  sim.ensure(); assert.equal(u.blocked, false); assert.ok(!(u.missing || []).some((m) => /installation in progress/.test(m)));
  // access_lost is never emitted for this unit: re-check with events kept
  { const { sim: a, u: au } = occupiedPick(); const R2 = a.plan(args); assert.ok(a.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R2.upgradeStamp }).ok); a.markDirty(); a.ensure(); a.s.speed = 1;
    for (let i = 0; i < 300; i++) { a.step(); for (const e of a.events) if (e.type === 'access_lost') lost.push(e); a.events.length = 0; } assert.equal(au.blocked, false); }
  assert.deepEqual(lost, []); assert.deepEqual(cant, []);
  assert.equal(ord.st, 'done'); assert.deepEqual(mountedOn(sim, u.id).map((o) => [o.type, o.cstate]).sort(), [['camera', 'operating'], ['light', 'operating']]);
  assert.equal(JSON.stringify({ L: s.leases[u.lease], tn: s.tenants[L.tenant], a: s.customerAccounts[tn.accountId], c: u.commercial, lease: u.lease }),
    JSON.stringify({ L: twin.s.leases[tu.lease], tn: twin.s.tenants[L.tenant], a: twin.s.customerAccounts[tn.accountId], c: tu.commercial, lease: tu.lease }), 'tenant records equal the twin without the install');
  assert.notEqual(before, '');
  assert.equal(sim.doorCover(u).state, 'full');
  // UI: occupied wording, interior refused with a reason, Pause kept
  const { sim: b, u: bu } = occupiedPick(), { ui, els } = uiFor(b); b.s.speed = 0;
  const sheet = ui.objSheet(bu, b.objName(bu)); assert.match(sheet, /Add outside lights or cameras/); assert.match(sheet, /Occupied: outside equipment only/); assert.match(sheet, /<span>Door<\/span><span class="door-/);
  ui.beginRetrofit(bu.id); ui.changeUpgrade('lighting', 'interior'); assert.match(els.abar.innerHTML, /Occupied unit · outside only/); assert.match(els.abar.innerHTML, /Needs the unit empty/); assert.match(els.abar.innerHTML, /Interior light needs the unit empty/);
  ui.changeUpgrade('lighting', 'outside'); ui.changeUpgrade('outsideCameras', true); assert.match(els.abar.innerHTML, /The tenant keeps normal access during installation/); assert.doesNotMatch(els.abar.innerHTML, /cannot rent during installation/);
  assert.equal(b.s.speed, 0); ui.endRetrofit();
});

await test('vacant retrofit unchanged: interior light offered, rental hold while installing; tenant-safe cancel refunds as before and leaves the lease alone', () => {
  const sim = makeSandbox({ start: 'starter', cash: 100000 }); sim.s.open = false; sim.ensure();
  const ROWS = { tool: 'du5x10', a: { x: 10, y: 3 }, b: { x: 14, y: 3 }, rotation: 2, f: 0, lighting: 'none' }, R0 = sim.plan(ROWS), r0 = sim.dispatch({ type: 'build', ...ROWS, upgradeStamp: R0.upgradeStamp }); assert.ok(r0.ok);
  const o0 = sim.s.orders.find((o) => o.id === r0.order); for (let i = 0; i < 40000 && o0.st === 'construction'; i++) sim.step(); for (let i = 0; i < 120; i++) sim.step(); sim.ensure();
  const v = sim.objs('unit').find((u) => retrofitEligible(sim, u)); assert.ok(v);
  const args = { tool: 'unitRetrofit', unit: v.id, lighting: 'both', outsideCameras: true, excludedFixtures: [] }, R = sim.plan(args);
  assert.ok(!R.occupied); assert.equal(R.upgrades.counts.unitLight, 1); const r = sim.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok);
  const ord = sim.s.orders.find((o) => o.id === r.order); assert.ok(!ord.tenantSafe); sim.markDirty(); sim.ensure(); assert.equal(v.blocked, true); assert.ok(v.missing.includes('Unit lighting/security installation in progress'));
  // cancel a tenant-safe order: full undo within 30 minutes, partial refund after; lease untouched
  const { sim: a, u } = occupiedPick(); const lease = JSON.stringify(a.s.leases[u.lease]);
  const A = { tool: 'unitRetrofit', unit: u.id, lighting: 'outside', outsideCameras: true, excludedFixtures: [] }, Q = a.plan(A), cash = a.s.cash;
  const q = a.dispatch({ type: 'unitRetrofit', ...A, upgradeStamp: Q.upgradeStamp }); assert.ok(q.ok); const c = a.dispatch({ type: 'cancelOrder', id: q.order }); assert.equal(c.refund, Q.cost); assert.equal(a.s.cash, cash);
  assert.equal(u.retrofitOrder, undefined); assert.deepEqual(mountedOn(a, u.id), []); assert.equal(JSON.stringify(a.s.leases[u.lease]), lease);
  const q2 = a.dispatch({ type: 'unitRetrofit', ...A, upgradeStamp: a.plan(A).upgradeStamp }); const o2 = a.s.orders.find((o) => o.id === q2.order); a.s.t += 31; o2.prog = 0.25;
  assert.equal(a.dispatch({ type: 'cancelOrder', id: o2.id }).refund, Math.round(o2.cost * 0.75 * 0.6)); assert.equal(JSON.stringify(a.s.leases[u.lease]), lease);
});

await test('save/reload mid-install on an occupied unit restores the tenant-safe order; finishing after reload equals finishing without', async () => {
  const mk = () => { const { sim, u } = occupiedPick(); const A = { tool: 'unitRetrofit', unit: u.id, lighting: 'both', outsideCameras: true, excludedFixtures: [] }; assert.ok(sim.dispatch({ type: 'unitRetrofit', ...A, upgradeStamp: sim.plan(A).upgradeStamp }).ok); sim.s.speed = 1; for (let i = 0; i < 40; i++) kitStep(sim); return { sim, u }; };
  const a = mk(), b = mk(); const r = await reload(a.sim); const ru = r.s.objects[a.u.id];
  const ord = r.s.orders.find((o) => o.id === ru.retrofitOrder); assert.ok(ord && ord.tenantSafe && ord.prog > 0); r.ensure(); assert.equal(ru.blocked, false);
  assert.equal(r.s.speed, 0, 'a loaded game starts paused');
  r.s.speed = 1; for (let i = 0; i < 400; i++) { kitStep(r); kitStep(b.sim); }
  assert.ok(same(r.s, b.sim.s), 'reloaded run equals the uninterrupted run');
  const r2 = await reload(r); assert.equal(r2.s.speed, 0); r2.s.speed = r.s.speed; assert.ok(same(r2.s, r.s), 'finished state reloads identically (a load starts paused)');
});

await test('gate and keypad unchanged: same unitSecurity as the parent; the gate never changes which doors are targets', () => {
  for (const mk of [(M) => { const s = M.makeMaple(); s.dispatch({ type: 'tutSkip' }); return s; }, (M) => M.makeScenario('ratereset', 12), (M) => M.makeSandbox({ start: 'starter', cash: 100000 })]) {
    const a = mk(LOCAL), b = mk(P); a.ensure(); b.ensure(); a.s.t = b.s.t = 23 * 60; a.markDirty(); b.markDirty(); a.ensure(); b.ensure();
    assert.deepEqual(a.objs('unit').map((u) => a.unitSecurity(u)), b.objs('unit').map((u) => b.unitSecurity(u)));
    const g = a.D.gate, exp = a.objs('unit').map((u) => a.doorExposed(u)), sec = a.objs('unit').map((u) => a.unitSecurity(u));
    if (g) { a.D.gate = null; assert.deepEqual(a.objs('unit').map((u) => a.doorExposed(u)), exp); a.objs('unit').forEach((u, k) => assert.ok(Math.abs(sec[k] - a.unitSecurity(u) - 0.15) < 1e-9 || sec[k] === 1)); a.D.gate = g; }
  }
  const ui = readFileSync('./js/ui.js', 'utf8');
  assert.match(ui, /A built gate and building-door keypads raise the security score tenants give the property, which makes ordinary break-ins a little rarer\. They never choose which unit is hit and do not protect a dark door\./);
  assert.match(ui, /The bar at each unit door is what thieves check\./);
  const rd = readFileSync('./js/render.js', 'utf8'); assert.match(rd, /const dc = sim\.doorCover\(u\); if \(!dc\.total\) continue;/);
});

await test('universal: in Career, Sandbox, Free Build and every scenario the ordinary break-in targets doors that are not fully covered, occupied units take outside equipment only, and the tutorial stays closed', () => {
  let modes = 0, retro = 0;
  for (const [name, mk] of MODES) {
    const sim = mk(LOCAL); sim.ensure(); const s = sim.s;
    const occ = sim.objs('unit').filter((u) => u.lease && s.leases[u.lease] && s.tenants[s.leases[u.lease].tenant]);
    if (name === 'Tutorial') { assert.ok(occ.every((u) => !exteriorRetrofitEligible(sim, u)), 'tutorial keeps equipment closed'); continue; }
    if (!occ.length) continue; modes++;
    // ordinary break-in (sim.dramaDay): force one attempt and check the target, with the parent's random draw order
    const exposed = occ.filter((u) => sim.doorExposed(u)); const hit = []; const bi = sim.breakIn.bind(sim); sim.breakIn = (u, d, st) => { hit.push(u); return bi(u, d, st); };
    const po = sim.pressureOn; sim.pressureOn = () => true; s.exp.security = 0.9; (s.drama ||= { lastBreak: -99, wars: {} }).lastBreak = -99;
    const rnd = sim.rnd; sim.rnd = () => 0; sim.dramaDay(sim.day); sim.rnd = rnd; sim.pressureOn = po;
    assert.equal(hit.length, 1, name + ' break-in fired'); if (exposed.length) assert.ok(sim.doorExposed(hit[0]), name + ': target door not fully covered');
    // occupied units: outside equipment only, no hold
    const u = occ.find((x) => { const R = sim.plan({ tool: 'unitRetrofit', unit: x.id, lighting: 'both', outsideCameras: true, excludedFixtures: [] }); return R.status === 'valid'; });
    if (u) { retro++; const A = { tool: 'unitRetrofit', unit: u.id, lighting: 'both', outsideCameras: true, excludedFixtures: [] }, R = sim.plan(A);
      assert.equal(R.occupied, true, name); assert.equal(R.upgrades.counts.unitLight, 0, name); if (!sim.unlimited()) s.cash = Math.max(s.cash, R.cost + 1000);
      const r = sim.dispatch({ type: 'unitRetrofit', ...A, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, name + ' ' + r.msg); sim.markDirty(); sim.ensure(); assert.equal(u.blocked, false, name + ' not held'); }
  }
  assert.ok(modes >= 10, 'modes with tenants ' + modes); assert.ok(retro >= 8, 'modes with an occupied outside retrofit ' + retro);
});

await test('10 days of every mode, with and without equipment, are byte-identical to the parent fd648bf', () => {
  for (const [name, mk] of MODES) {
    const a = mk(LOCAL), b = mk(P); a.s.speed = 1; b.s.speed = 1; days(a, 10); days(b, 10); assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), name + ' (no equipment)');
    if (name === 'Tutorial') continue;
    const run = (M) => { const s = mk(M); s.ensure(); s.s.speed = 1; let k = 0;
      for (let y = 1; y < s.s.H - 1 && !k; y++) for (let x = 1; x < s.s.W - 1 && !k; x++) { const sp = { tool: 'du5x10', a: { x, y }, b: { x: x + 1, y }, rotation: 2, f: 0, lighting: 'both', outsideCameras: true }; const R = s.plan(sp); if (R.status !== 'invalid' && (s.unlimited() || s.s.cash >= R.cost)) { if (s.dispatch({ type: 'build', ...sp, upgradeStamp: R.upgradeStamp }).ok) k = 1; } }
      days(s, 10); return JSON.stringify(s.s); };
    assert.equal(run(LOCAL), run(P), name + ' (equipment)');
  }
});

console.log(`ALL PASS: ${n} security integrity groups; native checks only, physical Safari NOT TESTED`);
