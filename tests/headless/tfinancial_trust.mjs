// Financial-trust regression: actual cash movement must reconcile to the ledger.
// The HUD uses ledger movement for "today"; estDailyNet remains a separate normalized operating projection.
import { makeScenario } from '../../js/scenarios.js';

let ok = true;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : ''));
  ok &&= !!cond;
};

const sim = makeScenario('turnaround'), s = sim.s;
const c0 = s.cash, t0 = s.t;
sim.money(-123, 'capex', 'Test construction cash out');
sim.money(47, 'anc', 'Test auction cash in');
const ledgerMove = s.ledger.filter((x) => x.t >= t0).reduce((a, x) => a + x.amt, 0);
check('cash delta reconciles to ledger movement', Math.abs((s.cash - c0) - ledgerMove) < 0.001, (s.cash-c0) + ' vs ' + ledgerMove);

const est = sim.estDailyNet();
check('normalized operating estimate is finite', Number.isFinite(est), String(est));
check('scenario exposes authoritative deadline for calendar', s.scenario && s.scenario.deadline === 150);
check('leases expose billing dates for calendar', Object.values(s.leases).some((L) => Number.isFinite(L.nextBill)));

const dayStart = (sim.day - 1) * 1440;
const today = s.ledger.filter((x) => x.t >= dayStart).reduce((a, x) => a + x.amt, 0);
check('today cash movement is ledger-derived', Math.abs(today - (s.cash - c0)) < 0.001, String(today));

console.log(ok ? 'ALL PASS' : 'SOME FAILED');
if (!ok) process.exitCode = 1;
