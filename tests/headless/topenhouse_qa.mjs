// CPU scene tests. No rendered WebGL, physical Safari or user playtest claim.
import assert from 'node:assert/strict';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeScenario} from '../../js/scenarios.js';
import {targetUnits} from '../../js/comeback.js';
const Renderer=await loadRenderer(),canvas={clientWidth:390,clientHeight:844};
let failed=0,passed=0;
function test(name,f){try{f();passed++;console.log('PASS '+name)}catch(e){failed++;console.log('FAIL '+name+' :: '+e.message)}}
function scene(sim=makeMaple(4401)){sim.ensure();const r=new Renderer(canvas,sim);r.rebuildStatic();return r;}
function color(r,o){const b=[...r.openHouse.batches.values()].find(b=>b.kind==='ohWall'&&b.parts.some(p=>p.o===o)),i=b.parts.findIndex(p=>p.o===o);return [...b.mesh.instanceColor.array.slice(i*3,i*3+3)];}
function expected(r,o,target){const mat=r.comebackFinish(o,target);return [mat.color.r,mat.color.g,mat.color.b].map(v=>Math.fround(v));}
test('restoration follows access loss without a commercial or lease change',()=>{
 const sim=makeScenario('comeback',4401),r=scene(sim),target=sim.s.scenario.targets[0],u=targetUnits(sim.s,target)[0];
 u.commercial='ready';u.blocked=false;u.missing=[];r.openHouse.update();assert.deepEqual(color(r,u),expected(r,u,target));
 u.blocked=true;r.openHouse.update();assert.deepEqual(color(r,u),expected(r,u,target),'wall retained a restored finish after access was lost');
});
test('restoration follows missing-service changes without a lease change',()=>{
 const sim=makeScenario('comeback',4401),r=scene(sim),target=sim.s.scenario.targets[0],u=targetUnits(sim.s,target)[0];
 u.commercial='ready';u.blocked=false;u.missing=[];r.openHouse.update();u.missing=['Power'];r.openHouse.update();assert.deepEqual(color(r,u),expected(r,u,target),'wall retained a restored finish with a missing service');
});
test('cutaway changes exactly when a facing wall crosses its threshold',()=>{
 const r=scene(),b=[...r.openHouse.batches.values()].find(b=>b.kind==='ohWall'),i=b.parts.findIndex(p=>p.nx===1),p=b.parts[i];assert.ok(i>=0);
 r.camera.position.x=r.center.x+.09999;r.camera.position.z=r.center.z+Math.sqrt(1-.09999**2);r.openHouse.update();assert.ok(Math.abs(b.mesh.instanceMatrix.array[i*16+5]-p.h)<1e-5);
 r.camera.position.x=r.center.x+.10001;r.camera.position.z=r.center.z+Math.sqrt(1-.10001**2);r.openHouse.update();assert.ok(Math.abs(b.mesh.instanceMatrix.array[i*16+5]-.16)<1e-5,'wall cache rounded away a real threshold crossing');
});
test('steady frames do not rescan the entire task array for each room',()=>{
 const r=scene();let calls=0;const tasks=r.sim.s.tasks,original=tasks.some;tasks.some=function(...args){calls++;return original.apply(this,args)};
 for(let i=0;i<120;i++)r.openHouse.update();delete tasks.some;
 assert.ok(calls<=120,'task-array full scans='+calls+' across 120 unchanged frames');
});
test('small rotations inside the same cutaway region do not reupload every instance',()=>{
 const r=scene();r.camera.position.x=r.center.x+1;r.camera.position.z=r.center.z+1;r.openHouse.update();
 const b=[...r.openHouse.batches.values()].find(b=>b.kind==='ohCrate'),version=b.mesh.instanceMatrix.version;
 r.camera.position.x=r.center.x+1.01;r.openHouse.update();assert.equal(b.mesh.instanceMatrix.version,version,'unchanged wall cuts rewrote content matrices');
});
test('unit floors sit above the inherited foundation slab',()=>{
 const r=scene(),b=[...r.openHouse.batches.values()].find(b=>b.kind==='ohFloor'),p=b.parts.find(p=>p.o.type==='unit');
 const mesh=r.staticG.children.find(m=>m.userData.decoration==='foundation');assert.ok(mesh);
 let foundationTop=-Infinity;const a=mesh.instanceMatrix.array;
 for(let i=0;i<mesh.count;i++)if(Math.abs(a[i*16+12]-p.x)<.001&&Math.abs(a[i*16+14]-p.z)<.001)foundationTop=Math.max(foundationTop,a[i*16+13]+a[i*16+5]/2);
 assert.ok(p.y+p.h/2>foundationTop+.001,'floor top '+(p.y+p.h/2)+' is hidden below foundation top '+foundationTop);
});
test('contents rest on the room floor instead of sinking through it',()=>{
 const r=scene();for(const b of r.openHouse.batches.values())if(['ohCrate','ohSofa','ohTool','ohCounter'].includes(b.kind))for(const p of b.parts)assert.ok(p.y-p.h/2>=.1-1e-8,b.kind+' base '+(p.y-p.h/2)+' is below floor top .1');
});
console.log(JSON.stringify({passed,failed,environment:'CPU scene graph; Canvas/WebGL stubbed'}));process.exitCode=failed?1:0;
