// Staff-first dispatch regression: hired workers take eligible routine work before the Owner.
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';

let ok = true;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : ''));
  ok &&= !!cond;
};

function readySim(seed) {
  const sim = makeMaple(seed);
  sim.s.tut = { on: false, beat: 99, flags: {}, done: true };
  return sim;
}

// Direct player work request: Porter gets first refusal and Owner capacity stays untouched.
{
  const sim = readySim(9201), s = sim.s;
  const owner = s.staff.find((x) => x.role === 'owner');
  const seeded = s.tasks.find((t) => t.type === 'makeready');
  const hired = sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  const r = sim.dispatch({ type: 'ownerTask', task: seeded.id });

  check('Porter hire succeeds', hired.ok && !!porter);
  check('Eligible work delegates to Porter before Owner', r.ok && seeded.assigned === porter.id, r.msg);
  check('Delegation preserves Owner daily capacity', sim.workRemaining(owner) === 8, String(sim.workRemaining(owner)));
  check('Delegated work reserves Porter capacity', sim.workRemaining(porter) === 5.5, String(sim.workRemaining(porter)));

  const spare = sim.objs('unit').find((u) => u.id !== seeded.obj);
  const second = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Second make-ready', work: 150 });
  const r2 = sim.dispatch({ type: 'ownerTask', task: second.id });
  const porterAg = s.agents.find((a) => a.sid === porter.id);
  check('Busy Porter queues another eligible job', r2.ok && second.assigned === porter.id && second.queued && porterAg.queue.includes(second.id), r2.msg);
  check('Queued delegation still leaves Owner free', sim.workRemaining(owner) === 8, String(sim.workRemaining(owner)));
  check('Queued delegation reserves remaining Porter capacity', sim.workRemaining(porter) === 3, String(sim.workRemaining(porter)));
}

// Existing Owner queues are rebalanced when a qualified hire becomes available.
{
  const sim = readySim(9202), s = sim.s;
  const owner = s.staff.find((x) => x.role === 'owner');
  const ownerAg = s.agents.find((a) => a.sid === owner.id);
  const first = s.tasks.find((t) => t.type === 'makeready');
  const spare = sim.objs('unit').find((u) => u.id !== first.obj);
  const second = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Queued owner make-ready', work: 150 });

  sim.dispatch({ type: 'ownerTask', task: first.id });
  sim.dispatch({ type: 'ownerTask', task: second.id });
  check('Second job begins in Owner queue before hire', second.assigned === owner.id && second.queued);

  sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  sim.updateStaff(ownerAg);

  check('Unstarted Owner queue rebalances to Porter', second.assigned === porter.id, String(second.assigned));
  check('Rebalance refunds queued Owner capacity', sim.workRemaining(owner) === 5.5, String(sim.workRemaining(owner)));
  check('Rebalanced work consumes Porter capacity', sim.workRemaining(porter) === 5.5, String(sim.workRemaining(porter)));
}

// With no qualified employee, Owner remains a valid explicit fallback.
{
  const sim = readySim(9203), s = sim.s;
  const owner = s.staff.find((x) => x.role === 'owner');
  const seeded = s.tasks.find((t) => t.type === 'makeready');
  const r = sim.dispatch({ type: 'ownerTask', task: seeded.id });
  check('Owner still handles work when no qualified staff can cover', r.ok && seeded.assigned === owner.id, r.msg);
  check('Owner fallback still charges daily capacity', sim.workRemaining(owner) === 5.5, String(sim.workRemaining(owner)));
}

// Exhaust Porter capacity: further eligible work must fall back to Owner rather than deadlock.
{
  const sim = readySim(9204), s = sim.s;
  const owner = s.staff.find((x) => x.role === 'owner');
  sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  const seeded = s.tasks.find((t) => t.type === 'makeready');
  sim.dispatch({ type: 'ownerTask', task: seeded.id });
  const units = sim.objs('unit').filter((u) => u.id !== seeded.obj).slice(0, 3);
  const q1 = sim.addTask({ type: 'makeready', need: 'makeready', obj: units[0].id, label: 'Capacity 2', work: 150 });
  const q2 = sim.addTask({ type: 'makeready', need: 'makeready', obj: units[1].id, label: 'Capacity 3', work: 150 });
  const fallback = sim.addTask({ type: 'makeready', need: 'makeready', obj: units[2].id, label: 'Owner fallback after Porter full', work: 60 });
  sim.dispatch({ type: 'ownerTask', task: q1.id });
  sim.dispatch({ type: 'ownerTask', task: q2.id });
  check('Porter capacity is exhausted below another 1h job', sim.workRemaining(porter) === 0.5, String(sim.workRemaining(porter)));
  const r = sim.dispatch({ type: 'ownerTask', task: fallback.id });
  check('Owner becomes fallback when Porter lacks capacity', r.ok && fallback.assigned === owner.id, r.msg);
}

// Firing a worker with queued work must release and refund every queued task.
{
  const sim = readySim(9205), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  const first = s.tasks.find((t) => t.type === 'makeready');
  sim.dispatch({ type: 'ownerTask', task: first.id });
  const spare = sim.objs('unit').find((u) => u.id !== first.obj);
  const queued = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Queued before firing', work: 150 });
  sim.dispatch({ type: 'ownerTask', task: queued.id });
  const fired = sim.dispatch({ type: 'fire', id: porter.id });
  check('Porter can be fired while work is queued', fired.ok);
  check('Fired staff queued task is released', queued.assigned == null && !queued.queued && queued.workBooked == null);
}

// Non-owner staff must not start queued work after the staff shift ends.
{
  const sim = readySim(9206), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  const ag = s.agents.find((a) => a.sid === porter.id);
  const first = s.tasks.find((t) => t.type === 'makeready');
  sim.dispatch({ type: 'ownerTask', task: first.id });
  const spare = sim.objs('unit').find((u) => u.id !== first.obj);
  const queued = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Wait for next shift', work: 150 });
  sim.dispatch({ type: 'ownerTask', task: queued.id });
  ag.task = null; ag.st = 'idle'; first.assigned = null;
  s.t = 20 * 60 + 5;
  sim.updateStaff(ag);
  check('Queued Porter work waits outside staff shift', queued.queued && ag.task !== queued.id && ag.queue.includes(queued.id));
}

// Save/resume preserves active, queued and reassigned reservations exactly.
{
  const sim = readySim(9207), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  const first = s.tasks.find((t) => t.type === 'makeready');
  sim.dispatch({ type: 'ownerTask', task: first.id });
  const spare = sim.objs('unit').find((u) => u.id !== first.obj);
  const queued = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Saved Porter queue', work: 150 });
  sim.dispatch({ type: 'ownerTask', task: queued.id });
  const beforeOwner = sim.workRemaining(s.staff.find((x) => x.role === 'owner'));
  const beforePorter = sim.workRemaining(porter);
  const resumed = new Sim(JSON.parse(JSON.stringify(s)));
  const rp = resumed.s.staff.find((x) => x.role === 'porter');
  const rq = resumed.s.tasks.find((x) => x.id === queued.id);
  check('Save/resume preserves Porter active/queued assignment', rq.assigned === rp.id && rq.queued);
  check('Save/resume preserves Owner capacity', resumed.workRemaining(resumed.s.staff.find((x) => x.role === 'owner')) === beforeOwner);
  check('Save/resume preserves Porter reserved capacity', resumed.workRemaining(rp) === beforePorter);
}

// Save/resume after Owner fallback work preserves the Owner reservation.
{
  const sim = readySim(9208), s = sim.s;
  const owner = s.staff.find((x) => x.role === 'owner');
  const seeded = s.tasks.find((t) => t.type === 'makeready');
  sim.dispatch({ type: 'ownerTask', task: seeded.id });
  const before = sim.workRemaining(owner);
  const resumed = new Sim(JSON.parse(JSON.stringify(s)));
  const ro = resumed.s.staff.find((x) => x.role === 'owner');
  const rt = resumed.s.tasks.find((x) => x.id === seeded.id);
  check('Save/resume preserves Owner fallback assignee', rt.assigned === ro.id);
  check('Save/resume preserves Owner fallback reservation', resumed.workRemaining(ro) === before, String(resumed.workRemaining(ro)));
}

// Save/resume immediately after Owner-queue migration keeps the refunded Owner and reserved Porter totals.
{
  const sim = readySim(9209), s = sim.s;
  const owner = s.staff.find((x) => x.role === 'owner');
  const ownerAg = s.agents.find((a) => a.sid === owner.id);
  const first = s.tasks.find((t) => t.type === 'makeready');
  const spare = sim.objs('unit').find((u) => u.id !== first.obj);
  const second = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Migrated then saved', work: 150 });
  sim.dispatch({ type: 'ownerTask', task: first.id });
  sim.dispatch({ type: 'ownerTask', task: second.id });
  sim.dispatch({ type: 'hire', role: 'porter' });
  sim.updateStaff(ownerAg);
  const porter = s.staff.find((x) => x.role === 'porter');
  const ownerLeft = sim.workRemaining(owner), porterLeft = sim.workRemaining(porter);
  const resumed = new Sim(JSON.parse(JSON.stringify(s)));
  const ro = resumed.s.staff.find((x) => x.role === 'owner'), rp = resumed.s.staff.find((x) => x.role === 'porter');
  const rt = resumed.s.tasks.find((x) => x.id === second.id);
  check('Save/resume preserves migrated staff assignee', rt.assigned === rp.id);
  check('Save/resume does not double-refund Owner migration', resumed.workRemaining(ro) === ownerLeft, String(resumed.workRemaining(ro)));
  check('Save/resume does not double-reserve Porter migration', resumed.workRemaining(rp) === porterLeft, String(resumed.workRemaining(rp)));
}

// Tech takes both simple and complex repair work before Owner/vendor; Owner remains unable to do complex repair.
{
  const sim = readySim(9210), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'tech' });
  const tech = s.staff.find((x) => x.role === 'tech');
  const owner = s.staff.find((x) => x.role === 'owner');
  const light = sim.objs('light')[0]; light.cond = 0.1;
  const simple = sim.ensureRepairTask(light);
  const r1 = sim.dispatch({ type: 'ownerTask', task: simple.id });
  check('Tech receives simple repair before Owner', r1.ok && simple.assigned === tech.id, r1.msg);
  check('Simple repair delegation preserves Owner capacity', sim.workRemaining(owner) === 8, String(sim.workRemaining(owner)));

  const elevator = sim.objs('elevator')[0];
  if (elevator) {
    elevator.cond = 0.1;
    const complex = sim.ensureRepairTask(elevator);
    const r2 = sim.dispatch({ type: 'ownerTask', task: complex.id });
    check('Tech receives complex repair Owner cannot perform', r2.ok && complex.assigned === tech.id, r2.msg);
  }
}

// Vendor takeover releases a staff reservation and becomes the sole assignee.
{
  const sim = readySim(9211), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'tech' });
  const tech = s.staff.find((x) => x.role === 'tech');
  const light = sim.objs('light')[0]; light.cond = 0.1;
  const task = sim.ensureRepairTask(light);
  sim.dispatch({ type: 'ownerTask', task: task.id });
  const before = sim.workRemaining(tech);
  const r = sim.dispatch({ type: 'callVendor', task: task.id });
  check('Vendor can take over assigned repair', r.ok && task.assigned === 'vendor');
  check('Vendor takeover refunds staff reservation once', sim.workRemaining(tech) > before && task.workBooked == null, String(sim.workRemaining(tech)));
}

// Cart policy off means Porter is not considered for cart work, leaving Owner as the explicit fallback.
{
  const sim = readySim(9212), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'porter' });
  const porter = s.staff.find((x) => x.role === 'porter');
  s.policies.porterCarts = false;
  const cart = s.carts[0]; cart.st = 'stranded'; cart.since = s.t - 60;
  sim.generateTasks();
  const task = s.tasks.find((x) => x.type === 'carts' && x.cart === cart.id);
  const r = task && sim.dispatch({ type: 'ownerTask', task: task.id });
  const owner = s.staff.find((x) => x.role === 'owner');
  check('Cart policy off prevents Porter assignment', !!task && task.assigned === owner.id && task.assigned !== porter.id, r ? r.msg : 'no task');
}

// With multiple qualified Porters, dispatch chooses an available worker without double booking.
{
  const sim = readySim(9213), s = sim.s;
  sim.dispatch({ type: 'hire', role: 'porter' });
  sim.dispatch({ type: 'hire', role: 'porter' });
  const [p1, p2] = s.staff.filter((x) => x.role === 'porter');
  const first = s.tasks.find((t) => t.type === 'makeready');
  sim.dispatch({ type: 'ownerTask', task: first.id });
  const spare = sim.objs('unit').find((u) => u.id !== first.obj);
  const second = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare.id, label: 'Second Porter', work: 150 });
  sim.dispatch({ type: 'ownerTask', task: second.id });
  check('Two eligible jobs can split across two Porters', first.assigned !== second.assigned && [p1.id,p2.id].includes(first.assigned) && [p1.id,p2.id].includes(second.assigned));
}

console.log(ok ? 'ALL PASS' : 'SOME FAILED');
if (!ok) process.exitCode = 1;
