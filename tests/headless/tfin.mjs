// Foundations: honest finances. Cash only moves through the ledger; billing creates balances, not cash;
// the rent roll splits into paying + past due; "owed to you" equals the sum of account balances.
import { makeScenario } from '../../js/scenarios.js';
let ok = true; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n, x); ok &&= !!c; };
const sim = makeScenario('turnaround'); const s = sim.s;
let ledgerSum = 0; const m0 = sim.money.bind(sim); sim.money = (amt, cat, note) => { ledgerSum += amt; return m0(amt, cat, note); };
const cash0 = s.cash; let billedNoCash = 0, billChecks = 0, minCash = Infinity;
const b0 = sim.billLease.bind(sim);
sim.billLease = (L, day) => { const before = s.cash, bal = L.balance || 0, due = day >= L.nextBill && L.status !== 'auction'; const r = b0(L, day); if (due && L.status !== 'current' && L.balance > bal) { billChecks++; if (s.cash - before <= 0.01) billedNoCash++; } return r; };
let rollOk = true, rcvOk = true, maxRcv = 0, maxPast = 0;
for (let d = 0; d < 120; d++) {
  for (let i = 0; i < 1440; i++) { sim.step(); sim.events.length = 0; }
  const ls = Object.values(s.leases); const roll = sim.rentRoll(), paying = sim.rentRollPaying(), past = ls.filter((L) => !(L.status === 'current' || L.status === 'plan')).reduce((a, L) => a + L.rent, 0);
  if (Math.abs(roll - paying - past) > 0.01) rollOk = false;
  const r = sim.receivables(); if (r.amt !== ls.reduce((a, L) => a + Math.max(0, sim.owed(L)), 0) && r.amt !== ls.filter((L) => sim.owed(L) > 0).reduce((a, L) => a + sim.owed(L), 0)) rcvOk = false;
  minCash = Math.min(minCash, s.cash); maxRcv = Math.max(maxRcv, r.amt); maxPast = Math.max(maxPast, past);
}
check('cash change equals ledger total (no money appears outside the ledger)', Math.abs((s.cash - cash0) - ledgerSum) < 0.01, `cash ${Math.round(cash0)} -> ${Math.round(s.cash)}, ledger ${Math.round(ledgerSum)}`);
check('rent roll = paying + past due, every day for 120 days', rollOk);
check('owed to you = sum of positive account balances (and it was exercised)', rcvOk && maxRcv > 0, `peak owed $${maxRcv}, peak past-due rent roll $${maxPast}`);
check('billing a behind tenant adds to their balance, not to cash', billChecks > 0 && billedNoCash === billChecks, `${billedNoCash}/${billChecks}`);
const est = sim.estDailyNet(), pay = s.staff.reduce((a, x) => a + (x.wage || 0), 0);
check('daily estimate uses paying tenants only', est === Math.round(sim.rentRollPaying() * 12 / 365 - sim.dailyOpex().total - pay), `est ${est} vs all-leases ${Math.round(sim.rentRoll() * 12 / 365 - sim.dailyOpex().total - pay)}`);
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
