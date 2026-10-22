// CPU stress only. The GPU and Canvas are stubbed by renderer-fixture.
import assert from 'node:assert/strict';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox} from '../../js/scenarios.js';
import {Sim} from '../../js/sim.js';
import {buildMaxLot} from './maxlot.mjs';
const Renderer=await loadRenderer(),canvas={clientWidth:375,clientHeight:667};
const warnings=[];console.warn=(...a)=>warnings.push(a.join(' '));
const dense=makeSandbox({kind:'free',instant:true,seed:4401});buildMaxLot(dense,{aisleW:1});dense.ensure();
const before=JSON.stringify(dense.s),r=new Renderer(canvas,dense);r.rebuildStatic();
function counts(){const materials=new Set(),geometry=new Set();let nodes=0,instances=0;r.staticG.traverse(m=>{nodes++;if(m.material)materials.add(m.material);if(m.geometry)geometry.add(m.geometry);if(m.isInstancedMesh)instances+=m.count;});return{nodes,materials:materials.size,geometry:geometry.size,instances};}
const expected=counts();let disposed=0;
for(const b of r.openHouse.batches.values())b.mesh.addEventListener('dispose',()=>disposed++);
const start=performance.now();
for(let i=0;i<25;i++){
 r.azimuth=i*Math.PI/7;r.updateCamera();r.rebuildStatic();assert.deepEqual(counts(),expected);
 for(const view of ['ext',0,1]){r.setView(view);r.openHouse.update();for(const b of r.openHouse.batches.values())assert.equal(b.mesh.visible,view==='ext'||b.f===view);}
 for(const b of r.openHouse.batches.values())assert.ok([...b.mesh.instanceMatrix.array].every(Number.isFinite));
}
assert.equal(JSON.stringify(dense.s),before);assert.ok(disposed>0);assert.equal(warnings.length,0,warnings.join('\n'));
console.log(JSON.stringify({kind:'dense-lifecycle',units:dense.objs('unit').length,rebuilds:25,counts:expected,disposedOriginalBatches:disposed,cpuMs:+(performance.now()-start).toFixed(2)}));
// 5000 steady presentation frames must leave all instance buffers untouched.
let scans=0;const tasks=dense.s.tasks,original=tasks.some;tasks.some=function(...a){scans++;return original.apply(this,a)};
const versions=[...r.openHouse.batches.values()].map(b=>b.mesh.instanceMatrix.version),t=performance.now();
for(let i=0;i<5000;i++)r.openHouse.update();delete tasks.some;
assert.equal(scans,0);assert.deepEqual([...r.openHouse.batches.values()].map(b=>b.mesh.instanceMatrix.version),versions);assert.equal(JSON.stringify(dense.s),before);
console.log(JSON.stringify({kind:'steady-presentation',frames:5000,perRoomTaskScans:scans,instanceReuploads:0,cpuMs:+(performance.now()-t).toFixed(2)}));
// Three deterministic 30-day explicit-tick runs. Rendering is interleaved each
// simulated hour; the paired simulation receives the same game commands.
for(const seed of [4401,5150,9101]){
 const a=makeMaple(seed),b=new Sim(JSON.parse(JSON.stringify(a.s)));a.s.tut.on=false;b.s.tut.on=false;a.s.speed=b.s.speed=1;
 const view=new Renderer(canvas,a);view.rebuildStatic();let checks=0,roundtrips=0;
 for(let d=0;d<30;d++){
  for(let m=0;m<1440;m++){
   a.step();b.step();a.events.length=b.events.length=0;
   if(m%60===0){a.ensure();b.ensure();if(view.lastStruct!==a.s.structV){view.lastStruct=a.s.structV;view.rebuildStatic();}view.updateSky(.016);view.updateAnim(.016,view.nightK);view.updateDynamic(.016);checks++;}
  }
  assert.deepEqual(a.s,b.s,'rendered and non-rendered simulations diverged');assert.ok(Number.isFinite(a.s.cash));
  if(d%5===4){assert.deepEqual(new Sim(JSON.parse(JSON.stringify(a.s))).s,new Sim(JSON.parse(JSON.stringify(b.s))).s);roundtrips++;}
 }
 console.log(JSON.stringify({kind:'simulation-parity',seed,days:30,presentationSamples:checks,pairedSaveRoundtrips:roundtrips,cash:a.s.cash,units:a.objs('unit').length,agents:a.s.agents.length,tasks:a.s.tasks.length}));
}
assert.equal(warnings.length,0,warnings.join('\n'));
console.log('PASS dense rebuild/visibility/disposal, 5000 steady frames, three paired 30-day simulations and 18 paired state reloads. No FPS or human playtest claim.');
