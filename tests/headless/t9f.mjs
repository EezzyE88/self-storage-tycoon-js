import { makeMaple } from '../../js/maple.js';
import { makeScenario } from '../../js/scenarios.js';
const runs = [['maple365', () => { const m = makeMaple(); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.mode='sandbox'; m.s.open = true; return m; }, 365], ['turnaround', () => makeScenario('turnaround'), 150], ['vertical', () => makeScenario('vertical'), 60], ['climate', () => makeScenario('climate'), 60]];
for (const [n, mk, days] of runs) {
  const sim = mk(); const ev = {}; const c0 = sim.s.cash;
  try { for (let i = 0; i < days * 1440; i++) { sim.step(); for (const e of sim.events) ev[e.type] = (ev[e.type] || 0) + 1; sim.events.length = 0; if (i % 500 === 0 && sim.s.convos.length) { const c = sim.s.convos[0]; sim.dispatch({ type: 'convo', id: c.id, i: 0 }); } } }
  catch (e) { console.log(n, 'CRASH', e.stack.split('\n').slice(0,3).join(' | ')); continue; }
  const st = {}; for (const L of Object.values(sim.s.leases)) st[L.status] = (st[L.status] || 0) + 1;
  console.log(n, 'cash', Math.round(c0), '->', Math.round(sim.s.cash), 'occ', sim.occupancy().occ + '/' + sim.occupancy().n, JSON.stringify(st), 'auctions', ev.auction_end || 0, 'retained', ev.retained || 0, 'convos', ev.convo || 0, 'expired', ev.convo_expired || 0, 'paid', ev.paid_up||0, 'pastdue', ev.pastdue||0);
}
