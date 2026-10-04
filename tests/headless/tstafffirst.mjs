// Staff-first dispatch regression: hired workers take eligible routine work before the Owner.
import { makeMaple } from '../../js/maple.js';

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

console.log(ok ? 'ALL PASS' : 'SOME FAILED');
if (!ok) process.exitCode = 1;
