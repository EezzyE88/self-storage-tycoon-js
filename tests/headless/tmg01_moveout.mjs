// MG-01 Move-Out Turnaround integration (native Sim): genuine eligible jobs only, featured cadence (one per five
// genuine move-outs, per property), exclusive Owner claim, safe leave and reload recovery, exactly-once completion
// through finishTask, normal Owner labor accounting, staff behavior and economy untouched. No rendered/Safari claim.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { WORK, ROLES } from '../../js/data.js';
import { moveOutCheck, MG01_CADENCE } from '../../js/moveout.js';
let passes = 0;
const test = (label, fn) => { fn(); passes++; console.log('PASS', label); };
function setup() {
  const sim = makeMaple(17); sim.s.tut = { on: false, done: true, flags: {} }; sim.s.lesson = null; sim.s.speed = 0;
  sim.s.t = 40 * 1440 + 9 * 60; sim.s.tasks = []; // Day 41, 9 AM: a fresh Owner day; no unrelated jobs
  return sim;
}
const leased = (sim) => Object.values(sim.s.leases).map((L) => L).filter((L) => sim.s.objects[L.unit]);
const owner = (sim) => sim.s.staff.find((x) => x.role === 'owner');
const ownerAg = (sim) => sim.s.agents.find((a) => a.sid === owner(sim).id);
function moveOut(sim, why = 'moveout') {
  const L = leased(sim).find((L) => !sim.s.tasks.some((t) => t.obj === L.unit)); assert.ok(L, 'a leased unit to vacate');
  sim.endLease(L, why); return sim.s.tasks.find((t) => t.type === 'makeready' && t.obj === L.unit);
}
const econ = (s) => JSON.stringify({ cash: s.cash, ledger: s.ledger.length, rng: s.rngS, rep: s.rep, reputation: s.reputation, speed: s.speed, leases: Object.keys(s.leases).length, finance: s.finance });

test('legacy state: constructor creates no MG-01 state and changes nothing', () => {
  const sim = setup(), before = JSON.stringify(sim.s); const again = new Sim(JSON.parse(before));
  assert.equal(again.s.mg01, undefined); assert.equal(JSON.stringify(again.s.tasks), JSON.stringify(JSON.parse(before).tasks));
});
test(`cadence: first genuine move-out featured, then one per ${MG01_CADENCE}; auction clean-outs never counted`, () => {
  const sim = setup(), flags = [];
  for (let i = 0; i < 11; i++) {
    const t = moveOut(sim); flags.push(!!t.mg01Featured);
    if (i === 2) { const c = moveOut(sim, 'auction'); assert.equal(c.total, WORK.makeready * 2); assert.equal(c.mg01Featured, undefined); assert.equal(moveOutCheck(sim, c).ok, false); }
  }
  assert.deepEqual(flags.map((f, i) => f ? i + 1 : 0).filter(Boolean), [1, 6, 11]);
  assert.equal(sim.s.mg01.eligible, 11); assert.equal(sim.s.mg01.featuredAt, 11);
});
test('guided campaign or lesson: no featured offer, no access; the due slot waits for the next free-play job', () => {
  const sim = setup(); sim.s.tut = { on: true, done: false, beat: 3, flags: {} };
  const a = moveOut(sim); assert.equal(a.mg01Featured, undefined); assert.equal(moveOutCheck(sim, a).why, 'guided');
  sim.s.tut = { on: false, done: true, flags: {} }; sim.s.lesson = { id: 'x' }; assert.equal(moveOutCheck(sim, a).why, 'guided'); sim.s.lesson = null;
  const b = moveOut(sim); assert.equal(b.mg01Featured, true); assert.equal(sim.s.mg01.eligible, 2); assert.equal(sim.s.mg01.featuredAt, 2);
});
test('per-property cadence: each property keeps its own count, and it survives a save round trip', () => {
  const a = setup(), b = setup(); moveOut(a); moveOut(a); moveOut(b);
  assert.equal(a.s.mg01.eligible, 2); assert.equal(b.s.mg01.eligible, 1);
  const back = new Sim(JSON.parse(JSON.stringify(a.s))); assert.deepEqual(back.s.mg01, a.s.mg01);
  const bad = JSON.parse(JSON.stringify(a.s)); bad.mg01 = { v: 1, eligible: -3, featuredAt: 99, sessions: 'x', done: 1.5 };
  assert.deepEqual(new Sim(bad).s.mg01, { v: 1, eligible: 0, featuredAt: null, sessions: 0, done: 0 });
  const junk = JSON.parse(JSON.stringify(a.s)); junk.mg01 = [1]; assert.equal(new Sim(junk).s.mg01, undefined);
});
test('eligibility: only available, unclaimed jobs on a vacant unit with Owner hours and a route', () => {
  const sim = setup(), t = moveOut(sim);
  assert.equal(moveOutCheck(sim, t).ok, true);
  for (const [k, v] of [['assigned', owner(sim).id], ['queued', true], ['vendor', 99], ['prog', 0.2], ['unreachable', sim.s.t]]) { const old = t[k]; t[k] = v; assert.equal(moveOutCheck(sim, t).ok, false, k); t[k] = old; }
  owner(sim).workDay = sim.day; owner(sim).workUsed = 6; assert.equal(moveOutCheck(sim, t).why, 'hours'); assert.equal(sim.dispatch({ type: 'mg01Start', task: t.id }).ok, false); owner(sim).workUsed = 0;
  const u = sim.s.objects[t.obj]; u.commercial = 'ready'; assert.equal(moveOutCheck(sim, t).why, 'unit'); u.commercial = 'unready';
  assert.equal(moveOutCheck(sim, { ...t }).why, 'job');
  assert.equal(moveOutCheck(sim, t).ok, true);
});
test('start: exclusive Owner claim with normal hours booked; staff, queue, vendor and delegation refused', () => {
  const sim = setup(), t = moveOut(sim), ow = owner(sim), left = sim.workRemaining(ow), e0 = econ(sim.s), agBefore = JSON.stringify(ownerAg(sim));
  const r = sim.dispatch({ type: 'mg01Start', task: t.id }); assert.equal(r.ok, true, r.msg);
  assert.equal(t.assigned, ow.id); assert.equal(sim.workRemaining(ow), left - sim.taskHours(t)); assert.equal(t.workBooked, ow.id);
  assert.equal(JSON.stringify(ownerAg(sim)), agBefore, 'Owner walk/queue untouched');
  assert.equal(sim.dispatch({ type: 'mg01Start', task: t.id }).ok, false);
  for (const a of [{ type: 'ownerTask', task: t.id, forceOwner: true }, { type: 'ownerMakeReady', unit: t.obj, forceOwner: true }, { type: 'callVendor', task: t.id }, { type: 'delegateTask', task: t.id }]) assert.equal(sim.dispatch(a).ok, false, a.type);
  sim.dispatch({ type: 'hire', role: 'porter' }); sim.s.speed = 1;
  for (let i = 0; i < 240; i++) { sim.step(); sim.events.length = 0; }
  assert.ok(sim.s.tasks.includes(t)); assert.equal(t.assigned, ow.id); assert.equal(t.prog, 0);
  assert.ok(!sim.s.agents.some((a) => a.task === t.id || (a.queue || []).includes(t.id)), 'nobody walks to a claimed job');
  void e0;
});
test('leave: job returned unchanged, hours refunded, nothing else moved; Porter then takes it normally', () => {
  const sim = setup(), t = moveOut(sim), ow = owner(sim), left = sim.workRemaining(ow), snap = JSON.stringify(t), e0 = econ(sim.s);
  const { token } = sim.dispatch({ type: 'mg01Start', task: t.id });
  assert.equal(sim.dispatch({ type: 'mg01Leave', token }).ok, true);
  assert.equal(sim.workRemaining(ow), left); assert.equal(t.assigned, null); assert.equal(t.mg01Claim, undefined);
  const j = JSON.parse(JSON.stringify(t)), o = JSON.parse(snap); delete j.workBooked; delete j.workBookedDay; delete j.workHours; delete j.queued; delete o.queued;
  assert.deepEqual(j, o); assert.equal(econ(sim.s), e0); assert.equal(sim.dispatch({ type: 'mg01Leave', token }).ok, false);
  sim.dispatch({ type: 'hire', role: 'porter' }); sim.s.speed = 1; let taken = false;
  for (let i = 0; i < 120 && !taken; i++) { sim.step(); sim.events.length = 0; taken = sim.s.agents.some((a) => a.role === 'porter' && a.task === t.id); }
  assert.ok(taken, 'unclaimed job is picked up by the Porter as before');
});
test('finish: exactly once through finishTask; rent-ready, Owner credited with standard hours, no money/RNG/Pause change', () => {
  const sim = setup(), t = moveOut(sim), ow = owner(sim), u = sim.s.objects[t.obj];
  ownerAg(sim).task = null; const left = sim.workRemaining(ow);
  const { token } = sim.dispatch({ type: 'mg01Start', task: t.id }); sim.events.length = 0; const e0 = econ(sim.s), agBefore = JSON.stringify(ownerAg(sim));
  const r = sim.dispatch({ type: 'mg01Finish', token }); assert.equal(r.ok, true, r.msg);
  assert.equal(u.commercial, 'ready'); assert.ok(!sim.s.tasks.includes(t)); assert.ok(sim.s.milestones.first_makeready);
  assert.ok(sim.events.some((e) => e.type === 'rentready' && e.unit === u.id)); assert.ok(sim.events.some((e) => e.type === 'mg01_done'));
  assert.equal(sim.workRemaining(ow), left - sim.taskHours({ total: WORK.makeready }), 'hours stay used');
  const day = sim.s.workReport.days.find((d) => d.day === sim.day); assert.deepEqual(day.roles.owner, { jobs: 1, hours: sim.taskHours({ total: WORK.makeready }) });
  assert.equal(econ(sim.s), e0); assert.equal(JSON.stringify(ownerAg(sim)), agBefore); assert.equal(sim.s.milestones.first_delegated, undefined);
  assert.equal(sim.dispatch({ type: 'mg01Finish', token }).ok, false); assert.equal(sim.s.workReport.days.find((d) => d.day === sim.day).roles.owner.jobs, 1);
  assert.equal(sim.dispatch({ type: 'mg01Leave', token }).ok, false); assert.equal(sim.workRemaining(ow), left - 2.5);
  assert.equal(sim.s.mg01.done, 1); assert.equal(sim.s.mg01.sessions, 1); assert.equal(ROLES.owner.wage, 0);
});
test('finish while the Owner is busy elsewhere leaves that walk and queue alone', () => {
  const sim = setup(), a = moveOut(sim), b = moveOut(sim), ag = ownerAg(sim);
  assert.equal(sim.dispatch({ type: 'ownerTask', task: b.id, forceOwner: true }).ok, true); const before = JSON.stringify(ag);
  const { token } = sim.dispatch({ type: 'mg01Start', task: a.id }); assert.ok(token);
  assert.equal(sim.dispatch({ type: 'mg01Finish', token }).ok, true); assert.equal(JSON.stringify(ag), before); assert.ok(sim.s.tasks.includes(b));
});
test('interruption: a saved claim is released on load with hours refunded; the job is available again', () => {
  const sim = setup(), t = moveOut(sim), ow = owner(sim), left = sim.workRemaining(ow);
  const { token } = sim.dispatch({ type: 'mg01Start', task: t.id }); const saved = JSON.parse(JSON.stringify(sim.s));
  const back = new Sim(saved), bt = back.s.tasks.find((x) => x.id === t.id), bo = back.s.staff.find((x) => x.role === 'owner');
  assert.equal(bt.mg01Claim, undefined); assert.equal(bt.assigned, null); assert.equal(back.workRemaining(bo), left); assert.equal(moveOutCheck(back, bt).ok, true);
  assert.equal(back.dispatch({ type: 'mg01Finish', token }).ok, false, 'stale session cannot complete after reload');
  assert.equal(back.s.objects[t.obj].commercial, 'unready');
  // A claim saved on an earlier day releases without touching that day's (already reset) capacity.
  const old = JSON.parse(JSON.stringify(sim.s)); old.t += 1440; const nx = new Sim(old), no = nx.s.staff.find((x) => x.role === 'owner');
  assert.equal(nx.workRemaining(no), ROLES.owner.workHours); assert.equal(nx.s.tasks.find((x) => x.id === t.id).assigned, null);
});
test('a job that changes underneath a session is returned, not completed', () => {
  const sim = setup(), t = moveOut(sim), ow = owner(sim), left = sim.workRemaining(ow);
  const { token } = sim.dispatch({ type: 'mg01Start', task: t.id }); sim.s.objects[t.obj].lease = 12345;
  assert.equal(sim.dispatch({ type: 'mg01Finish', token }).ok, false); assert.ok(sim.s.tasks.includes(t)); assert.equal(t.assigned, null); assert.equal(sim.workRemaining(ow), left);
});
console.log(`${passes} MG-01 move-out focused checks passed`);
