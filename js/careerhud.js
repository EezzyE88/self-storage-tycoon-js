// Presentation of portfolioCareer's existing result only. No simulation or save writes.
const dollars = n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
export function careerGoalPresentation(info) {
  if (!info?.cur || !info.n) return null;
  const next = info.next;
  if (!next) return { title: `Career: ${info.cur.name}`, detail: 'Highest tier earned',
    accessible: `Career: ${info.cur.name}. Highest tier earned. Open Operator career.`, progress: null };
  const rollMet = info.roll >= next.roll, propsMet = info.n >= next.props;
  const needs = [];
  if (!rollMet) needs.push(`Rent roll ${dollars(info.roll)}/${dollars(next.roll)}/mo`);
  if (!propsMet) needs.push(`Eligible properties ${info.n}/${next.props}`);
  const detail = needs.length ? needs.join(' · ') + (rollMet ? ' · Rent roll met' : propsMet ? ' · Property count met' : '')
    : 'Requirements met · promotion pending';
  return { title: `Next: ${next.name}`, detail,
    accessible: `Career progress. Next: ${next.name}. ${detail}. Eligible rent roll ${dollars(info.roll)} of ${dollars(next.roll)} per month; ${info.n} of ${next.props} eligible properties. Open Operator career.`,
    progress: Math.min(1, Math.min(info.roll / next.roll, info.n / next.props)) };
}
