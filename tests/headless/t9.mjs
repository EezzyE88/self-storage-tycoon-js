import { makeMaple } from '../../js/maple.js';
const sim = makeMaple(); const s = sim.s;
s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true;
const ev = {}; let convos = {};
const days = +process.argv[2] || 200;
const t0 = Date.now();
for (let i = 0; i < days * 1440; i++) {
  sim.step();
  for (const e of sim.events) { ev[e.type] = (ev[e.type] || 0) + 1; }
  sim.events.length = 0;
  for (const c of s.convos) if (!c._seen) { c._seen = 1; const k = (c.key||'').replace(/\d+/g,''); convos[k] = (convos[k]||0)+1; }
  // player answers ~half the conversations, picking the first option
  if (i % 97 === 0 && s.convos.length && (i/97)%2===0) { const c = s.convos[0]; sim.dispatch({ type: 'convo', id: c.id, i: 0 }); }
  if (i === 60 * 1440) { const r = sim.dispatch({ type: 'rentReview', key: Object.keys(s.market.ask).find(k=>sim.rentReviewCands(k).length) || '10x10|std', pct: 0.1 }); console.log('review', r.msg); }
  if (i === 30 * 1440) { console.log('limit', sim.loanLimit()); console.log(sim.dispatch({ type: 'borrow', amt: Math.min(10000, sim.loanLimit()) }).msg); }
}
const stages = {}; for (const L of Object.values(s.leases)) stages[L.status] = (stages[L.status]||0)+1;
const sum = (k) => s.days.reduce((a, d) => a + (d[k] || 0), 0);
console.log('ms', Date.now() - t0, 'day', sim.day, 'cash', Math.round(s.cash), 'occ', JSON.stringify(sim.occupancy()));
console.log('events', JSON.stringify(Object.fromEntries(Object.entries(ev).filter(([k]) => /pastdue|overlock|lien|notice|auction|paid|plan|retain|convo|loan|milestone/.test(k)))));
console.log('convos', JSON.stringify(convos), 'open', s.convos.length);
console.log('stages', JSON.stringify(stages), 'debt', JSON.stringify(s.debt.map(d=>({bal:d.bal,paid:d.paid,pmt:d.pmt}))));
console.log('90d: rent', Math.round(sum('rent')), 'anc', Math.round(sum('anc')), 'service', Math.round(sum('service')), 'debt', Math.round(sum('debt')), 'int', Math.round(sum('interest')), 'fin', Math.round(sum('fin')));
console.log('auction', JSON.stringify(s.auction && s.auction.result));
console.log('mgr', JSON.stringify(s.mgrLog.slice(0,4)));
console.log('milestones', Object.keys(s.milestones).join(','));
