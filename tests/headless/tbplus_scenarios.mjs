// Fixed, declared seed matrix and once-daily operator. No manipulated payment RNG,
// free funds, forced leases, instant construction or direct condition/reputation edits.
import assert from 'node:assert/strict';
import { makeScenario } from '../../js/scenarios.js';
import { MARKETS, ROLES } from '../../js/data.js';

export const SEEDS = [1, 99, 777, 2026, 4401, 9001, 98765, 424242];
export function competentOperator(sim, { expansionNotBefore = 30 } = {}) {
  const s = sim.s;
  if (sim.day === 1 && !s.staff.some((x) => x.role === 'porter')) sim.dispatch({ type: 'hire', role: 'porter' });
  // Owner handles repairs; delegated work/office have their existing real daily limits.
  for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor).sort((a, b) => (b.pri || 0) - (a.pri || 0))) {
    if (t.type === 'repair') {
      if (ROLES.owner.can.includes(t.need)) sim.dispatch({ type: 'ownerTask', task: t.id });
      else if (sim.financialPosition({ spend: 650 }).available >= 0) sim.dispatch({ type: 'callVendor', task: t.id });
    }
  }
  for (const c of [...s.convos]) if (c.actions && c.actions.length) sim.dispatch({ type: 'convo', id: c.id, i: 0 });
  if (sim.objs('unit').some((u) => u.cstate === 'ready')) sim.dispatch({ type: 'commission', all: true });
  if ((sim.day - 1) % 30 === 0) {
    for (const k of Object.keys(s.market.ask)) {
      const [size, env] = k.split('|');
      sim.dispatch({ type: 'setRent', key: k, v: Math.round(sim.marketRent({ size, env }) * 0.95 / 5) * 5 });
      if (sim.rentReviewCands(k).length) sim.dispatch({ type: 'rentReview', key: k, pct: 0.08 });
    }
  }
  // Advertise existing vacancy once, keeping the accepted $250/30-day campaign mechanics.
  if (sim.day === 2) sim.dispatch({ type: 'ad', kind: 'size', target: '5x10' });
  // Reuse the existing connected aisle only after demand is observed and the backlog is down.
  if (sim.day >= expansionNotBefore && !s.orders.some((o) => o.tool === 'du10x10') && sim.operations().makeReady <= 2) {
    const a = { tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 };
    const plan = sim.plan(a), lost = s.mkt.lostLog.filter((x) => x.sz === '10x10' && ['noReady', 'noSize'].includes(x.r) && x.d > sim.day - 30).length;
    if (plan.status === 'valid' && lost >= 5 && sim.financialPosition({ spend: plan.cost, extraDaily: sim.planDailyCost(plan) }).available >= 0) sim.dispatch({ type: 'build', ...a });
  }
}
export function runMaple(seed, target = 3750, operator = competentOperator) {
  const sim = makeScenario('turnaround'), s = sim.s;
  s.rngS = seed; s.seed = seed;
  s.scenario.goals.find((g) => g.k === 'roll').v = target;
  let minLiquid = sim.financialPosition().netLiquid, maxRoll = 0, firstMet = null, expansionDay = null;
  while (sim.day <= 151 && s.scenario.status === 'active') {
    if (sim.mod === 9 * 60 && operator) operator(sim);
    sim.step(); sim.events.length = 0;
    if (sim.mod === 7 * 60) {
      minLiquid = Math.min(minLiquid, sim.financialPosition().netLiquid); maxRoll = Math.max(maxRoll, sim.rentRoll());
      if (s.scenario.goals.every((g) => sim.goalMet(g)) && firstMet == null) firstMet = sim.day;
    }
    if (!expansionDay && s.orders.some((o) => o.tool === 'du10x10')) expansionDay = sim.day;
  }
  return { seed, target, status: s.scenario.status, day: s.scenario.endDay || sim.day, firstMet, expansionDay, roll: Math.round(sim.rentRoll()), occupancy: +sim.occupancy().pct.toFixed(3), reputation: +sim.reputation().toFixed(3), cash: Math.round(s.cash), committed: sim.committedBills(), minLiquid: Math.round(minLiquid), maxRoll: Math.round(maxRoll) };
}

const rows = SEEDS.map((seed) => runMaple(seed));
const baseline = SEEDS.map((seed) => runMaple(seed, 3000));
const idle = runMaple(4401, 3000, null);
console.log('MAPLE_3750 ' + JSON.stringify(rows));
console.log('MAPLE_3000 ' + JSON.stringify(baseline));
const imperfect = SEEDS.map((seed) => runMaple(seed, 3750, (sim) => { if (sim.day % 7 !== 0) competentOperator(sim, { expansionNotBefore: 60 }); }));
console.log('MAPLE_IMPERFECT ' + JSON.stringify(imperfect));
console.log('MAPLE_IDLE ' + JSON.stringify(idle));
assert.ok(rows.every((r) => Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))));
assert.ok(rows.every((r) => r.status === 'won' && r.day < 150), '3750 must be achievable across every declared seed');
console.log('3750 before Day 150: ' + rows.filter((r) => r.status === 'won' && r.day < 150).length + '/' + rows.length);
console.log('3000 before Day 150: ' + baseline.filter((r) => r.status === 'won' && r.day < 150).length + '/' + baseline.length);
assert.ok(imperfect.every((r) => r.status === 'won' && r.day < 150), '3750 must tolerate weekly missed check-ins and later expansion');
console.log('ALL PASS: deterministic scenario matrix completed (target decision uses reported outcomes)');
