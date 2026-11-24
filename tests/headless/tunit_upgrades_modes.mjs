// Unit lighting & cameras are a universal SST mechanic (owner rule, Nov 24, 2026): Career, every scenario and Sandbox offer the
// optional equipment for new units and eligible vacant-unit retrofits, with unchanged costs, installation, coverage, power,
// cancellation, occupied-unit refusals and saves. The guided tutorial and an active lesson still refuse it.
// usage: node tests/headless/tunit_upgrades_modes.mjs <export of d5e7cc3, the parent without this change>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, makeSandbox, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple, makeEmptyLot } from '../../js/maple.js';
import { UPGRADE, upgradesEnabled, retrofitEligible, mountedOn, upgradePower } from '../../js/unitupgrades.js';

const PARENT = process.argv[2];
assert.ok(PARENT, 'usage: node tests/headless/tunit_upgrades_modes.mjs <export of the parent commit>');
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };

function harnessFor(root, mods) {
  const main = readFileSync(root + '/js/main.js', 'utf8');
  const context = vm.createContext({ Sim: mods.Sim, SCENARIOS: mods.SCENARIOS, Audio: class {}, fmtTime: mods.fmtTime, modeLabel: mods.modeLabel, sandboxName: mods.sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  return (sim) => { const g = context.game; g.sim = sim; g.company = { props: [{ name: 'Lot', sim }], active: 0, feed: [] }; return g; };
}
const here = harnessFor('.', { Sim, SCENARIOS, fmtTime, modeLabel, sandboxName });
const reload = async (sim) => { const g = here(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.reason); return p.company.props[p.company.active].sim; };
const clean = (v) => typeof v === 'string' ? v.replace(/[<>"`]/g, '').replace(/'/g, '’').slice(0, 2000) : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v;
const same = (a, b) => JSON.stringify(clean(JSON.parse(JSON.stringify(a)))) === JSON.stringify(clean(JSON.parse(JSON.stringify(b))));

const P = { ...(await import(PARENT + '/js/scenarios.js')), ...(await import(PARENT + '/js/maple.js')) };
const career = (M) => { const s = M.makeMaple(); s.dispatch({ type: 'tutSkip' }); return s; };
const MODES = [
  ['Career', (M) => career(M)],
  ['Sandbox business', (M) => M.makeSandbox({ start: 'starter', cash: 100000 })],
  ['Free Build', (M) => M.makeSandbox({ kind: 'free', start: 'starter' })],
  ['Creative lot', (M) => M.makeEmptyLot({ creative: true })],
  ...Object.keys(SCENARIOS).map((id) => ['Scenario ' + id, (M) => M.makeScenario(id, 11)]),
];
const LOCAL = { makeScenario, makeSandbox, makeMaple, makeEmptyLot };
const vacant = (s) => s.objs('unit').filter((u) => retrofitEligible(s, u));
const ARGS = { lighting: 'both', outsideCameras: true };
function freeSpot(s) {
  for (let y = 1; y < s.s.H - 1; y++) for (let x = 1; x < s.s.W - 1; x++) for (const rotation of [0, 2]) {
    const a = { tool: 'du5x10', a: { x, y }, b: { x, y }, rotation, f: 0 };
    if (s.plan({ ...a, lighting: 'none' }).status !== 'invalid') return a;
  }
  return null;
}
const finish = (s, id) => { const ord = s.s.orders.find((o) => o.id === id); for (let i = 0; i < 40000 && ord.st === 'construction'; i++) s.step(); assert.equal(ord.st, 'done', 'installation finishes'); s.ensure(); };
const charge = (s, R) => s.s.creative ? 0 : R.cost;

await test('guided tutorial and an active lesson still refuse unit lighting and cameras, with an accurate reason', async () => {
  const t = makeMaple(); t.ensure(); assert.equal(t.s.tut.on, true); assert.equal(upgradesEnabled(t), false);
  const spot = freeSpot(t); assert.ok(spot);
  const R = t.plan({ ...spot, ...ARGS }); assert.equal(R.status, 'invalid'); assert.match(R.reasons.join(';'), /not available during the tutorial or a lesson/);
  for (const [name, mk] of MODES) {
    const s = mk(LOCAL); s.ensure(); s.s.lesson = { id: 'test', built: [], flags: {} };
    assert.equal(upgradesEnabled(s), false, name); assert.equal(vacant(s).length, 0, name + ': no retrofit during a lesson');
  }
});

const built = {};
await test('every mode offers lighting and cameras on new units: exact charge, power, installation on the new unit and save/reload', async () => {
  for (const [name, mk] of MODES) {
    const s = mk(LOCAL); s.ensure(); s.s.cash = Math.max(s.s.cash, 60000); s.s.speed = 0;
    assert.equal(upgradesEnabled(s), true, name);
    const spot = freeSpot(s); assert.ok(spot, name + ': a free spot exists');
    const R = s.plan({ ...spot, ...ARGS }); assert.notEqual(R.status, 'invalid', name + ': ' + R.reasons.join(';'));
    assert.ok(R.upgrades, name); assert.equal(R.upgrades.counts.unitLight, 1, name + ': interior light offered');
    const fixtures = R.creates.filter((o) => o.mount);
    assert.equal(R.upgrades.cost, fixtures.reduce((t, o) => t + UPGRADE[o.type].build, 0), name + ': established build prices');
    assert.ok(Math.abs(upgradePower(R) - fixtures.reduce((t, o) => t + UPGRADE[o.type].kw, 0)) < 1e-9, name + ': established power');
    const cash = s.s.cash, r = s.dispatch({ type: 'build', ...spot, ...ARGS, upgradeStamp: R.upgradeStamp }); assert.ok(r.ok, name + ': ' + r.msg);
    assert.equal(Math.round((cash - s.s.cash) * 100), Math.round(charge(s, R) * 100), name + ': charged the quote once');
    assert.equal(s.s.speed, 0, name + ': manual Pause kept');
    finish(s, r.order);
    const unit = s.objs('unit').find((u) => u.x === R.creates.find((o) => o.type === 'unit').x && u.y === R.creates.find((o) => o.type === 'unit').y && mountedOn(s, u.id).length);
    assert.ok(unit, name + ': fixtures mounted on the new unit');
    const kinds = mountedOn(s, unit.id).map((o) => o.type).sort();
    assert.deepEqual(kinds, fixtures.map((o) => o.type).sort(), name + ': every quoted fixture installed');
    const twin = await reload(s); assert.deepEqual(mountedOn(twin, unit.id).map((o) => o.type).sort(), kinds, name + ': fixtures survive production save/reload');
    days(s, 1); days(twin, 1); assert.ok(same(twin.s, s.s), name + ': reloaded run continues identically');
    built[name] = true;
  }
});

await test('every mode with a vacant unit offers retrofits: exact charge, rental hold, cancel/refund, install, no duplicate and save/reload', async () => {
  let tried = 0;
  for (const [name, mk] of MODES) {
    const s = mk(LOCAL); s.ensure(); s.s.cash = Math.max(s.s.cash, 60000); s.s.speed = 0;
    const u = vacant(s)[0]; if (!u) continue; tried++;
    const args = { tool: 'unitRetrofit', unit: u.id, ...ARGS }, R = s.plan(args); assert.notEqual(R.status, 'invalid', name + ': ' + R.reasons.join(';'));
    assert.equal(R.cost, R.creates.reduce((t, o) => t + UPGRADE[o.type].retrofit, 0), name + ': established retrofit prices');
    const cash = s.s.cash, commercial = u.commercial;
    const q = s.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R.upgradeStamp }); assert.ok(q.ok, name + ': ' + q.msg);
    assert.equal(Math.round((cash - s.s.cash) * 100), Math.round(charge(s, R) * 100), name);
    if (s.s.sb?.instant) { // Free Build's instant construction finishes the order at once (unchanged Sandbox behaviour)
      assert.equal(mountedOn(s, u.id).length, R.creates.length, name + ': installed instantly'); assert.equal(s.plan(args).status, 'invalid', name + ': no duplicate purchase');
      const twin = await reload(s); assert.equal(mountedOn(twin, u.id).length, R.creates.length, name); continue;
    }
    assert.equal(u.blocked, true, name + ': cannot rent during install');
    assert.equal(s.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R.upgradeStamp }).ok, false, name + ': no second order');
    const mid = await reload(s); assert.equal(mid.s.objects[u.id].retrofitOrder, q.order, name + ': pending install survives reload');
    assert.ok(s.dispatch({ type: 'cancelOrder', id: q.order }).ok, name); assert.equal(Math.round(s.s.cash * 100), Math.round(cash * 100), name + ': cancel refunds');
    assert.equal(u.blocked, false, name); assert.equal(u.commercial, commercial, name);
    const R2 = s.plan(args), q2 = s.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R2.upgradeStamp }); assert.ok(q2.ok, name); finish(s, q2.order);
    assert.equal(mountedOn(s, u.id).length, R2.creates.length, name + ': installed'); assert.equal(s.plan(args).status, 'invalid', name + ': no duplicate purchase');
    const twin = await reload(s); assert.equal(mountedOn(twin, u.id).length, R2.creates.length, name + ': installed fixtures survive reload');
  }
  assert.ok(tried >= 11, 'retrofit exercised in ' + tried + ' modes');
});

await test('occupied and reserved units and empty selections are still refused in Career and scenarios', async () => {
  for (const mk of [(M) => career(M), (M) => M.makeScenario('ratereset', 11), (M) => M.makeScenario('stormseason', 11)]) {
    const s = mk(LOCAL); s.ensure();
    const leased = s.objs('unit').find((u) => u.lease); assert.ok(leased); assert.equal(s.plan({ tool: 'unitRetrofit', unit: leased.id, ...ARGS }).status, 'invalid');
    const u = vacant(s)[0]; assert.ok(u);
    u.commercial = 'reserved'; assert.equal(s.plan({ tool: 'unitRetrofit', unit: u.id, ...ARGS }).status, 'invalid'); delete u.commercial;
    const R = s.plan({ tool: 'unitRetrofit', unit: u.id, lighting: 'none', outsideCameras: false }); assert.equal(R.status, 'invalid', 'nothing selected is refused');
  }
});

await test('with no equipment chosen, 10 days of every mode (and the tutorial) are byte-identical to the parent d5e7cc3', async () => {
  const all = [['Tutorial', (M) => M.makeMaple()], ...MODES];
  for (const [name, mk] of all) {
    const a = mk(LOCAL), b = mk(P); a.s.speed = 1; b.s.speed = 1; days(a, 10); days(b, 10);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), name);
  }
});

await test('Sandbox results are unchanged from the parent for the same equipment purchase', async () => {
  for (const kind of ['business', 'free']) {
    const run = (M) => { const s = M.makeSandbox({ kind, start: 'starter', cash: 100000 }); s.ensure(); const u = s.objs('unit').find((x) => x.cstate === 'operating' && !x.lease && !s.s.agents.some((g) => g.unit === x.id));
      const args = { tool: 'unitRetrofit', unit: u.id, ...ARGS }, R = s.plan(args); assert.ok(s.dispatch({ type: 'unitRetrofit', ...args, upgradeStamp: R.upgradeStamp }).ok); days(s, 3); return s; };
    assert.equal(JSON.stringify(run(LOCAL).s), JSON.stringify(run(P).s), kind);
  }
});

console.log(`ALL PASS: ${n} unit lighting/camera mode groups; native checks only, physical Safari NOT TESTED`);
