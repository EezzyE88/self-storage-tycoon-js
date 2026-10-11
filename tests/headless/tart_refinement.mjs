import assert from 'node:assert/strict';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeScenario} from '../../js/scenarios.js';
import {targetUnits} from '../../js/comeback.js';
const Renderer=await loadRenderer(),canvas={clientWidth:390,clientHeight:844};let n=0;
const test=(label,f)=>{f();console.log('PASS '+label);n++;};
const sm=makeMaple(4401),r=new Renderer(canvas,sm);r.rebuildStatic();
test('drive-up piers and plinths use shared non-shadowing floor batches',()=>{
 const batches=r.staticG.children.filter(m=>['pier','foundation'].includes(m.userData.decoration));
 assert.ok(batches.length>=2);assert.ok(batches.every(m=>m.isInstancedMesh&&!m.castShadow));
 assert.equal(batches.filter(m=>m.userData.decoration==='foundation').reduce((n,m)=>n+m.count,0),sm.objs('unit').length);
 assert.equal(batches.filter(m=>m.userData.decoration==='pier').reduce((n,m)=>n+m.count,0),sm.objs('unit').filter(u=>u.access==='drive').length*3);
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
test('six weathered target roofs restore one by one, without affecting unrelated units',()=>{
 const cb=makeScenario('comeback',4401),v=new Renderer(canvas,cb);v.rebuildStatic();const roofs=v.anim.filter(a=>a.k==='rescueRoof');assert.equal(roofs.length,6);assert.ok(roofs.every(a=>a.mesh.material===v.mat.rescueRoofTurn));
 for(const t of cb.s.scenario.targets){const u=targetUnits(cb.s,t)[0];cb.finishTask(cb.s.tasks.find(t=>t.obj===u.id),cb.s.agents.find(a=>a.role==='owner'),false);cb.poll();v.updateAnim(.016,0);assert.equal(roofs.find(a=>a.o===u).mesh.material,v.mat.roof);}
 assert.ok(roofs.every(a=>a.mesh.material===v.mat.roof));assert.equal(v.anim.filter(a=>a.k==='rollup'&&v.doorFinish(a.o)===v.mat.rescueDoorTurn).length,0);
});
test('roof grime cannot be invented by access failure or malformed target mapping',()=>{
 const cb=makeScenario('comeback',4401),v=new Renderer(canvas,cb);v.rebuildStatic();const a=v.anim.find(a=>a.k==='rescueRoof'),u=a.o;
 cb.finishTask(cb.s.tasks.find(t=>t.obj===u.id),cb.s.agents.find(a=>a.role==='owner'),false);cb.poll();u.blocked=true;v.updateAnim(.016,0);assert.equal(a.mesh.material,v.mat.roof);
 u.commercial='unready';a.target.x+=1;v.updateAnim(.016,0);assert.equal(a.mesh.material,v.mat.roof);assert.notEqual(v.doorFinish(u),v.mat.rescueDoorTurn);
});
console.log(n+' refinement regression groups passed; device readability and FPS remain separate');
