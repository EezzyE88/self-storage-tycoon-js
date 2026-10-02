// Scenario pressure check: an idle player vs. a player who handles work, in Maple Turnaround.
import { makeScenario } from '../../js/scenarios.js';
const bots = {
  idle: null,
  manager: (sim, i) => { bots.fixer(sim); const s = sim.s; if (i % (1440 * 30) === 0 && i > 0) for (const k of Object.keys(s.market.ask)) { const [sz, env] = k.split('|'); const mk = sim.marketRent({ size: sz, env }); s.market.ask[k] = Math.round(mk * 1.0); if (sim.rentReviewCands(k).length) sim.dispatch({ type: 'rentReview', key: k, pct: 0.08 }); } },
  builder: (sim, i) => { bots.manager(sim, i); const s = sim.s; if (!s.__b && s.cash > 9000) { const r = sim.dispatch({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 }); if (r.ok) s.__b = 1; } if (i % 1440 === 0) for (const u of sim.objs('unit')) if (u.cstate === 'ready') sim.dispatch({ type: 'commission', unit: u.id }); },
  fixer: (sim) => { const s = sim.s; for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor)) { const r = sim.dispatch({ type: 'ownerTask', task: t.id }); if (!r.ok) sim.dispatch({ type: 'callVendor', task: t.id }); } if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 }); },
};
for (const id of (process.env.SC || 'turnaround,vertical,climate').split(',')) for (const [name, bot] of Object.entries(bots)) {
  const sim = makeScenario(id); const s = sim.s;
  for (let i = 0; i < 320 * 1440 && s.scenario.status === 'active'; i++) { if (bot && i % 30 === 0) bot(sim, i); sim.step(); sim.events.length = 0; }
  const oc = sim.occupancy();
  console.log(id.padEnd(10), name.padEnd(6), s.scenario.status, 'day', s.scenario.endDay ?? sim.day, 'cash', Math.round(s.cash), 'occ', oc.occ + '/' + oc.n, 'roll', sim.rentRoll(), 'rep', sim.reputation().toFixed(2), 'comps', s.mkt.comp.length, s.scenario.why || '');
}
