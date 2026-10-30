import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';

// Run the production celebration/event block with disposable DOM/timers; no renderer or saves.
const source = readFileSync(new URL('../../js/showcase.js', import.meta.url), 'utf8');
const start = source.indexOf('  let banQ = []');
const end = source.indexOf('  // ---------------------------------------------------------------- auction set piece', start);
assert.ok(start > 0 && end > start, 'production event block must be found');
function fixture(open, speed) {
  const sim = makeSandbox({start:'empty', cash:60000}); sim.ensure(); sim.s.open = open; sim.s.speed = speed;
  const ui = Object.create(UI.prototype); ui.g = {sim}; ui.title = false; ui.modalOpen = () => false;
  const timers = [], effects = [], el = {classList:{remove(){}, toggle(){}, add(){}}, style:{}, innerHTML:''};
  const game = {sim, ui, audio:{play(){}}};
  const context = vm.createContext({game, ui, sc:{}, rend:{}, body:{}, $:() => el,
    fx:{burst(...args){effects.push(args);}}, esc:String, performance:{now:() => 0},
    matchMedia:() => ({matches:false}), setTimeout:fn => {timers.push(fn);return timers.length;},
    clearTimeout(){}, setInterval:() => 1, clearInterval(){}});
  vm.runInContext(source.slice(start, end), context);
  return {sim, ui, el, effects, emit:e => context.onEvent(e), drain(){while(timers.length)timers.shift()();}};
}
let checks = 0;
for (const open of [false, true]) for (const speed of [0, 1, 2, 4]) {
  const f = fixture(open, speed), before = JSON.stringify(f.sim.s);
  // Deliberately opposite live state: notification must describe the event's property state.
  const event = Object.freeze({type:'commissioned', propertyOpen:open, automatic:true, n:6, x:3, y:4, f:0});
  f.sim.s.open = !open;
  f.emit(event);
  if (open) {
    assert.match(f.el.innerHTML, /Grand opening/); assert.match(f.el.innerHTML, /6 new units open/);
    assert.match(f.el.innerHTML, /Now visible to shoppers\. Leasing starts today\./);
  } else {
    assert.match(f.el.innerHTML, /Units ready/); assert.match(f.el.innerHTML, /6 units ready/);
    assert.match(f.el.innerHTML, /Open the property when you're ready to begin leasing\./);
    assert.doesNotMatch(f.el.innerHTML, /Grand opening|units open|Leasing starts today/);
  }
  assert.equal(f.sim.s.speed, 0); assert.equal(f.effects.length, 1);
  f.drain(); f.sim.s.open = open;
  assert.equal(JSON.stringify(f.sim.s), before, 'complete sim/save state and RNG restored after banner');
  console.log(`PASS ${open?'open':'closed'} property notification and exact state restoration at ${speed}x`); checks++;
}
for (const open of [false, true]) {
  const f = fixture(open, 4);
  f.emit({type:'commissioned',propertyOpen:open,n:6,x:0,y:0});
  f.ui.notePause(0); f.drain(); assert.equal(f.sim.s.speed, 0);
  console.log(`PASS manual Pause survives ${open?'open':'closed'} notification`); checks++;
}
for (const n of [0, 1]) {
  const f = fixture(false, 4), before = JSON.stringify(f.sim.s);
  f.emit({type:'commissioned',propertyOpen:false,n,x:0,y:0});
  assert.equal(f.el.innerHTML, ''); assert.equal(JSON.stringify(f.sim.s), before);
  checks++;
}
console.log(`${checks} focused notification checks passed; production block, disposable DOM/timers, no WebGL`);
