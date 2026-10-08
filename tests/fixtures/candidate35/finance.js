// System B+: pure schedules and projections. No RNG, state mutation or DOM.
import { MIN_PER_DAY, BILLING_CYCLE_DAYS } from './data.js';

export const FINANCIAL_MINUTE = 7 * 60;
export const cents = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
export const financialTime = (day) => (day - 1) * MIN_PER_DAY + FINANCIAL_MINUTE;
export function financeState(lastDay = 0) {
  return { version: 1, lastDay, cycle: 0, accrued: { opex: 0, payroll: 0, interest: 0 }, cashDays: [], observedFrom: lastDay + 1 };
}
export function committed(sim) {
  return cents(Object.values(sim.s.finance.accrued).reduce((a, v) => a + v, 0));
}
export function firstFinancialDay(sim) {
  return sim.s.finance.lastDay < sim.day && sim.mod <= FINANCIAL_MINUTE ? sim.day : sim.day + 1;
}
export function routine(sim, day, extraDaily = 0) {
  // Existing assets/staff held constant. Predictable inflation follows the authoritative cost curve.
  return cents(sim.dailyOpex(day).total + sim.s.staff.reduce((a, st) => a + (st.wage || 0), 0) + cents(sim.s.loan.bal * 0.0004) + extraDaily);
}
export function termPayments(sim, start, end) {
  const payments = [];
  for (const loan of sim.s.debt) {
    let bal = loan.bal, next = loan.next;
    for (let day = start; day <= end && bal > 0.5; day++) {
      if (day < next) continue;
      const interest = cents(bal * loan.rate / 12);
      const principal = Math.min(bal, cents(loan.pmt - interest));
      payments.push({ day, amount: cents(interest + principal), interest, principal, id: loan.id });
      bal = cents(bal - principal); next += BILLING_CYCLE_DAYS;
    }
  }
  return payments;
}
export function reserve(sim, extraDaily = 0) {
  const start = firstFinancialDay(sim), end = start + 13;
  let obligations = 0;
  for (let day = start; day <= end; day++) obligations += routine(sim, day, extraDaily);
  return cents(500 + obligations + termPayments(sim, start, end).reduce((a, p) => a + p.amount, 0));
}
export function position(sim, { spend = 0, extraDaily = 0 } = {}) {
  const cash = cents(sim.s.cash - spend), bills = committed(sim), recommended = reserve(sim, extraDaily);
  return { cash, committed: bills, reserve: recommended, available: cents(cash - bills - recommended), netLiquid: cents(cash - bills - sim.s.loan.bal) };
}
export function outlook(sim, { extraDaily = 0 } = {}) {
  const start = firstFinancialDay(sim), end = start + 29, bills = [];
  for (const L of Object.values(sim.s.leases)) {
    if (L.status !== 'current') continue;
    let next = L.nextBill;
    for (let day = start; day <= end; day++) if (day >= next) {
      bills.push({ day, amount: L.rent, lease: L.id }); next += BILLING_CYCLE_DAYS;
    }
  }
  const terms = termPayments(sim, start, end), settlements = [];
  let pending = committed(sim), cycle = sim.s.finance.cycle, futureCosts = 0;
  for (let day = start; day <= end; day++) {
    const amount = routine(sim, day, extraDaily); pending = cents(pending + amount); futureCosts += amount;
    if (++cycle === 7) { settlements.push({ day, amount: pending }); pending = 0; cycle = 0; }
  }
  const inflow = cents(bills.reduce((a, b) => a + b.amount, 0));
  const outflow = cents(settlements.reduce((a, b) => a + b.amount, 0) + terms.reduce((a, b) => a + b.amount, 0));
  const net = cents(inflow - outflow), averageBill = bills.length ? cents(inflow / bills.length) : 0;
  return { start, end, bills, terms, settlements, inflow, outflow, net, averageBill, downside: cents(net - averageBill), cashAfter: cents(sim.s.cash + net), committedAfter: pending, futureCosts: cents(futureCosts), atRisk: sim.receivables().amt };
}
export function recordCash(sim, amt, cat) {
  const F = sim.s.finance;
  let day = F.cashDays.find((d) => d.day === sim.day);
  if (!day) { day = { day: sim.day, incoming: 0, outgoing: 0, categories: {}, complete: true }; F.cashDays.push(day); }
  if (amt >= 0) day.incoming = cents(day.incoming + amt); else day.outgoing = cents(day.outgoing - amt);
  day.categories[cat] = cents((day.categories[cat] || 0) + amt);
  F.cashDays = F.cashDays.filter((d) => d.day > sim.day - 90);
}
export function cashWindow(sim, days) {
  const from = Math.max(1, sim.day - days + 1), ds = sim.s.finance.cashDays.filter((d) => d.day >= from && d.day <= sim.day);
  const incoming = cents(ds.reduce((a, d) => a + d.incoming, 0)), outgoing = cents(ds.reduce((a, d) => a + d.outgoing, 0)), categories = {};
  for (const d of ds) for (const [cat, amt] of Object.entries(d.categories)) categories[cat] = cents((categories[cat] || 0) + amt);
  return { incoming, outgoing, net: cents(incoming - outgoing), categories, complete: ds.every((d) => d.complete) && from >= (sim.s.finance.cashCompleteFrom || 1) };
}
