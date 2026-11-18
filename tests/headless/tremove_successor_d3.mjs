// Remove successor D3: on a numbered floor, Demolish targets an exact completed, otherwise-empty hallway cell
// instead of its building; the building stays removable from its panel and the exterior view.
// Native simulation + production UI replan/removalActions; rendered qualification is separate.
import assert from 'node:assert/strict';
import {fixture} from './transaction-fixture.mjs';
import {makeSandbox} from '../../js/scenarios.js';
import {Sim} from '../../js/sim.js';
let groups=0;const test=(n,fn)=>{fn();groups++;console.log('PASS '+n);};
const fresh=()=>makeSandbox({kind:'business',start:'empty',cash:500000,instant:true,tiers:'all'});
const B=(s,tool,x,y,b={x,y},e={})=>{const r=s.dispatch({type:'build',tool,a:{x,y},b,f:0,...e});assert.ok(r.ok,tool+': '+r.msg);return s.s.orders.find(q=>q.id===r.order).objs.map(id=>s.s.objects[id]);};
function yard(units=false){const s=fresh();B(s,'gate',5,29);B(s,'aisle',5,13,{x:9,y:28});B(s,'loading',5,13,{x:9,y:13});B(s,'walk',9,4,{x:9,y:12});const b=B(s,'shell2',10,2,{x:19,y:12})[0];for(let f=0;f<2;f++)B(s,'hall',10,2,{x:10,y:12},{f});B(s,'doorWide',10,4);for(let f=0;f<2;f++)B(s,'light',10,4,undefined,{f});const e=B(s,'elevator',11,3)[0];
 if(units){B(s,'iu5x5',11,8,{x:11,y:10},{rotation:3});B(s,'iu5x5',11,8,{x:11,y:10},{rotation:3,f:1});for(let f=0;f<2;f++)B(s,'light',10,9,undefined,{f});s.markDirty();s.ensure();}return {s,b,e};}
const plan=(s,x,y,f,floorView=true)=>s.plan({tool:'demolish',a:{x,y},b:{x,y},f,floorView});
const snapCells=(s,cells)=>cells.map(([x,y,f])=>s.s.hall[f][s.idx(x,y)]);
test('floor view selects the exact completed hallway cell on Floors 1 and 2; exterior/default keeps the building',()=>{
 const {s,b}=yard();for(const f of [0,1]){const p=plan(s,10,6,f);assert.deepEqual(p.operation.descriptor,{kind:'surface',x:10,y:6,f,layer:'hall'});assert.equal(p.operation.name,`Hallway cell (10, 6) · Floor ${f+1}`);assert.equal(p.cost,5);assert.equal(p.status,'valid',p.missing?.join(';'));}
 assert.equal(plan(s,10,6,0,false).operation.descriptor.id,b.id,'without a floor view the building is the target');
 assert.equal(plan(s,14,6,1).operation.descriptor.id,b.id,'non-hallway floor area still targets the building');
 const lit=plan(s,10,4,0);assert.notEqual(lit.operation.descriptor.kind,'surface','an occupied cell targets its asset, not the hallway');
});
test('eligible removal changes only that cell on that floor; neighbours, other floor and building intact; charge once; Pause kept; save continues',()=>{
 const {s,b}=yard();const cells=[[10,5,1],[10,7,1],[10,6,0],[10,5,0],[10,7,0]],before=snapCells(s,cells),floors=b.floors,objN=Object.keys(s.s.objects).length,cash=s.s.cash,ledger=s.s.ledger.length;
 const p=plan(s,10,6,1),q=p.operation;const r=s.dispatch({type:'remove',target:q.descriptor,stamp:q.stamp});assert.ok(r.ok,r.msg);
 assert.equal(s.s.hall[1][s.idx(10,6)],0);assert.deepEqual(snapCells(s,cells),before);assert.ok(s.s.objects[b.id]);assert.equal(s.s.objects[b.id].floors,floors);assert.equal(Object.keys(s.s.objects).length,objN);
 assert.equal(s.s.cash,cash-5);assert.equal(s.s.ledger.length,ledger+1);assert.match(s.s.ledger.at(-1).note,/Demolition: Hallway cell \(10, 6\) · Floor 2/);assert.equal(s.s.speed,0);
 assert.equal(s.dispatch({type:'remove',target:q.descriptor,stamp:q.stamp}).ok,false,'no second charge');assert.equal(s.s.cash,cash-5);
 const copy=new Sim(JSON.parse(JSON.stringify(s.s)));assert.equal(copy.s.hall[1][copy.idx(10,6)],0);for(let i=0;i<20;i++){s.step();copy.step();}assert.equal(JSON.stringify(s.s),JSON.stringify(copy.s));
});
test('required access blocks the hallway cell on Floors 1 and 2 with nothing changed',()=>{
 for(const f of [0,1]){const {s}=yard(true);const units=s.objs('unit').filter(u=>(u.f||0)===f);assert.ok(units.length&&units.every(u=>!u.blocked&&!u.missing?.length),units.map(u=>u.missing).join(';'));
  const cut=f===0?[10,6]:[10,7];const before=JSON.stringify(s.s),q=plan(s,cut[0],cut[1],f).operation;assert.equal(q.descriptor.kind,'surface');assert.equal(q.classification,'blocked',`F${f+1} should block`);assert.match(q.prerequisites.join(' '),/access|route|elevator/i);
  assert.equal(s.dispatch({type:'remove',target:q.descriptor,stamp:q.stamp}).ok,false);assert.equal(JSON.stringify(s.s),before);}
});
test('production UI: floor view replan targets the hallway cell; building panel still offers whole-building removal',()=>{
 const f=fixture(0),{s,b}=yard();f.g.sim=s;Object.assign(f.g.rend,{view:1,setPreview(){}});const ui=f.ui;ui.tool='demolish';ui.planArgs={a:{x:10,y:6},b:{x:10,y:6}};ui.replan();
 assert.equal(ui.plan.args.floorView,true);assert.deepEqual(ui.plan.operation.descriptor,{kind:'surface',x:10,y:6,f:1,layer:'hall'});
 f.g.rend.view='ext';ui.planArgs={a:{x:10,y:6},b:{x:10,y:6}};ui.replan();assert.equal(ui.plan.operation.descriptor.id,b.id,'exterior view keeps the building');
 ui.tool=null;ui.sel=b.id;assert.match(ui.removalActions(),new RegExp(`data-a="removeObject" data-v="${b.id}">Remove building…`));const whole=s.placeableRemoval(b.id);assert.notEqual(whole.classification,'blocked',whole.prerequisites.join(';'));
});
console.log(`ALL PASS: ${groups} Remove successor D3 groups`);
