import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';

const ROUTE = 'Hallway has no route to a building entrance';
const DARK = 'Hallway is dark - add a light';
const args = {tool:'iu5x10',a:{x:24,y:5},b:{x:24,y:5},f:0,rotation:3};
let checks=0;
const test=(name,run)=>{run();checks++;console.log('PASS '+name);};
function fixture({connected=false,dark=false,pending=false,frontPending=false}={}) {
  const sim=makeMaple(4242),s=sim.s;
  s.mode='sandbox';s.tut={on:false,done:true};s.speed=0;s.cash=100000;
  s.hall[0][sim.idx(23,5)]=1;
  if(connected) {
    for(let y=5;y<=12;y++)s.hall[0][sim.idx(23,y)]=1;
    for(let x=20;x<=23;x++)s.hall[0][sim.idx(x,12)]=1;
  }
  if(!dark) {
    const id=sim.id();s.objects[id]={id,type:'light',x:23,y:5,f:0,cond:1,cstate:'operating'};
  }
  sim.markDirty();sim.ensure();
  if(pending) {
    for(const a of [
      {tool:'hall',a:{x:23,y:6},b:{x:23,y:12},f:0},
      {tool:'hall',a:{x:21,y:12},b:{x:22,y:12},f:0},
    ])assert.equal(sim.dispatch({type:'build',...a}).ok,true);
    sim.ensure();
  }
  if(frontPending){s.hall[0][sim.idx(23,5)]=2;sim.markDirty();sim.ensure();}
  return sim;
}
function front(sim,plan){return sim.unitFront(plan.units[0])[0];}

test('connected lit frontage remains valid without a route warning',()=>{
  const sim=fixture({connected:true}),r=sim.plan(args),fc=front(sim,r);
  assert.equal(sim.D.dAccess.has(sim.node(0,fc.x,fc.y)),true);
  assert.equal(r.status,'valid');assert.deepEqual(r.missing,[]);
});
test('disconnected lit frontage reports the same entrance failure as finished readiness',()=>{
  const sim=fixture(),r=sim.plan(args);
  assert.equal(r.status,'incomplete');assert.deepEqual(r.missing,[ROUTE]);
  const result=sim.dispatch({type:'build',...args});assert.equal(result.ok,true,'staged construction remains legal');
  const ord=sim.s.orders.find(o=>o.id===result.order);sim.completeOrder(ord);
  const unit=ord.objs.map(id=>sim.s.objects[id]).find(o=>o.type==='unit');
  assert.ok(unit.missing.includes(ROUTE));assert.equal(unit.cstate,'built');
});
test('darkness and route are separate prerequisites; lighting does not imply connectivity',()=>{
  const both=fixture({dark:true}).plan(args);assert.equal(both.status,'incomplete');
  assert.ok(both.missing.includes(ROUTE));assert.ok(both.missing.includes(DARK));
  const darkOnly=fixture({connected:true,dark:true}).plan(args);
  assert.deepEqual(darkOnly.missing,[DARK]);
});
test('pending connecting hall orders retain the warning until their actual completion',()=>{
  const sim=fixture({pending:true});assert.ok(sim.plan(args).missing.includes(ROUTE));
  const halls=sim.s.orders.filter(o=>o.tool==='hall'&&o.st==='construction');assert.equal(halls.length,2);
  sim.completeOrder(halls[0]);assert.ok(sim.plan(args).missing.includes(ROUTE));
  sim.completeOrder(halls[1]);assert.deepEqual(sim.plan(args).missing,[]);
  assert.equal(sim.s.speed,0);
});
test('pending frontage uses the existing readiness reason and remains buildable',()=>{
  const sim=fixture({frontPending:true}),r=sim.plan(args);
  assert.equal(r.status,'incomplete');assert.ok(r.missing.includes('Unit door needs hallway frontage'));
  assert.equal(sim.dispatch({type:'build',...args}).ok,true);assert.equal(sim.s.speed,0);
});
test('a mixed row reports every distinct access prerequisite once',()=>{
  const sim=fixture(),s=sim.s;
  for(let y=7;y<=12;y++)s.hall[0][sim.idx(23,y)]=1;
  for(let x=20;x<=23;x++)s.hall[0][sim.idx(x,12)]=1;
  s.hall[0][sim.idx(23,6)]=2;sim.markDirty();sim.ensure();
  const r=sim.plan({...args,b:{x:24,y:7}});assert.equal(r.count,3);
  assert.equal(r.status,'incomplete');assert.equal(r.missing.filter(x=>x===ROUTE).length,1);
  assert.ok(r.missing.includes('Unit door needs hallway frontage'));
  assert.equal(sim.D.dAccess.has(sim.node(0,23,5)),false);
  assert.equal(sim.D.dAccess.has(sim.node(0,23,7)),true);
});
test('previewing repeatedly preserves complete state, capacity, money, RNG and time at every speed',()=>{
  for(const opts of [{},{connected:true},{dark:true},{pending:true},{frontPending:true}])
    for(const speed of [0,1,2,4]) {
      const sim=fixture(opts);sim.s.speed=speed;const before=JSON.stringify(sim.s),nav=sim.navCart;
      const first=sim.plan(args);for(let n=0;n<4;n++)assert.deepEqual(sim.plan(args),first);
      assert.equal(JSON.stringify(sim.s),before);assert.equal(sim.navCart,nav);
    }
});
test('disclosure does not change quote geometry, cost, duration or operating burden',()=>{
  const disconnected=fixture().plan(args),connected=fixture({connected:true}).plan(args);
  for(const key of ['count','cost','dur','opex','sqft','doorDir','units','creates','tiles'])
    assert.deepEqual(disconnected[key],connected[key],key);
});
test('existing preview UI shows the reason and allows Confirm without moving camera or starting Pause',()=>{
  const sim=fixture(),ui=Object.create(UI.prototype),box={innerHTML:''};
  const camera={x:7,y:9,zoom:1.7,view:0};
  ui.g={sim,rend:{...camera,setPreview(){},lookAt(){throw Error('camera moved');}},audio:{play(){}}};
  ui.title=false;ui.root={querySelectorAll:()=>[]};ui.$=()=>box;ui.canRush=()=>false;
  ui.tool=args.tool;ui.plan=sim.plan(args);ui.plan.args=structuredClone(args);ui.planArgs=structuredClone(args);
  ui.buildPlacing=false;ui.sfx=()=>{};ui.toast=()=>{};ui.renderTut=()=>{};
  ui.renderActionBar();assert.ok(box.innerHTML.includes(ROUTE));
  assert.ok(box.innerHTML.includes('Will build, but not earn yet:'));
  assert.match(box.innerHTML,/data-a="confirm"/);
  const cash=sim.s.cash,t=sim.s.t,cost=ui.plan.cost;
  ui.confirmPlan();assert.equal(sim.s.cash,cash-cost);assert.equal(sim.s.t,t);assert.equal(sim.s.speed,0);
  for(const k of Object.keys(camera))assert.equal(ui.rend[k],camera[k]);
});
test('ordinary state reload preserves pending construction and route disclosure without new fields',()=>{
  const sim=fixture({pending:true}),json=JSON.stringify(sim.s),keys=Object.keys(sim.s).sort();
  const restored=new Sim(JSON.parse(json));assert.ok(restored.plan(args).missing.includes(ROUTE));
  assert.deepEqual(Object.keys(restored.s).sort(),keys);assert.equal(restored.s.speed,0);
  assert.equal(JSON.stringify(sim.s),json);
});
test('upper floors reuse freight readiness rather than treating a stair route as sufficient',()=>{
  for(const lift of ['none','construction','broken','working']) {
    const sim=fixture({connected:true}),s=sim.s;shell(sim).floors=2;
    s.hall[1]=s.hall[0].slice();
    let id=sim.id();s.objects[id]={id,type:'light',x:23,y:5,f:1,cond:1,cstate:'operating'};
    if(lift!=='none') {
      id=sim.id();s.objects[id]={id,type:'elevator',x:20,y:8,f:0,cond:lift==='broken'?0.1:1,
        cstate:lift==='construction'?'construction':'operating',servedFloors:[0,1],
        pos:0,tgt:null,door:0,riders:[],q:[[],[]],cap:4,trips:0};
    } else {
      id=sim.id();s.objects[id]={id,type:'stairs',x:20,y:8,f:0,cond:1,cstate:'operating',servedFloors:[0,1]};
    }
    sim.markDirty();sim.ensure();const r=sim.plan({...args,f:1});
    assert.notEqual(r.status,'invalid');
    const expected=lift==='working'?null:lift==='broken'?'Elevator is out of service':'Floor 2 has no elevator connection';
    if(expected)assert.ok(r.missing.includes(expected),lift+': '+r.missing);
    else assert.deepEqual(r.missing,[]);
  }
});
function shell(sim){return sim.objs('shell')[0];}
console.log(`${checks} entrance-preview groups passed; native fixtures, browser and physical Safari NOT TESTED`);
