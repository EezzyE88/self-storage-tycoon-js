import assert from 'node:assert/strict';
import { MIN_PER_DAY, TICKS_PER_SEC_1X } from '../../js/data.js';
import { makeMaple } from '../../js/maple.js';
import { readFileSync } from 'node:fs';
assert.equal(TICKS_PER_SEC_1X, 60, 'one real second advances one in-game hour');
for (const [speed, seconds] of [[1,24],[2,12],[4,6]]) {
  const sim = makeMaple(4242), start = sim.s.t;
  const ticks = seconds * TICKS_PER_SEC_1X * speed;
  for (let n=0;n<ticks;n++) sim.step();
  assert.equal(sim.s.t-start, MIN_PER_DAY, `${speed}x advances exactly one day in ${seconds}s`);
}
const ui = readFileSync('js/ui.js','utf8');
for (const seconds of [24,12,6]) assert.ok(ui.includes(`${seconds}-second day`));
console.log('PASS 24/12/6-second days, unchanged one-minute simulation ticks, and speed guidance');
