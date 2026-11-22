// Scenario-only rules for the three Nov 22 scenarios (Harborview Rate Reset, Ironworks Lofts, Campus Crunch).
// Every function here is inert unless the active scenario carries a `rules` record, which only those three
// scenario starts create. Maple, the tutorial, Sandbox, Cedar Creek and the older scenarios never set it, so
// their simulation, saves and economy are unchanged.
import { ROLES } from './data.js';
const DAY = 1440;

export function scenarioRules(s) { return (s && s.mode === 'scenario' && s.scenario && s.scenario.rules) || null; }

// [E] Demand curve: a per-day multiplier on shopper arrivals (Campus Crunch's move-out lull and fall rush).
export function demandFactor(s, day) {
  const R = scenarioRules(s); if (!R || !R.demandCurve) return 1;
  for (const c of R.demandCurve) if (day >= c.from && day <= c.to) return c.m;
  return 1;
}

// [E] Turnover work multiplier for make-ready after a move-out (students leave more behind).
export function turnWorkFactor(s) { const R = scenarioRules(s); return R && R.turnWork ? R.turnWork : 1; }
// Make-ready minutes for a turnover. Unchanged (the same base value) outside rules scenarios. In a rules scenario the
// multiplier applies, but the result never exceeds what one worker can finish in a day: the smaller of rules.turnWorkCap
// and the least daily capacity among roles allowed to do make-ready (8 h today). This keeps an auction clean-out
// (base x2) from stacking past capacity (x2 x3 = 15 h) while ordinary move-outs keep their 7.5 h.
export function turnoverWork(s, base) {
  const R = scenarioRules(s); if (!R || !R.turnWork) return base;
  const cap = Math.min(R.turnWorkCap || Infinity, makeReadyCapMin());
  return Math.min(base * R.turnWork, cap);
}
export function makeReadyCapMin() {
  const hrs = Object.values(ROLES).filter((r) => r.workHours && (r.can || []).includes('makeready')).map((r) => r.workHours);
  return Math.min(...hrs) * 60;
}

// [E] Hourly sample of elevator service: in service = built, working, powered and not closed for an extension.
export function elevatorInService(sim) {
  const s = sim.s, els = sim.objs('elevator').filter((e) => e.cstate === 'operating');
  return els.length > 0 && els.every((e) => sim.works(e) && !e.extensionDrain && !(e.serviceTestUntil > s.t));
}
export function hourlyTick(sim) {
  const s = sim.s, R = scenarioRules(s); if (!R || s.scenario.status !== 'active') return;
  if (R.uptime) { s.today.elevHrs = (s.today.elevHrs || 0) + 1; if (elevatorInService(sim)) s.today.elevUp = (s.today.elevUp || 0) + 1; }
}

// [E] Crew log: hours each worker was booked yesterday, recorded before the daily reset.
export function closeDay(sim) {
  const s = sim.s, R = scenarioRules(s); if (!R || !R.crewLog) return;
  s.today.crew = s.staff.filter((st) => sim.workCapacity(st)).map((st) => ({ id: st.id, role: st.role, name: st.name,
    used: st.workDay === s.today.day ? st.workUsed || 0 : 0, cap: sim.workCapacity(st), wage: st.wage || 0 }));
}
export function crewSummary(s, days = 7) {
  const rows = new Map(), recent = s.days.slice(-days);
  for (const d of recent) for (const c of d.crew || []) {
    const r = rows.get(c.id) || { name: c.name, role: c.role, used: 0, cap: 0, wages: 0, days: 0 };
    r.used += c.used; r.cap += c.cap; r.wages += c.wage; r.days++; rows.set(c.id, r);
  }
  return [...rows.values()].map((r) => ({ ...r, pct: r.cap ? r.used / r.cap : 0 }));
}

// [E] Additive scenario metrics. Return undefined for keys they do not own, so metric() keeps its old default.
export function scenarioMetric(sim, k) {
  const s = sim.s;
  switch (k) {
    case 'upperRoll': return Object.values(s.leases).reduce((a, L) => { const u = s.objects[L.unit]; return a + (u && (u.f || 0) > 0 ? L.rent : 0); }, 0);
    case 'elevUptime30': {
      const d = [...s.days.slice(-29), s.today].filter((x) => x && x.elevHrs);
      const hrs = d.reduce((a, x) => a + x.elevHrs, 0); if (hrs < 7 * 24) return -1; // a week of service history first (the goal card says 'needs 7 days')
      return d.reduce((a, x) => a + (x.elevUp || 0), 0) / hrs;
    }
    // Same terms as Sim.opResult(): rent and fees in; operating costs, payroll, services, marketing and interest out.
    // Miscellaneous 'other' (property transfers, opening working cash), loans, capex and sandbox funds are excluded.
    case 'op30': { const last = s.days.slice(-30); if (last.length < 30) return -1;
      return last.reduce((a, x) => a + (x.rent || 0) + (x.anc || 0) - (x.opex || 0) - (x.payroll || 0) - (x.service || 0) - (x.marketing || 0) - (x.interest || 0), 0); }
    default: return undefined;
  }
}

// [E] Extra fail rule: the upper floor unreachable (no elevator in service at the 7:00 check) for N days in a row.
export function extraFail(sim, sc) {
  const f = sc.fail; if (!sc.rules || !f || !f.upperDownDays) return null;
  sc.downDays = elevatorInService(sim) ? 0 : (sc.downDays || 0) + 1;
  if (sc.downDays === Math.max(1, f.upperDownDays - 3)) sim.emit('cash_warn', { msg: `Scenario risk: the upper floor has had no working elevator for ${sc.downDays} days. ${f.upperDownDays} days ends the run.` });
  return sc.downDays >= f.upperDownDays ? `The upper floor had no working elevator for ${f.upperDownDays} days in a row` : null;
}

// [E] Goals must hold together for `hold` consecutive daily checks before the scenario is won.
export function holdStep(sc, allMet) {
  if (!sc.rules || !sc.hold) return allMet;
  sc.held = allMet ? (sc.held || 0) + 1 : 0;
  return sc.held >= sc.hold;
}
export const DAYS = DAY;
