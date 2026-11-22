// Scenario panel lines for the Nov 22 scenarios (only rendered when s.scenario.rules exists).
import { crewSummary, elevatorInService } from './scenariorules.js';

export function scenarioRulesHtml(sim, esc) {
  const s = sim.s, sc = s.scenario, R = sc.rules || {}, out = [];
  if (sc.variantLabel) out.push(`<p class="note">This run: ${esc(sc.variantLabel)} · seed ${sc.seed}</p>`);
  if (sc.hold) out.push(`<p class="note">Goals held together: ${sc.held || 0} of ${sc.hold} days in a row</p>`);
  if (R.uptime) out.push(`<p class="note ${elevatorInService(sim) ? '' : 'fail on'}">Elevator: ${elevatorInService(sim) ? 'in service' : 'OUT OF SERVICE: stairs only, no carts, upstairs can\'t be rented'}${sc.downDays ? ` · ${sc.downDays} of ${sc.fail.upperDownDays} mornings down at 7:00 AM` : ''}</p>`);
  if (R.crewLog) {
    const rows = crewSummary(s, 7);
    if (rows.length) out.push(`<p class="note">Crew, last 7 days: ${rows.map((r) => `${esc(r.role === 'owner' ? 'You' : r.name + ' (' + r.role + ')')} ${r.used} of ${r.cap} h (${Math.round(r.pct * 100)}%)${r.wages ? ` · $${Math.round(r.wages)} wages` : ''}`).join(' · ')}</p>`);
  }
  return out.join('');
}
