// Real-graduation baseline (Nov 22 prototypes, challenge 6): completes the current 20-beat Maple tutorial with
// ordinary dispatches (tests/headless/gradrun.mjs) and pins the graduated state to digests recorded on master
// 8d19cf4a34746a26b651091b80047675b83d4b5d. If the new scenario rules leaked into Maple, the tutorial, the economy
// or career progression, these digests would move. Native headless only; physical Safari NOT TESTED.
import { createHash } from 'node:crypto';
import { makeMaple } from '../../js/maple.js';
import { graduate } from './gradrun.mjs';
const EXPECTED = JSON.parse(process.env.GRAD_EXPECTED || 'null') || {
  '11': 'dc1f9849910c33ea', '12': '20c1560138f0ab2f',
};
let fails = 0;
const digest = (sim) => { const s = sim.s; const u = sim.objs('unit');
  const core = { day: sim.day, t: s.t, cash: Math.round(s.cash * 100), units: u.length, operating: u.filter((x) => x.cstate === 'operating').length,
    roll: Math.round(sim.rentRoll() * 100), staff: s.staff.map((x) => x.role).join('+'), gradDay: s.tut.gradDay ?? null, coTier: s.coTier ?? null,
    leases: Object.values(s.leases).map((L) => [L.unit, L.rent]).sort((a, b) => a[0] - b[0]), rng: s.rngS, scenario: s.scenario ?? null };
  return { core, hash: createHash('sha256').update(JSON.stringify(core)).digest('hex').slice(0, 16) }; };
for (const seed of [11, 12]) {
  const sim = makeMaple(seed); const ok = await graduate(sim);
  for (let i = 0; i < 4 * 1440; i++) { sim.step(); sim.events.length = 0; } // four ordinary post-graduation days
  const D = digest(sim);
  const good = ok && sim.s.tut.done && !sim.s.scenario && (EXPECTED[seed] === D.hash);
  if (!good) fails++;
  console.log(`${good ? 'PASS' : 'FAIL'} seed ${seed} graduates through the real tutorial (day ${D.core.day}, ${D.core.units} units, roll $${D.core.roll / 100}, ${D.core.staff}) and matches the 8d19cf4 digest ${EXPECTED[seed]} (got ${D.hash})`);
}
if (fails) { console.log(`FAIL: ${fails} graduation baseline check(s) failed`); process.exit(1); }
console.log('ALL PASS: 2 real-graduation baseline checks; physical Safari NOT TESTED');
