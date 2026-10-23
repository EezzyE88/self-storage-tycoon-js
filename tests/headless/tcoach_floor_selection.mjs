// Real UI handlers and native disposable three-floor state. No storage or GPU.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {UI} from '../../js/ui.js';
import {Sim} from '../../js/sim.js';
import {full} from './tthreefloor.mjs';

const sim=new Sim(structuredClone(full.s)), state=JSON.stringify(sim.s);
globalThis.requestAnimationFrame=()=>{}; // The existing selection auto-pan is not exercised here.
function fixture(view) {
  const ui=Object.create(UI.prototype), calls=[];
  ui.g={sim,rend:{view,setView(v){calls.push(['floor',v]);this.view=v;},setSelection(id){calls.push(['selection',id]);this.sel=id;}}};
  ui.root={querySelectorAll:()=>[]};ui.renderSheet=()=>{};ui.syncFloorUi=()=>{};ui.sfx=()=>{};
  return {ui,calls};
}
const targets=[];
for(const f of [0,1,2]) {
  const unit=sim.objs('unit').find(o=>(o.f||0)===f);assert.ok(unit);
  targets.push({name:`F${f+1} unit`,f,sel:unit.id,act:{sel:unit.id}});
  const dirt={kind:'dirt',f,x:unit.x,y:unit.y};
  targets.push({name:`F${f+1} dirt`,f,sel:dirt,act:{dirt}});
}
const office=sim.objs('office')[0];targets.push({name:'F1 office',f:0,sel:office.id,act:{sel:office.id}});
const cart=sim.s.carts[0];assert.ok(cart);
targets.push({name:'native cart',f:cart.f||0,sel:{kind:'cart',id:cart.id},act:{sel:{kind:'cart',id:cart.id}}});
let checks=0;
for(const view of ['ext',0,1,2])for(const target of targets) {
  const {ui,calls}=fixture(view);
  // Start with a different selection to exercise clearing it during a floor change.
  ui.sel=sim.objs('unit').find(o=>(o.f||0)===(Number.isInteger(view)?view:0)).id;
  ui.coachAct=target.act;ui.runCoach();
  assert.equal(ui.rend.view,target.f,`${view} -> ${target.name}: floor`);
  assert.deepEqual(ui.sel,target.sel,`${view} -> ${target.name}: inspector target retained`);
  assert.ok(ui.selectionOnActiveFloor(ui.sel));
  const floor=calls.findIndex(c=>c[0]==='floor');
  const selected=calls.findIndex(c=>c[0]==='selection'&&c[1]=== (typeof target.sel==='number'?target.sel:null));
  if(view===target.f)assert.equal(floor,-1,'same-floor alerts need no floor switch');
  else {
    assert.ok(floor>=0,'cross-floor alert switches first');
    if(typeof target.sel==='number')assert.ok(selected>floor,'numeric selection occurs after the floor switch');
  }
  assert.equal(JSON.stringify(sim.s),state,'UI routing must not change simulation/save-owned state');checks++;
}
// Compare the exact old handler, proving the regression test detects the reviewed bug.
const source=execFileSync('git',['show','4f2929ab85c3ae01f379e9115e19dae2831911ee:js/ui.js'],{encoding:'utf8'});
const oldRunCoach=Function('return ({'+source.match(/^  runCoach\(\) \{[\s\S]*?^  \}/m)[0]+'}).runCoach')();
const upper=targets.find(t=>t.name==='F2 unit'),ground=targets.find(t=>t.name==='F1 unit');
for(const [view,target] of [[0,upper],[1,ground]]) {
  const {ui}=fixture(view);ui.coachAct=target.act;oldRunCoach.call(ui);
  assert.equal(ui.sel,null,'exact parent loses cross-floor selection');
}
assert.equal(JSON.stringify(sim.s),state);
console.log(`PASS ${checks} coach routes from Exterior/F1/F2/F3 to native units, dirt, office and cart; target-floor selection order and complete state unchanged`);
console.log('PASS exact 4f2929a handler reproduces F1-to-F2 and F2-to-F1 selection loss; fixed handler retains both');
