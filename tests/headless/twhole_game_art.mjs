import assert from 'node:assert/strict';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeScenario,makeSandbox} from '../../js/scenarios.js';
import {Sim} from '../../js/sim.js';
import {UNIT_STATUS,unitStatus} from '../../js/status.js';
import {targetUnits,targetInService} from '../../js/comeback.js';
const Renderer=await loadRenderer(),canvas={clientWidth:393,clientHeight:844};let n=0;
const test=(label,f)=>{f();console.log('PASS '+label);n++;};
const sm=makeMaple(4401),r=new Renderer(canvas,sm);r.rebuildStatic();
test('shared drive-up/interior/climate finishes differ in ordinary Maple and sandbox',()=>{
 const u=sm.objs('unit')[0],v={...u,access:'interior'},c={...v,env:'climate'};
 assert.equal(r.doorFinish(u),r.mat.door);assert.equal(r.doorFinish(v),r.mat.doorInt);assert.equal(r.doorFinish(c),r.mat.doorClimate);
 assert.equal(new Set([r.doorFinish(u),r.doorFinish(v),r.doorFinish(c)]).size,3);
 const sb=makeSandbox({kind:'free'}),q=new Renderer(canvas,sb);assert.equal(q.mat.door.color.getHex(),r.mat.door.color.getHex());assert.equal(q.mat.office.map,q.tx.office);
});
test('all eight states retain distinct bands and non-color shape marks',()=>{
 const o=r.anim.find(a=>a.k==='rollup').o,band=r.anim.find(a=>a.k==='unitStatus'&&a.o===o),mark=r.statusSlots.find(a=>a.o===o);
 const states=[['available',{cstate:'operating',commercial:'ready'}],['occupied',{cstate:'operating',commercial:'occupied'}],['reserved',{cstate:'operating',commercial:'reserved'}],['turnover',{cstate:'operating',commercial:'unready'}],['blocked',{cstate:'operating',commercial:'ready',blocked:true}],['handover',{cstate:'operating',commercial:'ready',blocked:true,accessHold:1}],['commission',{cstate:'ready',commercial:'ready'}],['construction',{cstate:'construction',commercial:'ready'}]];
 for(const [key,props]of states){Object.assign(o,{blocked:false,accessHold:null},props);assert.equal(unitStatus(o),key);r.updateAnim(.016,0);assert.equal(band.mesh.material,r.statusMaterials[key]);assert.equal(mark.batch.material,r.statusMarks[key]);}
 assert.equal(new Set(Object.values(UNIT_STATUS).map(s=>s.mark)).size,8);assert.equal(new Set(Object.values(r.statusMarks)).size,8);
});
test('blocked and handover states cannot invent cleaning scuffs',()=>{const u={type:'unit',access:'drive',env:'std',cstate:'operating',commercial:'occupied',blocked:true,accessHold:null};assert.equal(r.doorFinish(u),r.mat.door);u.accessHold=1;assert.equal(r.doorFinish(u),r.mat.door);u.commercial='unready';assert.equal(r.doorFinish(u),r.mat.doorTurn);});
const cb=makeScenario('comeback',4401),cr=new Renderer(canvas,cb);cr.rebuildStatic();
const finish=u=>{const task=cb.s.tasks.find(t=>t.obj===u.id);cb.finishTask(task,cb.s.agents.find(a=>a.role==='owner'),false);cb.poll();};
test('six valid turnover targets are localized and transform individually',()=>{const a=cr.anim.filter(a=>a.k==='comeback');assert.equal(a.length,6);assert.ok(a.every(x=>x.mesh.material===cr.mat.comebackWorn));const t=cb.s.scenario.targets[0],u=targetUnits(cb.s,t)[0];finish(u);const saved=JSON.stringify(cb.s);cr.updateAnim(.016,0);assert.equal(JSON.stringify(cb.s),saved);assert.equal(a.find(a=>a.o===u).mesh.material,cr.mat.comebackRestored);assert.equal(a.filter(a=>a.mesh.material===cr.mat.comebackRestored).length,1);});
test('valid occupied and reserved restoration, later access loss and turnover stay truthful',()=>{
 const t=cb.s.scenario.targets[0],u=targetUnits(cb.s,t)[0],a=cr.anim.find(a=>a.o===u&&a.k==='comeback');
 const L=Object.values(cb.s.leases)[0];u.lease=L.id;L.unit=u.id;
 for(const commercial of ['occupied','reserved']){u.commercial=commercial;assert.ok(targetInService(cb.s,t));cr.updateAnim(.016,0);assert.equal(a.mesh.material,cr.mat.comebackRestored);}
 u.blocked=true;cr.updateAnim(.016,0);assert.notEqual(a.mesh.material,cr.mat.comebackWorn);u.blocked=false;u.commercial='unready';cr.updateAnim(.016,0);assert.equal(a.mesh.material,cr.mat.comebackWorn);
});
test('malformed target mapping cannot decorate unrelated geometry',()=>{const a=cr.anim.find(a=>a.k==='comeback'),t=a.target;const old=t.x;t.x+=1;cr.updateAnim(.016,0);assert.equal(a.mesh.material,a.o.num%2?cr.mat.unitWall:cr.mat.unitWall2);t.x=old;});
test('office depth is batched and signage stays on the existing office',()=>{const fs=r.staticG.children.filter(m=>m.userData.officeFascia),sg=r.staticG.children.filter(m=>m.userData.officeSign);assert.equal(fs.length,1);assert.equal(sg.length,1);assert.equal(fs[0].userData.obj,sm.objs('office')[0].id);assert.equal(sg[0].userData.obj,fs[0].userData.obj);assert.ok(r.staticG.children.find(m=>m.userData.decoration==='frame').isInstancedMesh);});
test('shared status/finish materials survive rebuild without mesh or texture accumulation',()=>{let disposed=0;for(const m of [...Object.values(r.statusMarks),r.mat.door,r.mat.doorTurn])m.addEventListener('dispose',()=>disposed++);r.rebuildStatic();const count=r.staticG.children.length;for(let i=0;i<5;i++)r.rebuildStatic();assert.equal(r.staticG.children.length,count);assert.equal(disposed,0);const mats=new Set(r.statusSlots.map(a=>a.batch.material));assert.ok(mats.size<=8);});
test('ground view hides upper-floor frontage marks and reveals them on their floor',()=>{const m=r.staticG.children.find(m=>m.userData.statusMark);m.userData.f=1;r.setView(0);assert.equal(m.visible,false);r.setView(1);assert.equal(m.visible,true);r.setView('ext');assert.equal(m.visible,true);});
test('renderer property switch inherits shared art without Comeback identity leakage',()=>{const mirror=makeMaple(9,{mirror:true}),before=JSON.stringify(mirror.s);cr.sim=mirror;cr.clearDynamic();cr.rebuildStatic();cr.updateAnim(.016,0);assert.equal(cr.anim.filter(a=>a.k==='comeback').length,0);assert.equal(cr.anim.filter(a=>a.k==='rollup').length,mirror.objs('unit').length);assert.equal(JSON.stringify(mirror.s),before);});
test('save round-trip and stepping parity retain exact simulation/economy/RNG',()=>{const a=new Sim(JSON.parse(JSON.stringify(makeMaple(9).s))),b=new Sim(JSON.parse(JSON.stringify(a.s))),v=new Renderer(canvas,a);for(let i=0;i<180;i++){a.step();b.step();a.ensure();b.ensure();if(i%30===0)v.rebuildStatic();v.updateSky(.016);v.updateAnim(.016,0);v.updateDynamic(.016);}assert.deepEqual(a.s,b.s);assert.deepEqual(new Sim(JSON.parse(JSON.stringify(a.s))).s,new Sim(JSON.parse(JSON.stringify(b.s))).s);});
console.log(n+' whole-game art regression groups passed; actual rendering and physical acceptance are separate');
