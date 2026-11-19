import assert from 'node:assert/strict';
import {makePublicMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {accessState} from '../../js/mapleaccess.js';

const sim=makePublicMaple();
const front=sim.idx(8,21), rear=sim.idx(5,19), inside=sim.idx(23,23), outside=sim.idx(23,24);
for (const role of ['owner','porter','tech','manager','clerk']) {
  if (role !== 'owner') assert.ok(sim.dispatch({type:'hire',role}).ok);
  const worker=sim.s.agents.find(a=>a.role===role);
  for (const [start,end] of [[front,rear],[rear,front],[outside,inside],[inside,outside],[outside,sim.idx(20,10)]]) {
    const path=sim.pedPath(start,end,worker);
    assert.ok(path,role+' needs a path');
    if (start === inside || end === inside) assert.equal(path.length,2,'staff gate crossing');
    if (start === front || end === front) assert.ok(path.includes(sim.idx(5,20)),'through the rear office door');
  }
  console.log('PASS '+role+' can reach both office doors, both sides of the gate and the interior hall');
}
const shopper={kind:'cust',publicVisit:true};
assert.equal(sim.pedPath(front,rear,shopper),null);
assert.equal(sim.pedPath(outside,inside,shopper),null);
const owner=sim.s.agents.find(a=>a.role==='owner');
assert.ok(!sim.pedNbr(sim.idx(8,20),owner).includes(sim.idx(8,19)),'solid fence stays closed');
assert.ok(!sim.pedNbr(sim.idx(6,21),owner).includes(sim.idx(6,22)),'no shortcut through office walls');
console.log('PASS restricted shopper and physical fence/wall boundaries');
const original=makePublicMaple();
original.s.visits=[]; original.dispatch({type:'hire',role:'porter'});
const porter=original.s.agents.find(a=>a.role==='porter');
Object.assign(porter,{x:23.5,y:24.5,hidden:false,st:'idle'});
const resumed=new Sim(JSON.parse(JSON.stringify(original.s)));
const p=resumed.s.agents.find(a=>a.id===porter.id);
const before=resumed.s.cash;
assert.equal(resumed.s.speed,0);
assert.ok(accessState(resumed).workers.has(p.id),'Build checks include a staff member on the gate approach');
const states=new Set();let crossed=false;
for(let tick=0;tick<420;tick++) {
  const y=p.y;resumed.step();states.add(p.st);
  if (y>=24 && p.y<24) { assert.equal(resumed.objs('gate')[0].open,1);crossed=true; }
  if (states.has('work') && p.st==='office')break;
}
assert.ok(crossed && states.has('walk') && states.has('work'));
assert.equal(resumed.s.objects[resumed.s.unitRoles.mapleTurnover].commercial,'ready');
assert.equal(p.st,'office');assert.ok(p.hidden);assert.equal(resumed.s.cash,before);
assert.equal(resumed.s.speed,0);
console.log('PASS resumed Porter crosses an open gate, completes make-ready and returns to the office');
