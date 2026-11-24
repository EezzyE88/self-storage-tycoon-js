// SK-02: every kit HVAC plant can be serviced by a hired Tech.
// Grand Opening's plant pad used to be an island, so its "Repair HVAC Plant" job was refused all shift, every day.
// Checks route reachability of each HVAC service spot from the office, and Tech-only repairs that are assigned on shift
// and completed without a single unreachable refusal: forced wear on several seeds, natural wear, and a production
// saveCode/prepareLoad reload while the repair is under way.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { staffLanding } from '../../js/mapleaccess.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const IDS = ['grandopening', 'stormseason', 'chainnextdoor'];

function harness(sim) { // production saveCode/prepareLoad from main.js, as tscenario_kit does
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const g = harness(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.msg); return p.company.props[p.company.active].sim; };

const hireTech = (sim) => { const r = sim.dispatch({ type: 'hire', role: 'tech' }); assert.equal(r.ok, true, 'Tech hired: ' + (r.msg || '')); };
const techAgent = (sim) => { const st = sim.s.staff.find((x) => x.role === 'tech'); return sim.s.agents.find((a) => a.kind === 'staff' && a.sid === st.id); };
const hvacTasks = (sim) => sim.s.tasks.filter((t) => t.type === 'repair' && sim.s.objects[t.obj]?.type === 'hvac');
// the same route test startTask applies: walk from the office landing to the task cell
function serviceRoute(sim, o) {
  const t = { type: 'repair', obj: o.id, need: 'repair_complex' }, cell = sim.taskCell(t, techAgent(sim));
  if (!cell) return { cell: null, ok: false };
  const landing = staffLanding(sim.objs('office')[0], cell), probe = { f: 0, x: landing.x + 0.5, y: landing.y + 0.5, path: null, pi: 0 };
  return { cell, ok: !!sim.goTo(probe, cell.f, cell.x, cell.y) };
}
// step the sim, recording HVAC repair lifecycle: assignment time and shift, refusals, unreachable marks, completion
function watch(sim, untilT, rec, stop) {
  const s = sim.s;
  while (s.t < untilT && s.scenario.status === 'active') {
    if (rec.plan && sim.mod === 9 * 60) rec.plan(sim);
    sim.step();
    for (const e of sim.events) {
      if (e.type === 'refuse') rec.refuse++;
      if (e.type === 'task_start' && hvacTasks(sim).some((t) => t.id === e.task)) rec.starts.push({ t: s.t, onShift: sim.onShift(), by: s.tasks.find((t) => t.id === e.task).assigned });
      if (e.type === 'repaired' && s.objects[e.obj]?.type === 'hvac') rec.repaired.push({ t: s.t, obj: e.obj });
    }
    sim.events.length = 0;
    for (const t of hvacTasks(sim)) { rec.seen.add(t.id); if (t.unreachable) rec.unreachable++; if (t.vendor) rec.vendor++; }
    if (stop && stop(rec)) break;
  }
  return rec;
}
const newRec = (plan) => ({ plan, refuse: 0, unreachable: 0, vendor: 0, starts: [], repaired: [], seen: new Set() });
const goPlan = (sim) => { const s = sim.s, k = s.scenario.kit, policy = { finance: 1, opening: 0, movers: 0, rival: 1, bulk: 1 }; // tscenario_kit's plan, minus Owner repairs and vendors
  for (const c of [...s.convos]) if (c.actions?.length) sim.dispatch({ type: 'convo', id: c.id, i: 0 });
  if (k.pending) { let i = policy[k.pending.id]; if (i == null) for (const [p, v] of Object.entries(policy)) if (k.pending.id.startsWith(p)) i = v; if (i != null) { const r = sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i }); if (!r.ok) sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i: k.pending.def ?? 0 }); } }
  if (!s.mkt.ad) sim.dispatch({ type: 'ad', kind: 'local' });
  if (sim.financialPosition().netLiquid < -3000 && s.loan.bal < sim.creditLimit() - 2000) sim.dispatch({ type: 'loan', amt: 2000 }); };

await test('every kit HVAC plant has a Tech service spot with a walkable route from the office', async () => {
  const plants = {};
  for (const id of IDS) for (const seed of [1, 5, 4401]) {
    const sim = makeScenario(id, seed); hireTech(sim);
    const hv = sim.objs('hvac'); plants[id] = hv.length;
    for (const o of hv) { const r = serviceRoute(sim, o); assert.ok(r.cell, `${id} seed ${seed}: HVAC (${o.x},${o.y}) has a service cell`); assert.equal(r.ok, true, `${id} seed ${seed}: HVAC (${o.x},${o.y}) service cell (${r.cell.x},${r.cell.y}) is route-reachable`); }
  }
  assert.ok(plants.grandopening >= 1 && plants.chainnextdoor >= 1, 'Grand Opening and the Chain both have HVAC plants: ' + JSON.stringify(plants));
  const go = makeScenario('grandopening', 1); hireTech(go); const c = serviceRoute(go, go.objs('hvac')[0]).cell;
  assert.deepEqual([c.x, c.y], [29, 9], 'Grand Opening keeps its plant at (29,8), serviced from the joined pad at (29,9)');
});

await test('Grand Opening, Tech only: a worn HVAC plant gets one repair job, assigned on shift and completed, never refused', async () => {
  for (const seed of [4401, 3, 99]) {
    const sim = makeScenario('grandopening', seed); hireTech(sim); const o = sim.objs('hvac')[0]; o.cond = 0.3;
    const rec = watch(sim, sim.s.t + 3 * MIN_PER_DAY, newRec(), (r) => r.repaired.length > 0);
    assert.equal(rec.seen.size, 1, `seed ${seed}: one HVAC repair job generated`);
    assert.equal(rec.starts.length, 1, `seed ${seed}: started once`); assert.equal(rec.starts[0].onShift, true, `seed ${seed}: started during the 7 AM-8 PM shift`);
    assert.equal(rec.starts[0].by, sim.s.staff.find((x) => x.role === 'tech').id, `seed ${seed}: the Tech took it`);
    assert.equal(rec.refuse, 0, `seed ${seed}: no refusals`); assert.equal(rec.unreachable, 0, `seed ${seed}: never marked unreachable`); assert.equal(rec.vendor, 0, `seed ${seed}: no vendor`);
    assert.equal(rec.repaired.length, 1, `seed ${seed}: repaired`); assert.equal(hvacTasks(sim).length, 0, `seed ${seed}: job closed`); assert.ok(o.cond > 0.9, `seed ${seed}: plant restored`);
  }
});

await test('Grand Opening, Tech only: natural wear raises the job, which the Tech picks up the same day and completes', async () => {
  const sim = makeScenario('grandopening', 4401); hireTech(sim);
  const rec = watch(sim, 140 * MIN_PER_DAY, newRec(goPlan), (r) => r.repaired.length > 0);
  assert.equal(rec.seen.size, 1, 'one job'); assert.equal(rec.starts.length, 1); assert.equal(rec.starts[0].onShift, true);
  assert.equal(rec.refuse, 0, 'no refusals'); assert.equal(rec.unreachable, 0); assert.equal(rec.vendor, 0);
  assert.equal(rec.repaired.length, 1, 'repaired before Day 140'); assert.ok(rec.repaired[0].t - rec.starts[0].t < MIN_PER_DAY, 'completed within a day of starting');
});

await test('a save and reload while the Tech is repairing the plant continues and completes the repair', async () => {
  let sim = makeScenario('grandopening', 4401); hireTech(sim); const id = sim.objs('hvac')[0].id; sim.objs('hvac')[0].cond = 0.3;
  const rec = watch(sim, sim.s.t + 2 * MIN_PER_DAY, newRec(), (r) => r.starts.length > 0);
  assert.equal(rec.starts.length, 1, 'started'); watch(sim, sim.s.t + 60, rec);
  const job = hvacTasks(sim)[0]; assert.ok(job && job.assigned, 'still in progress at save');
  sim = await reload(sim); assert.equal(hvacTasks(sim).length, 1, 'job survives reload'); assert.ok(hvacTasks(sim)[0].assigned, 'assignment survives reload');
  watch(sim, sim.s.t + MIN_PER_DAY, rec, (r) => r.repaired.length > 0);
  assert.equal(rec.repaired.length, 1, 'repaired after reload'); assert.equal(rec.refuse, 0); assert.equal(rec.unreachable, 0); assert.ok(sim.s.objects[id].cond > 0.9);
});

console.log(`${n} kit HVAC access groups passed`);
