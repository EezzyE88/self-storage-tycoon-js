// Bounded reporting only. No commands, RNG, money or work scheduling.
import { MIN_PER_DAY, ROLES } from './data.js';
const roles = [...Object.keys(ROLES), 'vendor', 'unattributed'];
const dayAt = t => Math.floor(t / MIN_PER_DAY) + 1;
export function ensureWorkReport(s) {
  const r = s.workReport;
  if (!r || r.v !== 1 || !Number.isInteger(r.fromT) || r.fromT < 0 || r.fromT > s.t || !Array.isArray(r.days)) {
    s.workReport = { v: 1, fromT: s.t, days: [] };
  }
  const R = s.workReport, today = dayAt(s.t), seen = new Set();
  R.days = R.days.filter(d => d && Number.isInteger(d.day) && d.day >= Math.max(dayAt(R.fromT), today - 29) && d.day <= today && !seen.has(d.day) && seen.add(d.day));
  for (const d of R.days) {
    if (!Number.isFinite(d.payroll) || d.payroll < 0) d.payroll = 0;
    if (!d.roles || typeof d.roles !== 'object' || Array.isArray(d.roles)) d.roles = {};
    for (const k of Object.keys(d.roles)) {
      const x = d.roles[k];
      if (!roles.includes(k) || !x || !Number.isInteger(x.jobs) || x.jobs < 0 || !Number.isFinite(x.hours) || x.hours < 0) delete d.roles[k];
    }
  }
  return R;
}
function bucket(s) {
  const r = ensureWorkReport(s), day = dayAt(s.t);
  let d = r.days.find(x => x.day === day);
  if (!d) { d = { day, payroll: 0, roles: {} }; r.days.push(d); }
  return d;
}
export function recordWork(sim, task, actor) {
  let role = actor && Object.hasOwn(ROLES, actor.role) ? actor.role : task.vendor ? 'vendor' : 'unattributed';
  const hours = role === 'vendor' || role === 'unattributed' ? 0 : sim.taskHours(task);
  const d = bucket(sim.s), x = d.roles[role] ||= { jobs: 0, hours: 0 };
  x.jobs++; x.hours = Math.round((x.hours + hours) * 2) / 2;
}
export function recordPayroll(s, amount) { const d = bucket(s); d.payroll = Math.round((d.payroll + amount) * 100) / 100; }
export function workingYard(sim) {
  const s = sim.s, r = s.workReport, today = sim.day, first = Math.max(dayAt(r.fromT), today - 29);
  const ds = r.days.filter(d => d.day >= first && d.day <= today), totals = {};
  for (const d of ds) for (const [role, x] of Object.entries(d.roles)) {
    const t = totals[role] ||= { jobs: 0, hours: 0 }; t.jobs += x.jobs; t.hours += x.hours;
  }
  const diagnostic = sim.diagnostics()[0];
  return { first, today, partialFirst: first === dayAt(r.fromT) && r.fromT % MIN_PER_DAY !== 0,
    fromT: r.fromT, totals, payroll: Math.round(ds.reduce((n,d) => n + d.payroll, 0) * 100) / 100,
    position: sim.financialPosition(), next: diagnostic ? { text: diagnostic.action, detail: diagnostic.cause, tab: diagnostic.tab } : { text: 'Review growth readiness', detail: 'Keep your buffer; review real demand before spending.', tab: 'growth' } };
}
