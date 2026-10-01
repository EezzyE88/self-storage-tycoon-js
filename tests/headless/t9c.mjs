import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
function run(seedHire) {
  const sim = makeMaple(); const s = sim.s;
  s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true;
  if (seedHire) console.log(sim.dispatch({ type: 'hire', role: 'clerk' }).msg);
  for (let i = 0; i < 120 * 1440; i++) { sim.step(); sim.events.length = 0; if (i === 20*1440) sim.dispatch({ type: 'rentReview', key: '10x10|std', pct: 0.1 }); }
  return sim;
}
const a = run(true), b = run(true);
console.log('deterministic', JSON.stringify(a.s) === JSON.stringify(b.s));
console.log(a.s.mgrLog.slice(0, 6).map(l => l.msg).join('\n'));
// save round trip + continue
const code = JSON.stringify(a.s); const c = new Sim(JSON.parse(code));
for (let i = 0; i < 20 * 1440; i++) { a.step(); c.step(); a.events.length = c.events.length = 0; }
console.log('continuation', JSON.stringify(a.s) === JSON.stringify(c.s));
// old-save migration: strip new fields
const old = JSON.parse(code); delete old.debt; delete old.auction; for (const k of ['lateFee','autoNotice','resolution','retention','overlock']) delete old.policies[k];
const o = new Sim(old); for (let i = 0; i < 5 * 1440; i++) o.step(); 
