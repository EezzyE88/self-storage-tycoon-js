// Pricing guidance: read-only presentation. Never saved, never written to sim state, no RNG.
// 1. Saved monthly-report pricing advice is reworded when shown; stored report text is not rewritten
//    (same approach as climateSuggestionText). Measured at Maple, cutting asks on this advice did not
//    reliably earn more, so the shown text no longer recommends a cut.
// 2. A per-size "Last 30 days" line for Business -> Asking rents, from data the game already keeps.
//    Counts are observations, not causes. Lost-shopper climate flags record the shopper's preference,
//    not the unit offered, so counts are by size only.
import { SIZE_KEYS } from './data.js';
import { rollingShopperPeriod, periodText } from './reporting.js';

const PRICE_ADVICE = /^(\d+) shoppers left over price(; (.+) charges about (\d+)% under market)?\. Trim asking rents in Business, or win on quality\.$/;

export function priceAdviceText(text) {
  const m = typeof text === 'string' ? PRICE_ADVICE.exec(text) : null;
  if (!m) return text;
  return `${m[1]} shoppers turned down your asking rent${m[2] ? `; ${m[3]} charges about ${m[4]}% under market` : ''}. Other shoppers may still lease the same units at full rent, so a lower price is not guaranteed to earn more. Compare each size in Business → Asking rents before changing price.`;
}

const PRICE_LOSSES = new Set(['price', 'competitor']);

export function pricingActivity(sim, days = 30) {
  const s = sim.s, period = rollingShopperPeriod(sim.day, days), rows = new Map();
  const row = (size) => { if (!rows.has(size)) rows.set(size, { size, units: 0, signed: 0, turned: 0, ready: 0 }); return rows.get(size); };
  for (const u of Object.values(s.objects)) {
    if (u.type !== 'unit' || u.cstate !== 'operating') continue;
    const r = row(u.size); r.units++;
    const L = u.lease && s.leases[u.lease];
    if (L && L.unit === u.id && Number.isInteger(L.start) && L.start >= period.start && L.start <= period.end) r.signed++;
    if (!u.lease && u.commercial === 'ready' && !u.blocked) r.ready++;
  }
  for (const x of (s.mkt && s.mkt.lostLog) || []) {
    if (x.d < period.start || x.d > period.end || !PRICE_LOSSES.has(x.r)) continue;
    if (rows.has(x.sz)) rows.get(x.sz).turned++;
  }
  const order = (a) => { const i = SIZE_KEYS.indexOf(a); return i < 0 ? 99 : i; };
  return { period, rows: [...rows.values()].filter(r => r.signed || r.turned || r.ready).sort((a, b) => order(a.size) - order(b.size)) };
}

export function pricingActivityHtml(sim) {
  const A = pricingActivity(sim);
  if (!A.rows.length) return '';
  const lines = A.rows.map(r => `<p>${r.size}: ${r.signed} signed and still renting · ${r.turned} turned down the price · ${r.ready} ready to rent now</p>`).join('');
  return `<div class="note price-activity"><p><b>Last 30 days</b> · ${periodText(A.period)}</p>${lines}<p>Counts show what happened, not what caused it. After a price change, check back in a few weeks and compare.</p></div>`;
}
