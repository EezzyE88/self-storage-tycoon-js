// Focused geometry contract extracted from 0526ab8's tart_refinement check.
// CPU scene construction with real Three.js matrices; Canvas/WebGL are stubbed.
// This is not rendered-browser, Safari, performance, or gameplay evidence.
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.min.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {FLOOR_H} from '../../js/data.js';
const Renderer=await loadRenderer(),WALL_H=1.25,epsilon=1e-4;
const close=(a,b)=>Math.abs(a-b)<epsilon;
function verify(units,meshes){
 const batches=meshes.filter(m=>m.userData.decoration==='pier');
 assert.ok(batches.every(m=>m.isInstancedMesh&&!m.castShadow&&m.receiveShadow));
 const points=batches.flatMap(m=>Array.from({length:m.count},(_,i)=>{
  const a=m.instanceMatrix.array,j=i*16;
  return {f:m.userData.f,x:a[j+12],y:a[j+13],z:a[j+14],w:a[j],h:a[j+5],d:a[j+10]};
 }));
 const drive=units.filter(u=>u.access==='drive'&&u.cstate!=='construction');
 assert.equal(points.length,drive.length*2,'exactly two jambs per completed drive-up unit');
 for(const u of drive){
  const cx=u.x+u.w/2,cz=u.y+u.h/2,half=(u.dir[0]?u.h:u.w)*.46;
  for(const k of [-1,1]){
   const x=cx+u.dir[0]*(u.w/2+.025)-u.dir[1]*half*k;
   const z=cz+u.dir[1]*(u.h/2+.025)+u.dir[0]*half*k;
   const matches=points.filter(p=>p.f===(u.f||0)&&close(p.x,x)&&close(p.z,z));
   assert.equal(matches.length,1,`unit ${u.id}: exactly one jamb at side ${k} (${x}, ${z})`);
   const p=matches[0];
   assert.ok(close(p.y,(u.f||0)*FLOOR_H+WALL_H/2),'floor-relative height');
   assert.ok(close(p.w,u.dir[0]?.18:.16)&&close(p.h,WALL_H)&&close(p.d,u.dir[0]?.16:.18),'unchanged jamb dimensions');
  }
 }
 return drive.length;
}
// Injected geometry fixtures cover all doorway directions, unequal dimensions,
// floor elevation, indoor exclusion and construction exclusion. No saved company.
const units=[];
for(const f of [0,1,2])for(const [i,dir] of [[1,0],[-1,0],[0,1],[0,-1]].entries())
 units.push({id:units.length+1,type:'unit',x:i*10,y:f*10,w:2,h:3,dir,f,access:'drive',cstate:'operating'});
units.push({id:90,type:'unit',x:50,y:0,w:2,h:3,dir:[1,0],f:0,access:'interior',cstate:'operating'},
 {id:91,type:'unit',x:60,y:0,w:2,h:3,dir:[1,0],f:0,access:'drive',cstate:'construction'});
const fixture={units},before=JSON.stringify(fixture),meshes=[];
const r=Object.create(Renderer.prototype);
r.sim={s:fixture,objs:type=>type==='unit'?units:[]};
r.geo={box:new THREE.BoxGeometry(1,1,1)};
const material=new THREE.MeshBasicMaterial();
r.mat={darkMetal:material,roofTrim:material,foundation:material,pier:material};
r.add=(mesh,f,data)=>{mesh.userData={...data,f};meshes.push(mesh);};
r.buildArchitectureDetail();
assert.equal(verify(units,meshes),12);
assert.equal(JSON.stringify(fixture),before,'geometry construction must not alter fixture state');
console.log('PASS injected geometry: 24 distinct jambs, four directions, three floors, dimensions and exclusions');
const sim=makeMaple(4401),v=new Renderer({clientWidth:390,clientHeight:844},sim);
const state=JSON.stringify(sim.s);v.rebuildStatic();
const count=verify(sim.objs('unit'),v.staticG.children);
assert.ok(count>0);assert.equal(JSON.stringify(sim.s),state,'full rebuild must preserve exact simulation/save state');
console.log(`PASS seeded Maple scene: ${count*2} jamb positions and unchanged complete simulation/save state`);
console.log('Doorway jamb geometry complete; rendered appearance remains NOT TESTED');
