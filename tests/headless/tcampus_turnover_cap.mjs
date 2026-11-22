// Campus Crunch turnover capacity (PR #60 repair). At 66eac7d the scenario's x3 turnover multiplier stacked on the
// existing x2 auction multiplier: 150 x 2 x 3 = 900 min, a 15 h make-ready job that no 8 h worker could ever take.
// turnoverWork() now caps scenario turnover work at one worker's day (rules.turnWorkCap 450 min, never above the least
// make-ready capacity). Ordinary move-outs keep 7.5 h; existing scenarios and Maple keep their exact base work.
// Native headless only; physical Safari NOT TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, WORK } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple } from '../../js/maple.js';
import { turnoverWork, makeReadyCapMin, crewSummary } from '../../js/scenariorules.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const NEW = ['ratereset', 'freightlift', 'campus'];
const OLD = Object.keys(SCENARIOS).filter((id) => !NEW.includes(id));
const step = (sim, m) => { for (let i = 0; i < m; i++) { sim.step(); sim.events.length = 0; } };
function harness(sim) {
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const g = harness(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true); return p.company.props[p.company.active].sim; };
const leased = (sim) => Object.values(sim.s.leases).find((L) => L.status !== 'auction' && !sim.s.tenants[L.tenant]?.leaving);
const endJob = (sim, why) => { const L = leased(sim); sim.endLease(L, why); return sim.s.tasks.filter((t) => t.type === 'makeready' && t.obj === L.unit).at(-1); };
const owner = (sim) => sim.s.staff.find((x) => x.role === 'owner');

await test('the defect: uncapped Campus auction work (150 x 2 x 3 = 900 min, 15 h) exceeds every make-ready role\'s 8 h day', async () => {
  const caps = Object.values(ROLES).filter((r) => r.workHours && r.can.includes('makeready')).map((r) => r.workHours);
  assert.equal(WORK.makeready * 2 * SCENARIOS.campus.rules.turnWork / 60, 15);
  assert.ok(caps.every((h) => h < 15)); assert.equal(makeReadyCapMin(), Math.min(...caps) * 60); assert.equal(makeReadyCapMin(), 480);
});
await test('ordinary Campus move-outs keep their heavy 7.5 h make-ready (x3), within one worker day', async () => {
  const sim = makeScenario('campus', 13); const t = endJob(sim, 'moveout');
  assert.equal(t.work, WORK.makeready * 3); assert.equal(sim.taskHours(t), 7.5); assert.ok(sim.taskHours(t) <= sim.workCapacity(owner(sim)));
});
await test('Campus auction clean-outs are capped at 450 min (7.5 h), not 900, and fit Owner and Porter capacity', async () => {
  for (const seed of [11, 12, 13]) { const sim = makeScenario('campus', seed); const t = endJob(sim, 'auction');
    assert.match(t.label, /^Clean out /); assert.equal(t.work, 450); assert.equal(sim.taskHours(t), 7.5);
    for (const role of ['owner', 'porter']) assert.ok(sim.taskHours(t) <= ROLES[role].workHours, role); }
});
await test('a Porter takes and finishes the Campus auction clean-out; booked hours never exceed the 8 h day and the crew log records them', async () => {
  const sim = makeScenario('campus', 13); assert.equal(sim.dispatch({ type: 'hire', role: 'porter' }).ok, true);
  const t = endJob(sim, 'auction'); const p = sim.s.staff.find((x) => x.role === 'porter'); let maxUsed = 0, by = null;
  for (let m = 0; m < 4 * 1440 && sim.s.tasks.includes(t); m++) { step(sim, 1); if (t.workBooked && !by) by = t.workBooked;
    for (const st of sim.s.staff) if (st.workDay === sim.day) maxUsed = Math.max(maxUsed, st.workUsed || 0); }
  assert.equal(sim.s.tasks.includes(t), false, 'task completed'); assert.ok(!t.vendor, 'done by staff, not a vendor');
  assert.ok(by === p.id || by === owner(sim).id, 'booked to the Porter or the Owner'); assert.ok(maxUsed <= 8, 'max workUsed ' + maxUsed);
  assert.notEqual(sim.s.objects[t.obj].commercial, 'unready');
  step(sim, 1440); const rows = crewSummary(sim.s, 7); assert.ok(rows.length >= 2);
  for (const r of rows) assert.ok(r.used <= r.cap, JSON.stringify(r));
  assert.ok(rows.reduce((a, r) => a + r.used, 0) >= 7.5, 'logged hours include the 7.5 h clean-out');
});
await test('with no staff, Owner automation still picks up and finishes the capped clean-out', async () => {
  const sim = makeScenario('campus', 12); const t = endJob(sim, 'auction');
  for (let m = 0; m < 6 * 1440 && sim.s.tasks.includes(t); m++) step(sim, 1);
  assert.equal(sim.s.tasks.includes(t), false); assert.ok(!t.vendor);
});
await test('the vendor alternative is unchanged: $250 service charge, booked as service, task taken off staff queues', async () => {
  const sim = makeScenario('campus', 11); const t = endJob(sim, 'auction'); const c0 = sim.s.cash; const svc0 = sim.s.today.service || 0;
  const r = sim.dispatch({ type: 'callVendor', task: t.id }); assert.equal(r.ok, true); assert.equal(sim.s.cash, c0 - 250);
  assert.equal((sim.s.today.service || 0) - svc0, 250); assert.equal(t.assigned, 'vendor');
});
await test('save and reload partway through a clean-out keep the task, booking and hours, and both runs finish identically', async () => {
  const sim = makeScenario('campus', 13); sim.dispatch({ type: 'hire', role: 'porter' }); const t = endJob(sim, 'auction');
  for (let m = 0; m < 3 * 1440 && !(t.workBooked && (t.prog || 0) > 0); m++) step(sim, 1);
  assert.ok(t.workBooked, 'task underway before saving');
  const back = await reload(sim); const bt = back.s.tasks.find((x) => x.id === t.id);
  assert.ok(bt); assert.equal(bt.work, 450); assert.equal(bt.workBooked, t.workBooked); assert.equal(bt.prog ?? null, t.prog ?? null);
  assert.equal(JSON.stringify(back.s.staff.map((x) => [x.id, x.workUsed, x.workDay])), JSON.stringify(sim.s.staff.map((x) => [x.id, x.workUsed, x.workDay])));
  step(sim, 2 * 1440); step(back, 2 * 1440);
  assert.equal(sim.s.tasks.some((x) => x.id === t.id), false); assert.equal(back.s.tasks.some((x) => x.id === t.id), false);
  assert.equal(Math.round(back.s.cash * 100), Math.round(sim.s.cash * 100)); assert.equal(JSON.stringify(back.s.days.at(-1).crew), JSON.stringify(sim.s.days.at(-1).crew));
});
await test('existing scenarios, Maple and the other two new scenarios keep exact base make-ready work (150 ordinary, 300 auction)', async () => {
  const sims = [...OLD.map((id) => [id, makeScenario(id, 7)]), ['maple', makeMaple(11)], ['ratereset', makeScenario('ratereset', 11)], ['freightlift', makeScenario('freightlift', 11)]];
  for (const [id, sim] of sims) {
    for (const b of [150, 300, 450, 900]) assert.equal(turnoverWork(sim.s, b), b, id + ' ' + b);
    if (!Object.keys(sim.s.leases).length) continue;
    assert.equal(endJob(sim, 'moveout').work, 150, id + ' moveout'); assert.equal(endJob(sim, 'auction').work, 300, id + ' auction');
  }
});
console.log(`ALL PASS: ${n} Campus turnover capacity groups; physical Safari NOT TESTED`);
