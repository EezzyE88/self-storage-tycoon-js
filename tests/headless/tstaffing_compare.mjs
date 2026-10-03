// Staffing hardening: office workload uses Owner capacity unless a Clerk covers it,
// and 90-day comparison keeps staffing cost/throughput consequences visible.
import { makeMaple } from '../../js/maple.js';
import { ROLES } from '../../js/data.js';

let ok = true;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : ''));
  ok &&= !!cond;
};

function prep(seed = 9001) {
  const sim = makeMaple(seed), s = sim.s;
  s.tut = { on: false, beat: 99, flags: {}, done: true };
  s.mode = 'sandbox'; s.open = true; s.policies.ownerChores = true;
  return sim;
}

function queueOfficeShopper(sim, id = 990001) {
  const a = { id, kind: 'cust', vt: 'prospect', st: 'office', hidden: true, serveT: 0, exp: { office: 0 } };
  sim.s.agents.push(a); sim.s.officeQ.push(a.id); return a;
}

// Direct capacity proof: one office shopper costs Owner 0.5h.
{
  const sim = prep(1001), s = sim.s, owner = s.staff.find((x) => x.role === 'owner');
  s.t = 10 * 60; sim.syncStaffWork(owner);
  const a = queueOfficeShopper(sim);
  sim.serveOffice();
  check('Owner serves office shopper when no Clerk is present', a.serveT === 25 && a.serveBy === owner.id);
  check('Office shopper consumes 0.5h of Owner capacity', sim.workRemaining(owner) === 7.5, String(sim.workRemaining(owner)));
  check('Office usage is visible in Owner accounting', owner.officeUsed === 0.5, String(owner.officeUsed));
}

// Clerk proof: Clerk is preferred and leaves Owner capacity untouched.
{
  const sim = prep(1002), s = sim.s, owner = s.staff.find((x) => x.role === 'owner');
  s.t = 10 * 60; sim.syncStaffWork(owner);
  const hr = sim.dispatch({ type: 'hire', role: 'clerk' });
  const clerk = s.staff.find((x) => x.role === 'clerk');
  const clerkAg = clerk && s.agents.find((x) => x.sid === clerk.id); if (clerkAg) clerkAg.st = 'office';
  const a = queueOfficeShopper(sim, 990002);
  sim.serveOffice();
  check('Clerk can be hired for office coverage', hr.ok && !!clerk);
  check('Clerk takes office shopper before Owner', a.serveT === 25 && a.serveBy === clerk.id);
  check('Clerk preserves all 8h of Owner capacity', sim.workRemaining(owner) === 8, String(sim.workRemaining(owner)));
}

function reasonableOperator(sim) {
  const s = sim.s;
  // Keep rent-ready inventory available and use the Owner for work that fits today.
  if (sim.objs('unit').some((u) => u.cstate === 'ready')) sim.dispatch({ type: 'commission', all: true });
  for (const t of s.tasks.filter((x) => !x.assigned && !x.vendor)) {
    if (ROLES.owner.can.includes(t.need) && sim.taskHours(t) <= sim.workRemaining(s.staff.find((x) => x.role === 'owner'))) {
      sim.dispatch({ type: 'ownerTask', task: t.id });
    } else if (t.type === 'repair' && !s.staff.some((x) => x.role === 'tech')) {
      sim.dispatch({ type: 'callVendor', task: t.id });
    }
  }
  // Resolve ordinary conversations with the first available action to prevent old prompts from piling up.
  if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 });
}

function runMix(name, roles, seed = 424242, days = 90) {
  const sim = prep(seed), s = sim.s;
  for (const role of roles) {
    const r = sim.dispatch({ type: 'hire', role });
    if (!r.ok) throw new Error(name + ' could not hire ' + role + ': ' + r.msg);
  }
  const cash0 = s.cash;
  let taskStarts = 0, backlogSum = 0, samples = 0, ownerUsedSum = 0, ownerOfficeSum = 0;
  const target = s.t + days * 1440;
  while (s.t < target) {
    if (s.t % 30 === 0) reasonableOperator(sim);
    if (s.t % 1440 === 1439) {
      const owner = s.staff.find((x) => x.role === 'owner');
      backlogSum += s.tasks.length; samples++;
      ownerUsedSum += owner ? (owner.workUsed || 0) : 0;
      ownerOfficeSum += owner ? (owner.officeUsed || 0) : 0;
    }
    sim.step();
    for (const e of sim.events) if (e.type === 'task_start') taskStarts++;
    sim.events.length = 0;
  }
  const payroll = s.staff.reduce((a, st) => a + (st.wage || 0), 0);
  const lostService = s.lost.service || 0;
  const oc = sim.occupancy();
  return {
    name, roles: roles.join('+') || 'owner',
    payrollPerDay: payroll,
    cashDelta: Math.round(s.cash - cash0),
    taskStarts,
    avgBacklog: +(backlogSum / Math.max(1, samples)).toFixed(2),
    avgOwnerUsed: +(ownerUsedSum / Math.max(1, samples)).toFixed(2),
    avgOwnerOffice: +(ownerOfficeSum / Math.max(1, samples)).toFixed(2),
    lostService,
    occupancy: oc.n ? +(oc.occ / oc.n).toFixed(3) : 0,
    rentRoll: Math.round(sim.rentRoll()),
    estDailyNet: sim.estDailyNet(),
  };
}

const rows = [
  runMix('Owner only', []),
  runMix('Owner + Porter', ['porter']),
  runMix('Owner + Tech', ['tech']),
  runMix('Fully staffed', ['porter', 'tech', 'clerk', 'manager']),
];

console.log('STAFFING_COMPARISON ' + JSON.stringify(rows));
const by = Object.fromEntries(rows.map((r) => [r.name, r]));
check('90-day comparison produced all four staffing mixes', rows.length === 4);
check('Payroll matches provisional wages',
  by['Owner only'].payrollPerDay === 0 &&
  by['Owner + Porter'].payrollPerDay === 12.5 &&
  by['Owner + Tech'].payrollPerDay === 20 &&
  by['Fully staffed'].payrollPerDay === 72.5,
  rows.map((r) => r.name + ' $' + r.payrollPerDay + '/d').join(', '));
check('All comparison outputs are finite', rows.every((r) => Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))));
check('Clerk-containing full staff does not consume more Owner office time than Owner-only',
  by['Fully staffed'].avgOwnerOffice <= by['Owner only'].avgOwnerOffice,
  by['Owner only'].avgOwnerOffice + 'h vs ' + by['Fully staffed'].avgOwnerOffice + 'h');
check('Porter and Tech runs exercise real task throughput',
  by['Owner + Porter'].taskStarts > 0 && by['Owner + Tech'].taskStarts > 0,
  by['Owner + Porter'].taskStarts + ' / ' + by['Owner + Tech'].taskStarts);

console.log(ok ? 'ALL PASS' : 'SOME FAILED');
if (!ok) process.exitCode = 1;
