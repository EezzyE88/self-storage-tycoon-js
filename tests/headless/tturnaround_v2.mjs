// Maple Turnaround v2: the accepted public-frontage Maple layout (street office and parking, recessed
// storage gate), the unchanged turnaround starting conditions, measured goals, and the unfinished west
// corridor as a growth project through the existing construction tools. Ordinary dispatches only: no forced
// leases, free funds, instant construction or edited reputation. Production saveCode/prepareLoad run in a
// vm, as in tscenario_frame.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple } from '../../js/maple.js';
import { MAPLE_PUBLIC, pocket, accessState } from '../../js/mapleaccess.js';
import { briefing } from '../../js/scenarioframe.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };

function harness(sim) {
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const p = await harness(sim).prepareLoad(await harness(sim).saveCode()); assert.equal(p.ok, true); return p.company.props[p.company.active].sim; };
const run = (sim, untilDay, op) => { while (sim.day <= untilDay && sim.s.scenario.status === 'active') { if (op && sim.mod === 9 * 60) op(sim); sim.step(); sim.events.length = 0; } };

// The unfinished west corridor: one corridor light, then seven interior 5x10 units facing the corridor.
export const CORRIDOR = [{ tool: 'light', a: { x: 17, y: 8 }, b: { x: 17, y: 8 }, f: 0 }, { tool: 'iu5x10', a: { x: 16, y: 5 }, b: { x: 16, y: 11 }, f: 0 }];
const marketRoll = (sim) => sim.objs('unit').reduce((a, u) => a + sim.marketRent(u), 0);
// Owner works repairs, conversations take the first offered choice, ready units are commissioned.
const tend = (sim) => {
  for (const t of sim.s.tasks.filter((t) => !t.assigned && !t.vendor && t.type === 'repair')) if (ROLES.owner.can.includes(t.need)) sim.dispatch({ type: 'ownerTask', task: t.id });
  for (const c of [...sim.s.convos]) if (c.actions && c.actions.length) sim.dispatch({ type: 'convo', id: c.id, i: 0 });
  if (sim.objs('unit').some((u) => u.cstate === 'ready')) sim.dispatch({ type: 'commission', all: true });
};
const grower = (day) => (sim) => {
  tend(sim);
  if (sim.day >= day && !sim.s.orders.some((o) => o.tool === 'iu5x10') && sim.objs('unit').length === 23) for (const a of CORRIDOR) assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true, a.tool);
};
const fingerprint = (sim) => JSON.stringify({ t: sim.s.t, cash: Math.round(sim.s.cash * 100), roll: sim.rentRoll(), units: sim.objs('unit').map((u) => [u.id, u.lease, u.commercial, u.cstate]), status: sim.s.scenario.status, hold: sim.s.scenario.hold, rng: sim.s.rngS });

await test('a new run starts on the accepted public-frontage Maple layout with the unchanged turnaround setup', () => {
  const sim = makeScenario('turnaround'), s = sim.s, units = sim.objs('unit');
  assert.equal(s.layout, MAPLE_PUBLIC); assert.equal(s.mode, 'scenario'); assert.equal(s.open, true);
  const office = sim.objs('office')[0], gate = sim.objs('gate')[0];
  assert.deepEqual([office.x, office.y, office.door.x, office.door.y], [4, 20, 8, 21]); assert.ok(pocket(office.door.x, office.door.y), 'office door is in the public pocket');
  assert.deepEqual([gate.x, gate.y, gate.mapleCompound], [22, 23, true]); assert.ok(!pocket(gate.x, gate.y), 'the gate is not part of the public pocket');
  assert.equal(units.length, 23); assert.equal(units.filter((u) => u.lease).length, 12); assert.equal(units.filter((u) => u.commercial === 'unready').length, 11);
  assert.equal(s.tasks.filter((t) => t.type === 'makeready').length, 11); assert.equal(s.cash, 7000); assert.equal(gate.cond, 0.3);
  assert.ok(sim.objs('light').every((o) => o.cond < 0.53)); assert.ok(s.carts.every((c) => c.cond < 0.61));
  const late = Object.values(s.leases).filter((L) => L.status !== 'current').map((L) => L.status).sort(); assert.deepEqual(late, ['delinquent', 'delinquent', 'pastdue']);
  assert.equal(Object.values(s.leases).filter((L) => L.status === 'delinquent').every((L) => s.objects[L.unit].overlock), true);
  assert.equal(s.scenario.briefed, 0); assert.equal(s.scenario.hold, 0); assert.equal(s.scenario.deadline, 150); assert.deepEqual(s.scenario.fail, { cashBelow: -5000, cashDays: 14 });
  const again = makeScenario('turnaround'); assert.equal(JSON.stringify(again.s), JSON.stringify(s), 'setup is deterministic');
});

await test('measured goals: full occupancy at market rent falls short of the roll goal; the corridor makes it reachable', () => {
  const sim = makeScenario('turnaround'), g = Object.fromEntries(sim.s.scenario.goals.map((x) => [x.k, x.v]));
  assert.deepEqual(g, { occ: 0.92, rep: 0.8, roll: 3600 }); assert.deepEqual(SCENARIOS.turnaround.goals.map((x) => x.label), ['Occupancy at least 92%', 'Reputation at least 80%', 'Monthly rent roll at least $3,600']);
  assert.equal(marketRoll(sim), 3350); assert.ok(marketRoll(sim) < g.roll, 'occupancy alone at market rent cannot win');
  assert.equal(Math.ceil(23 * g.occ), 22); assert.equal(Math.ceil(30 * g.occ), 28);
  assert.equal(3350 + 7 * MARKETS.maple.rent['5x10'], 4181.25); assert.ok(3350 + 7 * MARKETS.maple.rent['5x10'] >= g.roll);
  const b = briefing(sim); assert.match(b[0], /Office and parking face the street; storage is behind the gate/); assert.match(b[2], /11 units need make-ready.*3 accounts are behind.*west corridor/);
});

await test('public access: office and parking reachable from the street without the gate; storage only through the gate; 30 days of customers', () => {
  const sim = makeScenario('turnaround'), s = sim.s, st = accessState(sim);
  assert.equal(st.pedestrian, true, 'sidewalk to office door inside the public pocket'); assert.equal(st.parking, true); assert.equal(st.staff, true); assert.ok(st.bays.length > 0);
  for (const u of sim.objs('unit')) assert.ok(!pocket(u.x, u.y), 'no storage unit opens into the public pocket');
  let visitors = new Set(), outside = 0, tenantCars = new Set(), throughGate = new Set(), accessLost = 0; const gate = sim.objs('gate')[0];
  while (sim.day <= 30) {
    sim.step(); accessLost += sim.events.filter((e) => e.type === 'access_lost').length; sim.events.length = 0;
    for (const a of s.agents) {
      const car = sim.vehAt(a.veh);
      if (a.publicVisit) { visitors.add(a.id); if (!a.hidden && a.y < 30 && !pocket(Math.floor(a.x), Math.floor(a.y))) outside++; if (car && car.y < 30 && !pocket(Math.floor(car.x), Math.floor(car.y))) outside++; }
      else if (a.kind !== 'staff' && car) { tenantCars.add(a.id); if (Math.floor(car.y) >= gate.y && Math.floor(car.x) >= 18 && Math.floor(car.x) < 24) throughGate.add(a.id); }
    }
  }
  assert.ok(visitors.size >= 20, 'prospects visit the street office: ' + visitors.size); assert.equal(outside, 0, 'prospects and their cars stay in the public frontage');
  assert.ok(tenantCars.size >= 30); assert.equal(throughGate.size, tenantCars.size, 'every storage visit drives through the recessed gate');
  assert.equal(accessLost, 0); assert.ok(sim.objs('unit').filter((u) => u.lease).length > 12, 'customers keep renting at the counter');
});

await test('west corridor: existing construction rules place seven interior 5x10 units after one light, and they open and lease', () => {
  const sim = makeScenario('turnaround'), s = sim.s;
  const light = sim.plan(CORRIDOR[0]), units = sim.plan(CORRIDOR[1]);
  assert.equal(light.status, 'valid'); assert.equal(light.cost, 200);
  assert.equal(units.status, 'incomplete'); assert.deepEqual(units.missing, ['Hallway is dark - add a light']); assert.equal(units.count, 7); assert.equal(units.cost, 2387);
  assert.equal(sim.plan({ tool: 'iu5x10', a: { x: 15, y: 5 }, b: { x: 15, y: 11 }, f: 0 }).status, 'invalid', 'a row that does not face the corridor cannot hold units');
  run(sim, 4, tend); for (const a of CORRIDOR) assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true);
  run(sim, 40, tend);
  const fresh = sim.objs('unit').filter((u) => u.x === 15 && u.w === 2 && u.access === 'interior');
  assert.equal(sim.objs('unit').length, 30); assert.equal(fresh.length, 7); assert.ok(fresh.every((u) => u.cstate === 'operating' && u.dir[0] === 1 && u.dir[1] === 0), JSON.stringify(fresh.map((u) => u.cstate)));
  assert.ok(fresh.filter((u) => u.lease).length >= 2, 'corridor units lease through the ordinary flow: ' + fresh.filter((u) => u.lease).length);
  assert.ok(s.cash > 0); assert.equal(s.creative, false);
});

await test('determinism: the same seed and choices give the same Day-45 state twice', () => {
  const one = makeScenario('turnaround'), two = makeScenario('turnaround');
  run(one, 45, grower(10)); run(two, 45, grower(10)); assert.equal(fingerprint(one), fingerprint(two));
});

await test('save/reload: production path at Day 1, during corridor construction and after it; reloaded runs continue identically', async () => {
  for (const [day, buildAt] of [[1, 99], [12, 10], [40, 10]]) {
    const sim = makeScenario('turnaround'); run(sim, day - 1, grower(buildAt));
    const loaded = await reload(sim);
    assert.equal(loaded.s.layout, MAPLE_PUBLIC); assert.equal(JSON.stringify(loaded.s.scenario.goals.map((g) => g.v)), '[0.92,0.8,3600]');
    assert.equal(loaded.s.scenario.briefed, 0); assert.equal(loaded.objs('unit').length, sim.objs('unit').length);
    assert.equal(fingerprint(loaded), fingerprint(sim), 'reload preserves the state at Day ' + day);
    run(sim, day + 20, grower(buildAt)); run(loaded, day + 20, grower(buildAt));
    assert.equal(fingerprint(loaded), fingerprint(sim), 'continuing after reload from Day ' + day);
  }
});

await test('a Turnaround save from before v2 keeps its old layout and goals', async () => {
  const sim = makeMaple(4401), s = sim.s; s.mode = 'scenario'; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = true;
  s.scenario = { id: 'turnaround', name: 'Maple Turnaround', goals: [{ k: 'occ', v: 0.95, label: 'Occupancy at least 95%', fmt: 'pct' }, { k: 'rep', v: 0.8, label: 'Reputation at least 80%', fmt: 'pct' }, { k: 'roll', v: 3750, label: 'Monthly rent roll at least $3,750', fmt: 'money' }], deadline: 150, fail: { cashBelow: -5000, cashDays: 14 }, status: 'active', badDays: 0 };
  const loaded = await reload(sim);
  assert.equal(loaded.s.layout, undefined); assert.equal(JSON.stringify(loaded.s.scenario.goals.map((g) => g.v)), '[0.95,0.8,3750]');
  const office = loaded.objs('office')[0]; assert.equal(JSON.stringify([office.x, office.y]), '[4,23]');
});

console.log(`${n} Maple Turnaround v2 checks passed`);
