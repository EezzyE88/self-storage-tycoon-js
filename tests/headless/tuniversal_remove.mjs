import {fixture,click} from './transaction-fixture.mjs';
import assert from 'node:assert/strict';
import {makeSandbox,makeScenario} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {TOOLS,G,SIZES} from '../../js/data.js';
const snap=s=>JSON.stringify(s.s), covered=new Set();let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function fresh(){return makeSandbox({kind:'business',start:'empty',cash:500000,instant:true,tiers:'all'});}
const args=(tool,x,y,b={x,y},extra={})=>({tool,a:{x,y},b,f:0,...extra});
function build(s,a){const r=s.dispatch({type:'build',...a});assert.ok(r.ok,`${a.tool}: ${r.msg}`);const ord=s.s.orders.find(q=>q.id===r.order);return ord.objs.map(id=>s.s.objects[id]).filter(Boolean);}
function shell(s,two=true){return build(s,args(two?'shell2':'shell1',10,2,{x:19,y:12}))[0];}
function halls(s){for(let f=0;f<2;f++)build(s,args('hall',10,2,{x:10,y:12},{f}));}
function remove(s,target){const before=snap(s),q=s.placeableRemoval(target);assert.equal(snap(s),before,'pure preview');assert.notEqual(q.classification,'blocked',q.prerequisites.join(';'));const cash=s.s.cash,ledger=s.s.ledger.length;let r=s.dispatch({type:'remove',target,stamp:q.stamp});assert.ok(r.ok,r.msg);assert.equal(s.s.cash,cash-q.cost);assert.equal(s.s.ledger.length,ledger+(q.cost?1:0));assert.equal(s.s.speed,0);const after=snap(s);assert.equal(s.dispatch({type:'remove',target,stamp:q.stamp}).ok,false);assert.equal(snap(s),after);return q;}
function deny(s,target,pattern){const q=s.placeableRemoval(target),before=snap(s);assert.equal(q.classification,'blocked');if(pattern)assert.match(q.prerequisites.join(' '),pattern);assert.equal(s.dispatch({type:'remove',target,stamp:q.stamp}).ok,false);assert.equal(snap(s),before);return q;}
test('all eight unit tools remove at unchanged costs and rebuild without reusing retired numbers',()=>{
 for(const k of Object.keys(TOOLS).filter(k=>TOOLS[k].unit)){
 const s=fresh();if(k.startsWith('iu')){shell(s);halls(s);}
 const x=k.startsWith('iu')?11:25,y=5,extra=k.startsWith('iu')?{rotation:3}:{rotation:0};const a=args(k,x,y,k.startsWith('iu')?{x,y:y+SIZES[TOOLS[k].size].w-1}:{x:x+SIZES[TOOLS[k].size].w-1,y},extra),us=build(s,a),u=us[0];assert.equal(us.length,1);const number=u.num,id=u.id;qcost: {const q=remove(s,id);assert.equal(q.cost,60+SIZES[u.size].sqft*.6);}assert.ok(!s.s.objects[id]);const newU=build(s,a)[0];assert.notEqual(newU.num,number);assert.notEqual(newU.id,id);covered.add(k);
 }
});
test('existing equipment and new keypad remove with exact charges; door remains for keypad-only removal',()=>{
 for(const k of ['office','gate','canopy','doorStd','doorWide','doorAuto','elevator','stairs','light','camera','power','water','hvac','restroom','fountain','corral','keypad']){
  const s=fresh();let o;
  if(['doorStd','doorWide','doorAuto','elevator','stairs','water','hvac','restroom','fountain','keypad'].includes(k)){shell(s);halls(s);}
  if(k==='office')o=build(s,args(k,28,10,undefined,{rotation:0}))[0];
  else if(k==='gate')o=build(s,args(k,5,29))[0];
  else if(k==='canopy'){build(s,args('walk',9,3,{x:9,y:6}));shell(s,false);o=build(s,args(k,9,3,{x:9,y:6}))[0];}
  else if(k.startsWith('door'))o=build(s,args(k,10,4))[0];
  else if(['elevator','stairs'].includes(k))o=build(s,args(k,11,8))[0];
  else if(['water','hvac'].includes(k))o=build(s,args(k,9,4))[0];
  else if(k==='restroom')o=build(s,args(k,11,6))[0];
  else if(k==='fountain')o=build(s,args(k,10,6))[0];
  else if(k==='corral'){build(s,args('walk',25,15));o=build(s,args(k,25,15))[0];}
  else if(k==='keypad'){const d=build(s,args('doorStd',10,4))[0];build(s,args(k,10,4));const q=remove(s,{kind:'keypad',id:d.id});assert.equal(q.cost,100);assert.ok(s.s.objects[d.id]);assert.equal(s.s.objects[d.id].keypad,null);covered.add(k);continue;}
  else o=build(s,args(k,25,15))[0];
  const q=remove(s,o.id);assert.equal(q.cost,k==='office'?360:100);covered.add(k);
 }
});
test('all ground layers and hallway exact-cell removal preserve unrelated cells and layers',()=>{
 for(const k of ['aisle','loading','parking','walk','hall']){
 const s=fresh();let a;if(k==='hall'){shell(s);a=args(k,10,3,{x:10,y:5});}
 else {if(['loading','parking'].includes(k))build(s,args('aisle',25,15,{x:26,y:15}));a=args(k,25,15,{x:26,y:15});}build(s,a);
 const target={kind:'surface',x:a.a.x,y:a.a.y,f:0,layer:k==='hall'?'hall':'ground'},idx=s.idx(a.a.x,a.a.y),other=s.idx(a.b.x,a.b.y),untouched=k==='hall'?s.s.hall[0][other]:s.s.ground[other];const q=remove(s,target);assert.equal(q.cost,5);assert.equal(k==='hall'?s.s.hall[0][idx]:s.s.ground[idx],k==='hall'?0:['loading','parking'].includes(k)?G.ASPHALT:G.GRASS);assert.equal(k==='hall'?s.s.hall[0][other]:s.s.ground[other],untouched);covered.add(k);
 }
});
test('shell1/shell2 and top floor cover structure exactly once; halls included; reinforcement retained',()=>{
 for(const k of ['shell1','shell2']){const s=fresh(),b=build(s,args(k,10,2,{x:19,y:12}))[0];build(s,args('hall',10,2,{x:10,y:4}));const q=remove(s,b.id);assert.equal(q.cost,(60+110*15)*(k==='shell2'?2:1));assert.ok(s.s.hall.every(h=>!h[s.idx(10,3)]));covered.add(k);}
 const s=fresh(),b=shell(s);halls(s);b.structuralRightsPaid=440;b.plannedMaxFloors=3;s.markDirty();s.ensure();const q=remove(s,{kind:'floor',id:b.id,f:1});assert.equal(q.cost,1710);assert.equal(b.floors,1);assert.equal(b.structuralRightsPaid,440);assert.equal(b.plannedMaxFloors,3);assert.equal(s.s.hall[0][s.idx(10,4)],1);assert.equal(s.s.hall[1][s.idx(10,4)],0);
});
test('parent price equals sequential distinct assets; mounted fixtures are included once with host',()=>{
 const s=fresh(),b=shell(s,false);build(s,args('hall',10,2,{x:10,y:10}));const u=build(s,args('iu5x10',11,4,undefined,{rotation:3}))[0],l=build(s,args('light',10,6))[0];
 const id=s.id();s.s.objects[id]={id,type:'unitLight',x:u.x,y:u.y,f:0,cstate:'operating',mount:{host:u.id}};s.markDirty();s.ensure();
 const parent=s.placeableRemoval(b.id);assert.notEqual(parent.classification,'blocked',parent.prerequisites.join(';'));assert.equal(parent.charges.filter(c=>c.key===`object:${id}`).length,0);
 const copy=new Sim(structuredClone(s.s));let sum=remove(copy,u.id).cost+remove(copy,l.id).cost+remove(copy,b.id).cost;assert.equal(parent.cost,sum);remove(s,b.id);assert.ok(!s.s.objects[id]);
});
test('individual mounted fixtures preserve host and quote exact100; cart disposal clears last-corral dependency',()=>{
 for(const type of ['unitLight','light','camera']){const s=fresh(),u=build(s,args('du5x5',25,15))[0],id=s.id();s.s.objects[id]={id,type,x:u.x,y:u.y,f:0,cstate:'operating',cond:1,mount:{host:u.id,dir:[0,-1],frontage:{x:25,y:14},x:25.5,y:15,indoor:false}};s.markDirty();s.ensure();assert.equal(remove(s,id).cost,100);assert.ok(s.s.objects[u.id]);}
 const s=fresh();build(s,args('walk',25,15));const c=build(s,args('corral',25,15))[0];assert.ok(s.dispatch({type:'buyCarts',corral:c.id,n:2}).ok);deny(s,c.id,/Dispose/);for(const cart of [...s.s.carts])assert.equal(remove(s,{kind:'cart',id:cart.id}).cost,0);remove(s,c.id);assert.equal(s.s.carts.length,0);
});
test('occupied/reserved, unfinished work, active tasks/users and stale property identity reject atomically',()=>{
 for(const mutate of [(s,u)=>u.lease=999,(s,u)=>u.commercial='reserved',(s,u)=>u.cstate='construction',(s,u)=>s.s.tasks.push({id:s.id(),obj:u.id,assigned:99}),(s,u)=>s.s.agents.push({id:s.id(),kind:'cust',unit:u.id})]){const s=fresh(),u=build(s,args('du5x5',25,15))[0];mutate(s,u);s.markDirty();s.ensure();deny(s,u.id);}
 for(const mutate of [(s,u)=>s.s.cash--,(s,u)=>u.cond=.1,(s,u)=>{const id=s.id();s.s.objects[id]={id,type:'unitLight',x:u.x,y:u.y,cstate:'operating',mount:{host:u.id}};}]){const s=fresh(),u=build(s,args('du5x5',25,15))[0],q=s.placeableRemoval(u.id);mutate(s,u);const before=snap(s);assert.equal(s.dispatch({type:'remove',target:u.id,stamp:q.stamp}).ok,false);assert.equal(snap(s),before);}
 const s=fresh(),u=build(s,args('du5x5',25,15))[0],q=s.placeableRemoval(u.id),other=new Sim(structuredClone(s.s));assert.equal(other.dispatch({type:'remove',target:u.id,stamp:q.stamp}).ok,false);
});
test('Maple entrance/ground loss is blocked while original new-build placement defect stays separate',()=>{
 let s=makeMaple();deny(s,s.objs('door')[0].id,/access/);deny(s,{kind:'surface',x:20,y:13,f:0,layer:'ground'},/access/);
 const p=s.plan(args('du5x5',20,13,undefined,{rotation:0}));assert.notEqual(p.status,'invalid');assert.ok(!p.warn?.some(w=>/retained|cut off/.test(w)),'placement workstream remains unchanged');
});
test('empty-site close-and-remove preserves expenses/debt and normal reopen rules',()=>{
 const s=fresh(),o=build(s,args('office',28,10,undefined,{rotation:0}))[0];s.s.open=true;const loan=JSON.stringify(s.s.loan),staff=JSON.stringify(s.s.staff);const q=remove(s,o.id);assert.equal(q.mutation.closeProperty,true);assert.equal(s.s.open,false);assert.equal(JSON.stringify(s.s.loan),loan);assert.equal(JSON.stringify(s.s.staff),staff);assert.equal(s.dispatch({type:'open'}).ok,false);
});
test('JSON save roundtrip after removal preserves deterministic continuation and Pause',()=>{
 const s=fresh();const o=build(s,args('du5x5',25,15))[0];remove(s,o.id);const copy=new Sim(JSON.parse(snap(s)));assert.equal(copy.s.speed,0);for(let i=0;i<30;i++){s.step();copy.step();}assert.equal(snap(s),snap(copy));
});
test('equivalent freight elevator permits removal; absent/failed/unpowered alternatives and riders block',()=>{
 function yard(){const s=fresh();build(s,args('gate',5,29));build(s,args('aisle',5,13,{x:9,y:28}));build(s,args('loading',5,13,{x:9,y:13}));build(s,args('walk',9,4,{x:9,y:12}));const b=shell(s);halls(s);build(s,args('doorWide',10,4));for(let f=0;f<2;f++)build(s,args('light',10,4,undefined,{f}));const first=build(s,args('elevator',11,5))[0],second=build(s,args('elevator',11,8))[0],u=build(s,args('iu5x5',11,4,undefined,{f:1,rotation:3}))[0];u.cstate='operating';u.commercial='ready';s.markDirty();s.ensure();assert.equal(u.blocked,false,u.missing.join(';'));return {s,b,u,first,second};}
 let a=yard();remove(a.s,a.first.id);assert.equal(a.s.s.objects[a.u.id].blocked,false);assert.ok(a.s.s.objects[a.second.id]);
 for(const change of [a=>{a.second.cond=.1;},a=>{a.s.s.powerBase=0;},a=>{delete a.s.s.objects[a.second.id];},a=>{a.first.riders=[{a:999,dest:1,slots:1}];}]){a=yard();change(a);a.s.markDirty();a.s.ensure();deny(a.s,a.first.id);}
});
test('production Remove review/Cancel/Confirm preserves manual Pause and refuses stale property',()=>{
 const f=fixture(0),{ui,g,A}=f;g.rend.setPreview=()=>{};g.rend.setSelection=()=>{};ui.root={querySelectorAll:()=>[]};ui.syncFloorUi=()=>{};ui.select=()=>{};
 const o=A.objs('light')[0],before=snap(A);click(f,'removeObject',String(o.id));assert.match(ui.$('modal').innerHTML,/Confirm removal/);assert.match(ui.$('modal').innerHTML,/Cancel/);click(f,'modalClose');assert.equal(snap(A),before);
 click(f,'removeObject',String(o.id));click(f,'removeConfirm');assert.ok(!A.s.objects[o.id]);assert.equal(A.s.speed,0);assert.ok(f.saves>0);const after=snap(A);click(f,'removeConfirm');assert.equal(snap(A),after);
 const other=A.objs('light')[0];click(f,'removeObject',String(other.id));g.sim=f.B;const b=snap(f.B);click(f,'removeConfirm');assert.equal(snap(f.B),b);assert.ok(A.s.objects[other.id]);
 const s=fresh();build(s,args('walk',25,15));s.s.agents.push({id:999,kind:'staff',f:0,x:25.5,y:15.5,st:'idle'});deny(s,{kind:'surface',x:25,y:15,f:0,layer:'ground'},/person/);
});
test('all32 construction-tool entries covered without optional climate reversal or automatic reassignment',()=>{const expected=Object.keys(TOOLS).filter(k=>k!=='demolish');assert.deepEqual([...covered].sort(),expected.sort());});
console.log(`${groups} universal removal groups passed; all 32 construction tools covered`);
