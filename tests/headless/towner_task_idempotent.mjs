// Owner repair requests are idempotent: asking the Owner again for work the Owner already holds
// (assigned, queued, or actively working) succeeds without changing progress, queue order,
// capacity, cost, saves or Pause. Genuine conflicts still fail.
import { makeMaple } from '../../js/maple.js';

let ok = true, groups = 0;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : ''));
  ok &&= !!cond;
};
const group = (name, fn) => { const before = ok; fn(); if (ok === before) { groups++; console.log(`GROUP ${name} passed`); } };

function readySim(seed) {
  const sim = makeMaple(seed), s = sim.s;
  sim.s.tut = { on: false, beat: 99, flags: {}, done: true };
  s.policies.ownerChores = false; // keep the Owner from picking up chores on their own
  s.speed = 0; // manual Pause
  return sim;
}
const ownerOf = (sim) => { const owner = sim.s.staff.find((x) => x.role === 'owner'); return { owner, ag: sim.s.agents.find((g) => g.sid === owner.id) }; };
const brokenLights = (sim, n) => {
  const lights = sim.objs('light').filter((l) => l.cstate === 'operating' || l.cstate == null).slice(0, n);
  for (const l of lights) l.cond = 0.1;
  return lights;
};
// Everything an idempotent repeat must leave untouched.
const snap = (sim) => JSON.stringify({ tasks: sim.s.tasks, agents: sim.s.agents.filter((g) => g.kind === 'staff'), staff: sim.s.staff, cash: sim.s.cash, ledger: sim.s.ledger, speed: sim.s.speed, t: sim.s.t, saveSeq: sim.s.saveSeq });
const lightRequest = (sim, l) => {
  const c = { id: sim.id(), t: sim.s.t, ttl: 600, key: 'light' + l.id, obj: l.id, text: 'The light near my unit is out.',
    actions: [{ label: 'Assign repair', action: { type: 'ownerTaskFor', obj: l.id } }, { label: 'Call an electrician ($250)', action: { type: 'cv', op: 'vendorFor', obj: l.id } }, { label: 'Log it for later' }] };
  sim.s.convos.push(c); return c;
};

group('normal unassigned assignment', () => {
  const sim = readySim(9301), s = sim.s, { owner, ag } = ownerOf(sim);
  const [L] = brokenLights(sim, 1), cash = s.cash, left = sim.workRemaining(owner);
  const r = sim.dispatch({ type: 'ownerTaskFor', obj: L.id });
  const t = s.tasks.find((x) => x.obj === L.id && x.type === 'repair');
  check('Unassigned repair is accepted', r.ok && !r.already, r.msg);
  check('Owner starts the repair', ag.task === t.id && t.assigned === owner.id && ag.st === 'walk');
  check('Owner capacity is charged once', sim.workRemaining(owner) === left - sim.taskHours(t), `${left} -> ${sim.workRemaining(owner)}`);
  check('Owner repair costs no cash', s.cash === cash);
  check('Pause is unchanged', s.speed === 0);
});

group('already-assigned Owner', () => {
  const sim = readySim(9302), s = sim.s, { owner, ag } = ownerOf(sim);
  const [L] = brokenLights(sim, 1);
  sim.dispatch({ type: 'ownerTaskFor', obj: L.id });
  const t = s.tasks.find((x) => x.obj === L.id && x.type === 'repair'), count = s.tasks.length, before = snap(sim);
  check('Owner holds the task before work begins', ag.task === t.id && ag.st === 'walk' && !t.prog);
  const r = sim.dispatch({ type: 'ownerTaskFor', obj: L.id });
  check('Repeat request succeeds', r.ok && r.already, r.msg);
  check('No duplicate task', s.tasks.length === count && s.tasks.filter((x) => x.obj === L.id).length === 1);
  check('State is unchanged (progress, queue, capacity, cash, Pause)', snap(sim) === before);
  const r2 = sim.dispatch({ type: 'ownerTask', task: t.id, forceOwner: true });
  check('Explicit Owner choice on held task also succeeds unchanged', r2.ok && r2.already && snap(sim) === before, r2.msg);
});

group('actively-working Owner and tenant request', () => {
  const sim = readySim(9303), s = sim.s, { owner, ag } = ownerOf(sim);
  const [L] = brokenLights(sim, 1);
  sim.dispatch({ type: 'ownerTaskFor', obj: L.id });
  const t = s.tasks.find((x) => x.obj === L.id && x.type === 'repair');
  s.speed = 1;
  for (let i = 0; i < 5000 && !(ag.st === 'work' && ag.task === t.id); i++) sim.step();
  s.speed = 0;
  check('Owner reaches the light and is working', ag.st === 'work' && ag.task === t.id, ag.st);
  const c = lightRequest(sim, L), before = snap(sim), cash = s.cash, used = owner.workUsed;
  const r = sim.dispatch({ type: 'convo', id: c.id, i: 0 });
  check('Assign repair answers the request', r.ok, r.msg);
  check('Request closes', !s.convos.some((x) => x.id === c.id));
  check('Working state, progress and capacity unchanged', snap(sim) === before && owner.workUsed === used && s.cash === cash);
  check('Owner stays on the task', ag.task === t.id && ag.st === 'work');
});

group('queued Owner', () => {
  const sim = readySim(9304), s = sim.s, { owner, ag } = ownerOf(sim);
  const [A, B, C] = brokenLights(sim, 3);
  sim.dispatch({ type: 'ownerTaskFor', obj: A.id });
  sim.dispatch({ type: 'ownerTaskFor', obj: B.id });
  sim.dispatch({ type: 'ownerTaskFor', obj: C.id });
  const tb = s.tasks.find((x) => x.obj === B.id && x.type === 'repair');
  check('Second and third repairs queue behind the first', ag.queue.length === 2 && ag.queue[0] === tb.id && tb.queued && tb.assigned === owner.id, JSON.stringify(ag.queue));
  const order = [...ag.queue], before = snap(sim);
  const r = sim.dispatch({ type: 'ownerTaskFor', obj: B.id });
  check('Repeat request for queued task succeeds', r.ok && r.already, r.msg);
  check('Queue order unchanged', JSON.stringify(ag.queue) === JSON.stringify(order));
  check('State is unchanged (no extra capacity charge, no cash)', snap(sim) === before);
  const c = lightRequest(sim, B), r2 = sim.dispatch({ type: 'convo', id: c.id, i: 0 });
  check('Tenant request for queued light closes', r2.ok && !s.convos.some((x) => x.id === c.id), r2.msg);
  check('Still unchanged after answering', JSON.stringify(ag.queue) === JSON.stringify(order) && snap(sim) === before);
});

group('non-Owner and conflicting assignment', () => {
  const sim = readySim(9305), s = sim.s, { owner, ag } = ownerOf(sim);
  s.cash = 100000;
  const [L, V] = brokenLights(sim, 2);
  sim.dispatch({ type: 'hire', role: 'tech' });
  const tech = s.staff.find((x) => x.role === 'tech');
  const rt = sim.dispatch({ type: 'delegateTaskFor', obj: L.id });
  const t = s.tasks.find((x) => x.obj === L.id && x.type === 'repair');
  check('Tech holds the repair', rt.ok && t.assigned === tech.id, rt.msg);
  const c = lightRequest(sim, L), before = snap(sim);
  const r = sim.dispatch({ type: 'ownerTaskFor', obj: L.id, forceOwner: true });
  check('Owner request for Tech-held work still fails', !r.ok && /someone else/.test(r.msg), r.msg);
  const rc = sim.dispatch({ type: 'convo', id: c.id, i: 0 });
  check('Request stays open on genuine conflict', !rc.ok && s.convos.some((x) => x.id === c.id), rc.msg);
  check('Conflict changes nothing', snap(sim) === before && !ag.task);
  const tv = sim.ensureRepairTask(V); const rv = sim.dispatch({ type: 'callVendor', task: tv.id });
  check('Vendor booked for second light', rv.ok && !!tv.vendor, rv.msg);
  const r3 = sim.dispatch({ type: 'ownerTaskFor', obj: V.id });
  check('Owner request for vendor-booked work still fails', !r3.ok && /vendor/i.test(r3.msg), r3.msg);
  check('Owner not sent', !ag.task && !(ag.queue || []).length && sim.workRemaining(owner) === 8);
});

console.log(ok ? `${groups} owner-task idempotency groups passed` : 'SOME FAILED');
if (!ok) process.exitCode = 1;
