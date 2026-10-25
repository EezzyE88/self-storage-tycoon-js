import assert from 'node:assert/strict';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeScenario} from '../../js/scenarios.js';
import {FLOOR_H} from '../../js/data.js';
import {targetUnits} from '../../js/comeback.js';
const WALL_H=1.25; // accepted drive-up height; test contract, not an exported rule
const Renderer=await loadRenderer(),canvas={clientWidth:390,clientHeight:844};let n=0,failed=0;
const test=(label,f)=>{try{f();console.log('PASS '+label);n++;}catch(e){failed++;console.error('FAIL '+label+' :: '+e.message);process.exitCode=1;}};
const sm=makeMaple(4401),r=new Renderer(canvas,sm);r.rebuildStatic();
test('drive-up piers and plinths use shared non-shadowing floor batches',()=>{
 const batches=r.staticG.children.filter(m=>['pier','foundation'].includes(m.userData.decoration));
 assert.ok(batches.length>=2);assert.ok(batches.every(m=>m.isInstancedMesh&&!m.castShadow));
 assert.equal(batches.filter(m=>m.userData.decoration==='foundation').reduce((n,m)=>n+m.count,0),sm.objs('unit').length);
 assert.equal(batches.filter(m=>m.userData.decoration==='pier').reduce((n,m)=>n+m.count,0),sm.objs('unit').filter(u=>u.access==='drive').length*2);
 const piers=batches.filter(m=>m.userData.decoration==='pier'),points=piers.flatMap(m=>Array.from({length:m.count},(_,i)=>({f:m.userData.f,x:m.instanceMatrix.array[i*16+12],y:m.instanceMatrix.array[i*16+13],z:m.instanceMatrix.array[i*16+14],h:m.instanceMatrix.array[i*16+5]})));
 for(const u of sm.objs('unit').filter(u=>u.access==='drive')){const cx=u.x+u.w/2,cz=u.y+u.h/2,side=[-u.dir[1],u.dir[0]],half=(u.dir[0]?u.h:u.w)*.46;for(const k of [-1,1])assert.equal(points.filter(p=>p.f===(u.f||0)&&Math.abs(p.x-(cx+u.dir[0]*(u.w/2+.025)+side[0]*half*k))<1e-4&&Math.abs(p.z-(cz+u.dir[1]*(u.h/2+.025)+side[1]*half*k))<1e-4&&Math.abs(p.y-((u.f||0)*FLOOR_H+WALL_H/2))<1e-4&&Math.abs(p.h-WALL_H)<1e-4).length,1,'one jamb on each side of the actual doorway');}
});
test('shell piers cut down and hide with the actual selected floor',()=>{
 const p=r.staticG.children.filter(m=>m.userData.shellPier);assert.ok(p.length>0);assert.ok(p.every(m=>!m.castShadow));
 r.setView(0);assert.ok(p.filter(m=>m.userData.wf===0).every(m=>m.visible&&m.scale.y===.45));assert.ok(p.filter(m=>m.userData.wf>0).every(m=>!m.visible));r.setView('ext');assert.ok(p.every(m=>m.visible&&m.scale.y>.45));
 const bases=r.staticG.children.filter(m=>m.userData.shellBase);assert.equal(bases.length,sm.objs('shell').length*4);r.setView(0);assert.ok(bases.every(m=>!m.visible));
});
test('status bands clear the projecting bay headers',()=>{
 for(const a of r.anim.filter(a=>a.k==='rollup'&&a.o.access==='drive')){
  const band=r.anim.find(b=>b.k==='unitStatus'&&b.o===a.o).mesh;
  assert.ok(band.position.y-band.scale.y/2>a.H+.125);
 }
});
test('shell entry portals preserve door positions and exact save state',()=>{
 const before=JSON.stringify(sm.s);r.rebuildStatic();r.drawGround();r.updateAnim(.016,0);assert.equal(JSON.stringify(sm.s),before);
 for(const m of r.staticG.children.filter(m=>m.userData.entryLintel||m.userData.entryPier)){assert.equal(sm.s.objects[m.userData.obj].type,'door');assert.equal(m.castShadow,false);}
});
// Open House has open-topped rooms, replacing the legacy rescueRoof animation path.
const tint=(v,u)=>{const b=[...v.openHouse.batches.values()].find(b=>b.kind==='ohWall'&&b.parts.some(p=>p.o===u)),i=b.parts.findIndex(p=>p.o===u);return [...b.mesh.instanceColor.array.slice(i*3,i*3+3)];};
const rgb=m=>[m.color.r,m.color.g,m.color.b].map(Math.fround);
test('six restored target room finishes update individually and leave unrelated rooms alone',()=>{
 const cb=makeScenario('comeback',4401),v=new Renderer(canvas,cb);v.rebuildStatic();const targets=cb.s.scenario.targets,units=targets.flatMap(t=>targetUnits(cb.s,t));assert.equal(units.length,6);
 const other=cb.objs('unit').find(u=>!units.includes(u)),unchanged=tint(v,other);for(const u of units)assert.deepEqual(tint(v,u),rgb(v.mat.comebackWorn));
 for(const target of targets){const u=targetUnits(cb.s,target)[0];cb.finishTask(cb.s.tasks.find(t=>t.obj===u.id),cb.s.agents.find(a=>a.role==='owner'),false);cb.poll();const before=JSON.stringify(cb.s);v.openHouse.update();assert.deepEqual(tint(v,u),rgb(v.mat.comebackRestored));assert.deepEqual(tint(v,other),unchanged);assert.equal(JSON.stringify(cb.s),before);}
 assert.equal(v.anim.filter(a=>a.k==='rollup'&&v.doorFinish(a.o)===v.mat.rescueDoorTurn).length,0);
});
test('access failure or malformed target cannot invent turnover finish in Open House',()=>{
 const cb=makeScenario('comeback',4401),v=new Renderer(canvas,cb);v.rebuildStatic();const target=cb.s.scenario.targets[0],u=targetUnits(cb.s,target)[0];
 cb.finishTask(cb.s.tasks.find(t=>t.obj===u.id),cb.s.agents.find(a=>a.role==='owner'),false);cb.poll();u.blocked=true;v.openHouse.update();assert.notDeepEqual(tint(v,u),rgb(v.mat.comebackWorn));
 u.commercial='unready';target.x+=1;const before=JSON.stringify(cb.s);v.openHouse.update();assert.deepEqual(tint(v,u),rgb(u.num%2?v.mat.unitWall:v.mat.unitWall2));assert.notEqual(v.doorFinish(u),v.mat.rescueDoorTurn);assert.equal(JSON.stringify(cb.s),before);
});
console.log('Refinement completion: '+n+' passed, '+failed+' failed; device readability and FPS remain separate');
