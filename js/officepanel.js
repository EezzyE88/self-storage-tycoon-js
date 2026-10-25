// Read-only presentation of existing state. No scheduling, money or authority changes.
import { OFFICE_HOURS, ROLES } from './data.js';

export function officePanelState(sim) {
  const s = sim.s, day = sim.day;
  const officeHours = sim.hour >= OFFICE_HOURS[0] && sim.hour < OFFICE_HOURS[1];
  const owner = s.staff.find(st => st.role === 'owner');
  const ownerAgent = owner && s.agents.find(a => a.kind === 'staff' && a.sid === owner.id);
  const capacity = ROLES.owner.workHours;
  const charged = owner?.workDay === day ? owner.workUsed || 0 : 0;
  const officeCharged = owner?.workDay === day ? owner.officeUsed || 0 : 0;
  const remaining = owner ? Math.max(0, capacity - charged) : 0;
  // officeServerAgents eligibility, without resetting saved daily bookkeeping in a read.
  const servers = s.agents.filter(a => a.kind === 'staff' && a.st === 'office' &&
    (a.role === 'clerk' ? officeHours : a.role === 'owner' && owner && a.sid === owner.id && remaining >= 0.5));
  const serving = s.officeQ.filter(id => s.agents.some(a => a.id === id && a.serveT > 0)).length;
  const requests = s.convos.map(c => {
    const handler = sim.requestHandler(c);
    const waiting = !!handler && (!officeHours || (handler === 'Clerk' &&
      !s.agents.some(a => a.kind === 'staff' && a.role === 'clerk' && a.st === 'office')));
    return { request: c, handler, waiting };
  });
  const decisions = requests.filter(r => !r.handler).map(r => r.request)
    .sort((a, b) => Number(b.sev === 'critical') - Number(a.sev === 'critical') || a.t - b.t);
  const delegatedRequests = requests.filter(r => r.handler);
  const delegatedJobs = s.tasks.filter(t => t.vendor || (t.assigned && t.assigned !== owner?.id));
  const completed = s.workReport?.days?.find(d => d.day === day)?.roles?.owner;
  return {
    officeHours, counter: !s.open ? 'Business not open' : !officeHours ? 'Outside office hours' :
      servers.length ? `Covered by ${servers.map(a => ROLES[a.role].name).join(' + ')}` : 'Counter uncovered',
    waiting: Math.max(0, s.officeQ.length - serving), serving,
    owner, ownerAgent, capacity, officeCharged, propertyCharged: Math.max(0, charged - officeCharged), remaining,
    ownerTask: ownerAgent && s.tasks.find(t => t.id === ownerAgent.task),
    ownerQueued: ownerAgent?.queue?.length || 0, completedJobs: completed?.jobs || 0,
    decisions, delegatedRequests, delegatedJobs,
    payroll: s.staff.reduce((sum, st) => sum + (st.wage || 0), 0),
    manager: sim.hasManager(), manual: !!s.policies.manualRequests,
    lastAction: s.mgrLog[0] || null,
  };
}
