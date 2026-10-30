import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MILESTONES} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';

// Exercise production milestone dispatch and subtitle without renderer, timers or persistence.
const source = readFileSync(new URL('../../js/showcase.js', import.meta.url), 'utf8');
const eventStart = source.indexOf('  function onEvent(e) {');
const eventEnd = source.indexOf('  // ---------------------------------------------------------------- auction set piece', eventStart);
const subStart = source.indexOf('  function milestoneSub(k) {');
const subEnd = source.indexOf('  function checkFull()', subStart);
assert.ok(eventStart > 0 && eventEnd > eventStart && subStart > 0 && subEnd > subStart);
let checks = 0;
for (const open of [false, true]) for (const speed of [0, 1, 2, 4]) {
  const sim = makeSandbox({start:'empty',cash:60000}); sim.ensure(); sim.s.open = open; sim.s.speed = speed;
  const before = JSON.stringify(sim.s), calls = [], at = Object.freeze({x:2,z:3,f:0});
  const context = vm.createContext({game:{sim},ui:{title:false},MILESTONES,
    officeAt:() => at,celebrate:(...args) => calls.push(args)});
  vm.runInContext(source.slice(subStart, subEnd) + source.slice(eventStart, eventEnd), context);
  context.onEvent(Object.freeze({type:'milestone',k:'first_expansion'}));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['Milestone','First expansion ready','Your first additional units are rent-ready.',at]);
  assert.doesNotMatch(calls[0].slice(1,3).join(' '), /opened|collecting|more rent|leasing starts/i);
  assert.equal(JSON.stringify(sim.s), before, 'presentation must preserve complete simulation/save/RNG state and speed');
  console.log(`PASS first-expansion title/subtitle and exact state preservation, ${open?'open':'closed'}, ${speed}x`);
  checks++;
}
console.log(`${checks} focused milestone-copy checks passed; production dispatch, no rendered browser or physical-iPhone claim`);
