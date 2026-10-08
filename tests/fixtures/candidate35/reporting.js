// Reporting windows only. No gameplay, financial processing, RNG or state mutation.
export function rollingShopperPeriod(day, days = 30) {
  return { start: Math.max(1, day - days + 1), end: day };
}
export function validPeriod(p) {
  return p && Number.isInteger(p.start) && Number.isInteger(p.end) && p.start >= 1 && p.end >= p.start;
}
export function periodText(p) {
  return validPeriod(p) ? (p.start === p.end ? `Day ${p.start}` : `Days ${p.start}–${p.end}`) : 'Dates not recorded';
}
export function lossesInPeriod(log, period) {
  const out = {};
  for (const x of log) if (x.d >= period.start && x.d <= period.end) out[x.r] = (out[x.r] || 0) + 1;
  return out;
}
export function monthlyReportPeriods(report) {
  if (validPeriod(report.period)) return { financial: report.period, shoppers: report.period, legacy: false };
  // Old reports keep their original totals. Their shopper filter excluded the oldest completed day.
  const day = report.day;
  const shoppers = Number.isInteger(day) && day > 1 ? { start: Math.max(1, day - 29), end: day - 1 } : null;
  return { financial: null, shoppers, legacy: true };
}
