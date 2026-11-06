import assert from 'node:assert/strict';
import { MapleVisualLab } from '../../js/visual-lab.js';
class Color { constructor(value) { this.value=value; } clone(){return new Color(this.value);} set(v){this.value=v;} copy(v){this.value=v.value;} }
const mat = Object.fromEntries(['unitWall','roof','door','cart','metal','office'].map(key=>[key,{color:new Color('baseline:'+key),roughness:.85,needsUpdate:false}]));
const a={id:101,kind:'cust',unit:5,veh:3,st:'walk',hidden:false};
const sim={s:{speed:1,agents:[a],objects:{5:{access:'interior'}},vehicles:[{id:3,parked:42}],cash:26000,leases:{},t:100}};
const renderer={mat,sim};const lab=new MapleVisualLab(renderer);
const before=structuredClone(sim.s);const original=Object.fromEntries(Object.entries(mat).map(([k,m])=>[k,[m.color.value,m.roughness]]));
assert.equal(lab.enabled,false);assert.equal(lab.setEnabled(true),true);
assert.equal(mat.roof.color.value,'#366b70');assert.equal(mat.door.roughness,.50);
assert.deepEqual(sim.s,before); // visual edits never alter sim
assert.deepEqual(lab.currentVisit(),{agentId:101,unitId:5,phase:'walk',hidden:false,vehicleId:3,parkingCell:42,speed:1});
lab.setEnabled(true);assert.equal(mat.roof.color.value,'#366b70'); // idempotent
sim.s.speed=0;assert.equal(lab.currentVisit().speed,0);assert.equal(lab.enabled,true); // no Pause mutation
sim.s.speed=1;
lab.setEnabled(false);
for(const [k,m] of Object.entries(mat)) assert.deepEqual([m.color.value,m.roughness],original[k]);
assert.deepEqual(sim.s,before);
assert.equal(lab.currentVisit().phase,'walk');
lab.setEnabled(true);lab.dispose();assert.equal(lab.enabled,false);
for(const [k,m] of Object.entries(mat)) assert.deepEqual([m.color.value,m.roughness],original[k]);
a.unit=999;assert.equal(lab.currentVisit(),null); // no invented visitor
assert.throws(()=>new MapleVisualLab({}),TypeError);
console.log('PASS 12 focused checks: reversible visuals, read-only visit, Pause, exact restore, missing unit, construction guard');
