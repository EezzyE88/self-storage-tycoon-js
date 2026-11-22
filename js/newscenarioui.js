// Scenario panel lines for the Nov 22 scenarios (only rendered when s.scenario.rules exists).
import { crewSummary, elevatorInService, elevatorCabs } from './scenariorules.js';

// The hold line: how far along it is and, while the run is active, the last day a hold can still start and finish by
// the deadline. A daily check runs at 7:00 AM each day through the deadline day.
export function holdLine(sim, sc) {
  let h = `Goals held together: ${sc.held || 0} of ${sc.hold} days in a row`;
  if (sc.status === 'active') {
    const lastStart = sc.deadline - sc.hold + 1, maxLeft = sc.deadline - sim.day + 1;
    if ((sc.held || 0) + maxLeft < sc.hold) h += ' · not enough days left to finish the hold before the deadline';
    else if (!sc.held) h += ` · to finish by the deadline, start the hold by Day ${lastStart}`;
  }
  return h;
}

// Campus: where the run is relative to the authored rush window (presentation only; reads the existing demand curve).
export function rushLine(day, rush) {
  if (day < rush.from) { const n = rush.from - day; return `Fall rush: Day ${rush.from}–${rush.to}, starts in ${n} day${n === 1 ? '' : 's'}; few shoppers until then`; }
  if (day <= rush.to) return `Fall rush is on through Day ${rush.to}: lots of shoppers, have units ready`;
  return `Fall rush ended on Day ${rush.to}: few shoppers now`;
}

export function scenarioRulesHtml(sim, esc) {
  const s = sim.s, sc = s.scenario, R = sc.rules || {}, out = [];
  if (sc.variantLabel) out.push(`<p class="note">This run: ${esc(sc.variantLabel)} · seed ${sc.seed}</p>`);
  if (sc.hold) out.push(`<p class="note">${esc(holdLine(sim, sc))}</p>`);
  if (R.uptime) {
    const up = elevatorInService(sim), cabs = elevatorCabs(sim), n = sc.fail && sc.fail.upperDownDays;
    const state = up ? `in service${cabs.total > 1 && cabs.up < cabs.total ? ` (${cabs.up} of ${cabs.total} cabs working)` : ''}` : 'OUT OF SERVICE: stairs only, no carts, upstairs can\'t be rented';
    const count = sc.status !== 'active' ? '' : sc.downDays ? ` · ${sc.downDays} of ${n} mornings down at 7:00 AM` : n ? ` · the run ends if it is out at the 7:00 AM check ${n} mornings in a row` : '';
    out.push(`<p class="note ${up ? '' : 'fail on'}">Elevator: ${state}${count}</p>`);
  }
  const rush = sc.status === 'active' && (R.demandCurve || []).find((c) => c.m > 1);
  if (rush) out.push(`<p class="note">${esc(rushLine(sim.day, rush))}</p>`);
  if (R.crewLog) {
    const rows = crewSummary(s, 7), n = Math.max(0, ...rows.map((r) => r.days));
    if (rows.length) out.push(`<p class="note">Crew, last ${n} day${n === 1 ? '' : 's'}: ${rows.map((r) => `${esc(r.role === 'owner' ? 'You' : r.name + ' (' + r.role + ')')} ${r.used} of ${r.cap} h (${Math.round(r.pct * 100)}%)${r.wages ? ` · $${Math.round(r.wages)} wages` : ''}`).join(' · ')}</p>`);
  }
  return out.join('');
}
