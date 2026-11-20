// Moving-supplies basket sold at the office counter during an existing lease visit.
// No stock, no RNG, no extra trip, queue time or Owner time. Off throughout the tutorial.
import { MARKETS } from './data.js';
import { cents } from './finance.js';

export const SUPPLIES = Object.freeze({ priceShare: 0.4, costShare: 0.5, every: 2, logDays: 30 });

export function normalizeSupplies(state) {
  state.policies ||= {};
  if (state.policies.supplies == null) state.policies.supplies = true;
  const S = state.supplies;
  if (!S || typeof S !== 'object') state.supplies = { v: 1, n: 0, sold: 0, revenue: 0, cost: 0, log: [] };
  else { for (const k of ['n', 'sold', 'revenue', 'cost']) if (!Number.isFinite(S[k])) S[k] = 0; if (!Array.isArray(S.log)) S.log = []; S.v = 1; }
  return state.supplies;
}

export const suppliesBlocked = (s) => s.mode === 'tutorial' && !s.tut?.done;
export const suppliesActive = (s) => !!s.policies?.supplies && !suppliesBlocked(s);

// Accepted proposal: price = 40% of the market's 5x5 street rent; cost = 50% of price
// (times the sandbox operating-cost multiplier when one is set).
export function basketTerms(s) {
  const rent = MARKETS[s.market?.id]?.rent?.['5x5'];
  if (!Number.isFinite(rent)) return null;
  const price = cents(rent * SUPPLIES.priceShare);
  const k = s.opts && Number.isFinite(s.opts.costs) ? s.opts.costs : 1;
  return { price, cost: cents(price * SUPPLIES.costShare * k) };
}

// Called once, in the same tick a counter visit signs a lease. Every second eligible counter lease buys.
export function sellAtCounter(sim, lease) {
  const s = sim.s;
  if (!lease || !suppliesActive(s)) return null;
  const terms = basketTerms(s); if (!terms) return null;
  const S = normalizeSupplies(s);
  S.n += 1;
  if (S.n % SUPPLIES.every) return null;
  const u = s.objects[lease.unit], name = u ? (u.num != null ? `Unit ${u.num}` : u.name) : 'Unit';
  sim.money(terms.price, 'anc', `Moving supplies - ${name}`);
  sim.money(-terms.cost, 'anc', `Supplies cost - ${name}`);
  S.sold += 1; S.revenue = cents(S.revenue + terms.price); S.cost = cents(S.cost + terms.cost);
  S.log.push({ day: sim.day, lease: lease.id, price: terms.price, cost: terms.cost });
  const keepFrom = sim.day - SUPPLIES.logDays + 1; if (S.log[0] && S.log[0].day < keepFrom) S.log = S.log.filter(x => x.day >= keepFrom); // keep the whole rolling window, however many sales
  return terms;
}

export function suppliesSummary(sim, days = SUPPLIES.logDays) {
  const s = sim.s, S = s.supplies || { log: [] }, from = sim.day - days + 1;
  const recent = (S.log || []).filter(x => x.day >= from);
  return { on: !!s.policies?.supplies, blocked: suppliesBlocked(s), terms: basketTerms(s),
    sold: recent.length, margin: cents(recent.reduce((a, x) => a + x.price - x.cost, 0)) };
}
