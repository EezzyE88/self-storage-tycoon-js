import { makeMaple } from '../../js/maple.js';
const mk = () => { const m = makeMaple(); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.mode = 'sandbox'; m.s.open = true; return m; };
function run(name, bot, days = 365) {
  const sim = mk(); const s = sim.s; const ev = {};
  for (let i = 0; i < days * 1440; i++) { if (bot && i % 60 === 0) bot(sim, i); sim.step(); for (const e of sim.events) ev[e.type] = (ev[e.type] || 0) + 1; sim.events.length = 0; }
  const oc = sim.occupancy();
  console.log(name, 'cash', Math.round(s.cash), 'occ', oc.occ + '/' + oc.n, 'roll', sim.rentRoll(), 'rep', sim.reputation().toFixed(2), 'rating', (sim.rating() || 0).toFixed(1), 'comps', s.mkt.comp.map(c => c.name + '@' + c.opens).join(','), 'grades', s.mkt.reports.map(r => r.grade).join(''), 'lost', JSON.stringify(s.lost));
  return sim;
}
const idle = run('idle', null);
console.log(JSON.stringify(idle.s.mkt.reports.at(-1).sug));
run('active', (sim, i) => {
  const s = sim.s;
  if (i === 0) { sim.dispatch({ type: 'hire', role: 'porter' }); sim.dispatch({ type: 'hire', role: 'tech' }); }
  // owner works open tasks
  const t = s.tasks.find((t) => !t.assigned); if (t) sim.dispatch({ type: 'ownerTask', task: t.id });
  // answer convos with first option
  if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 });
  // price to slightly under competitor if any
  if (i % 1440 === 0) { const cp = sim.compPrice(); for (const k of Object.keys(s.market.ask)) { const [sz, env] = k.split('|'); } }
});
