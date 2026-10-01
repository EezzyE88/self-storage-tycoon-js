import { makeMaple } from '../../js/maple.js';
import { TOOLS } from '../../js/data.js';
const mk = () => { const m = makeMaple(); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.mode = 'sandbox'; m.s.open = true; return m; };
function run(name, bot, days = 365) {
  const sim = mk(); const s = sim.s;
  for (let i = 0; i < days * 1440; i++) { if (bot && i % 30 === 0) bot(sim, i); sim.step(); sim.events.length = 0; }
  const oc = sim.occupancy();
  console.log(name.padEnd(7), 'cash', Math.round(s.cash), 'occ', oc.occ + '/' + oc.n, 'roll', sim.rentRoll(), 'rep', sim.reputation().toFixed(2), 'rating', (sim.rating() || 0).toFixed(1), 'grades', s.mkt.reports.map(r => r.grade).join(''), 'occ by month', s.mkt.reports.map(r => Math.round(r.occ * 100)).join(','));
  return sim;
}
run('idle', null);
run('absent', (sim, i) => { if (i === 0) sim.s.policies.ownerChores = false; });
run('good', (sim, i) => {
  const s = sim.s;
  for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor)) { const r = sim.dispatch({ type: 'ownerTask', task: t.id }); if (!r.ok) sim.dispatch({ type: 'callVendor', task: t.id }); }
  if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 });
  if (i % (1440 * 30) === 0 && i > 0) { // reprice: undercut competitor slightly if present, else market
    const cp = sim.compPrice();
    for (const u of sim.objs('unit')) { const k = Object.keys(s.market.ask).find((k) => k.startsWith(u.size) && k.includes(u.env)); }
    for (const k of Object.keys(s.market.ask)) { const [sz, env] = k.split(/[|:_]/); }
  }
});
run('strat', (sim, i) => {
  const s = sim.s;
  if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 });
  if (i === 1440 * 20) {
    sim.dispatch({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 });
    sim.dispatch({ type: 'build', tool: 'hvac', a: { x: 14, y: 8 }, b: { x: 14, y: 8 }, f: 0 });
    sim.dispatch({ type: 'build', tool: 'light', a: { x: 17, y: 8 }, b: { x: 17, y: 8 }, f: 0 });
    console.log(JSON.stringify(sim.dispatch({ type: 'build', tool: 'iu5x5', a: { x: 16, y: 5 }, b: { x: 16, y: 11 }, f: 0, climate: true })));
  }
  if (i % 1440 === 0) for (const u of sim.objs('unit')) if (u.cstate === 'ready') sim.dispatch({ type: 'commission', unit: u.id });
  if (i % (1440 * 30) === 0) { const cp = sim.compPrice(); for (const k of Object.keys(s.market.ask)) { const [sz, env] = k.split('|'); const mk = sim.marketRent({ size: sz, env }); s.market.ask[k] = Math.round(mk * (cp ? Math.min(1.0, cp + 0.06) : 1.02)); } }
});
