// Daily worker-capacity and first-facility staffing economics.
import { makeMaple } from '../../js/maple.js';
import { ROLES } from '../../js/data.js';

let ok = true;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : ''));
  ok &&= !!cond;
};

const sim = makeMaple(5150), s = sim.s;
s.tut = { on: false, beat: 99, flags: {}, done: true };
const owner = s.staff.find((x) => x.role === 'owner');

check('Owner begins with 8 work hours', sim.workRemaining(owner) === 8, String(sim.workRemaining(owner)));

const seeded = s.tasks.find((t) => t.type === 'makeready');
const r1 = sim.dispatch({ type: 'ownerTask', task: seeded.id });
check('2.5h make-ready can be assigned', r1.ok && sim.taskHours(seeded) === 2.5);
check('Owner capacity drops to 5.5h', sim.workRemaining(owner) === 5.5, String(sim.workRemaining(owner)));

const spare = sim.objs('unit').filter((u) => u.id !== seeded.obj).slice(0, 3);
const mr1 = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare[0].id, label: 'Test make-ready 1', work: 150 });
const r2 = sim.dispatch({ type: 'ownerTask', task: mr1.id });
check('second 2.5h make-ready can queue', r2.ok && sim.taskHours(mr1) === 2.5);
check('Queued work reserves capacity', sim.workRemaining(owner) === 3, String(sim.workRemaining(owner)));

const mr2 = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare[1].id, label: 'Test make-ready 2', work: 150 });
const r3 = sim.dispatch({ type: 'ownerTask', task: mr2.id });
check('third 2.5h make-ready can queue', r3.ok);
check('Owner now has 0.5h left', sim.workRemaining(owner) === 0.5, String(sim.workRemaining(owner)));

const mr3 = sim.addTask({ type: 'makeready', need: 'makeready', obj: spare[2].id, label: 'Test make-ready 3', work: 150 });
const r4 = sim.dispatch({ type: 'ownerTask', task: mr3.id });
check('work exceeding remaining Owner capacity is refused', !r4.ok && /0.5h available/.test(r4.msg), r4.msg);

s.t = 1440; sim.newDay();
check('Owner refreshes to 8h on new game day', sim.workRemaining(owner) === 8, String(sim.workRemaining(owner)));

check('Porter wage supports first-facility hire', ROLES.porter.wage === 12.5);
check('Tech wage supports first-facility hire', ROLES.tech.wage === 20);
check('Clerk wage supports first-facility hire', ROLES.clerk.wage === 15);
check('Manager wage supports first-facility hire', ROLES.manager.wage === 25);

const hire = sim.dispatch({ type: 'hire', role: 'porter' });
const porter = s.staff.find((x) => x.role === 'porter');
check('Porter can be hired', hire.ok && !!porter);
check('Porter adds independent 8h task capacity', sim.workRemaining(porter) === 8, porter ? String(sim.workRemaining(porter)) : 'missing');

console.log(ok ? 'ALL PASS' : 'SOME FAILED');
if (!ok) process.exitCode = 1;
