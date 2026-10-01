import { makeMaple } from '../../js/maple.js';
const sim = makeMaple(); const s = sim.s;
s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true;
for (let i = 0; i < 1440*2; i++) sim.step(); sim.events.length=0;
const Ls = Object.values(s.leases).slice(0, 6);
Ls.forEach((L, k) => { L.status = 'delinquent'; L.balance = L.rent * 2; L.fees = 20; L.dueSince = sim.day - 28; s.objects[L.unit].overlock = true; });
const log = [];
for (let i = 0; i < 40 * 1440; i++) {
  sim.step();
  for (const e of sim.events) if (/lien|notice|auction|paid|plan|overlock/.test(e.type)) log.push(`d${sim.day} ${e.type}${e.price!=null?' $'+e.price:''}${e.total!=null?' total $'+e.total:''}`);
  sim.events.length = 0;
  const c = s.convos.find(c => c.key && c.key.startsWith('lien'));
  if (c && s.t - c.t > 120) { const opt = c.id % 2 ? 1 : 0; const r = sim.dispatch({ type: 'convo', id: c.id, i: opt }); log.push(`d${sim.day} player: ${c.actions[opt].label} -> ${r.msg}`); }
}
console.log(log.join('\n'));
const stages = {}; for (const L of Ls) stages[L.status||'closed'] = (stages[L.status||'closed']||0)+1;
console.log(JSON.stringify(stages), JSON.stringify(s.auction), 'tasks', s.tasks.filter(t=>t.label.startsWith('Clean out')).length, 'ms', Object.keys(s.milestones));
