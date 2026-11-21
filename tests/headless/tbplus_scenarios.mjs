// Fixed, declared seed matrix and once-daily operator. No manipulated payment RNG,
// free funds, forced leases, instant construction or direct condition/reputation edits.
// Maple Turnaround v2 (public-frontage layout): the old drive-up expansion row at x13 now sits on the
// public frontage drive aisle and is refused, so growth uses the unfinished west corridor instead
// (one light, then seven interior 5x10 units), through the same ordinary build dispatch. The roll goal
// is $3,600 (all 23 original units at market rent give $3,350).
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
  // Fit out the existing west corridor only after demand is observed and the backlog is down.
  if (expansionNotBefore != null && sim.day >= expansionNotBefore && !s.orders.some((o) => o.tool === 'iu5x10') && sim.objs('unit').length === 23 && sim.operations().makeReady <= 2) {
    const plans = CORRIDOR.map((a) => sim.plan(a)), cost = plans.reduce((a, p) => a + p.cost, 0), daily = plans.reduce((a, p) => a + sim.planDailyCost(p), 0);
    const lost = s.mkt.lostLog.filter((x) => x.sz === '5x10' && ['noReady', 'noSize'].includes(x.r) && x.d > sim.day - 30).length;
    if (plans[0].status === 'valid' && plans[1].status !== 'invalid' && lost >= 5 && sim.financialPosition({ spend: cost, extraDaily: daily }).available >= 0) for (const a of CORRIDOR) sim.dispatch({ type: 'build', ...a });
  }
}
export const CORRIDOR = [{ tool: 'light', a: { x: 17, y: 8 }, b: { x: 17, y: 8 }, f: 0 }, { tool: 'iu5x10', a: { x: 16, y: 5 }, b: { x: 16, y: 11 }, f: 0 }];
export function runMaple(seed, target = 3600, operator = competentOperator) {
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
    if (!expansionDay && s.orders.some((o) => o.tool === 'iu5x10')) expansionDay = sim.day;
  }
  return { seed, target, status: s.scenario.status, day: s.scenario.endDay || sim.day, firstMet, expansionDay, roll: Math.round(sim.rentRoll()), occupancy: +sim.occupancy().pct.toFixed(3), reputation: +sim.reputation().toFixed(3), cash: Math.round(s.cash), committed: sim.committedBills(), minLiquid: Math.round(minLiquid), maxRoll: Math.round(maxRoll) };
}

const rows = SEEDS.map((seed) => runMaple(seed));
const baseline = SEEDS.map((seed) => runMaple(seed, 3000));
const idle = SEEDS.map((seed) => runMaple(seed, 3600, null));
const noGrowth = SEEDS.map((seed) => runMaple(seed, 3600, (sim) => competentOperator(sim, { expansionNotBefore: null })));
console.log('MAPLE_3600 ' + JSON.stringify(rows));
console.log('MAPLE_3000 ' + JSON.stringify(baseline));
const imperfect = SEEDS.map((seed) => runMaple(seed, 3600, (sim) => { if (sim.day % 7 !== 0) competentOperator(sim, { expansionNotBefore: 60 }); }));
console.log('MAPLE_IMPERFECT ' + JSON.stringify(imperfect));
console.log('MAPLE_IDLE ' + JSON.stringify(idle));
console.log('MAPLE_NO_GROWTH ' + JSON.stringify(noGrowth));
assert.ok(rows.every((r) => Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))));
assert.ok(rows.every((r) => r.status === 'won' && r.day < 150), '3600 must be achievable across every declared seed');
console.log('3600 before Day 150: ' + rows.filter((r) => r.status === 'won' && r.day < 150).length + '/' + rows.length);
console.log('3000 before Day 150: ' + baseline.filter((r) => r.status === 'won' && r.day < 150).length + '/' + baseline.length);
assert.ok(imperfect.every((r) => r.status === 'won' && r.day < 150), '3600 must tolerate weekly missed check-ins and later expansion');
assert.ok(idle.every((r) => r.status !== 'won'), 'doing nothing must not win');
assert.ok(noGrowth.every((r) => r.status !== 'won' && r.maxRoll < 3600), 'filling the original 23 units at market rent alone must not reach the roll goal');
console.log('ALL PASS: deterministic scenario matrix completed (target decision uses reported outcomes)');
