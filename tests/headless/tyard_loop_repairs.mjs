// Focused edge fixtures, not a physical-device or natural-demand acceptance test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {G,VEH_GROUND} from '../../js/data.js';
import {unitInService} from '../../js/comeback.js';
import {yardChoices,yardProgress,yardInventory} from '../../js/yardloop.js';
import {rescued} from './rescue-operation-fixture.mjs';

const path=process.argv[2];
const state=path?JSON.parse(zlib.gunzipSync(Buffer.from(fs.readFileSync(path,'utf8').trim().slice(5),'base64'))):rescued().s;
const fresh=()=>{const s=new Sim(structuredClone(state));s.ensure();return s;};
const ready=sm=>sm.objs('unit').filter(u=>unitInService(sm.s,u)&&u.commercial==='ready');
function uiFor(sim){const u=Object.create(UI.prototype);u.g={sim,audio:{unlock(){}},rend:{lookAt(){}}};u.cmdBtn=()=>'';return u;}
const tap=(u,a,v)=>u.onClick({target:{closest:()=>({dataset:{a,v:String(v)}})}});

{
  const sm=fresh();
  // An earlier scan position has frontage pavement, but no connection to gate.
  sm.s.ground[sm.idx(3,2)]=G.ASPHALT;
  sm.s.mkt.lostLog.push(...Array.from({length:2},()=>({d:sm.day-1,r:'noSize',sz:'5x5',climate:false})));
  sm.markDirty();sm.ensure();const before=JSON.stringify(sm.s);
  const options=yardChoices(sm),q=options.find(c=>c.size==='5x5');
  assert.ok(q,'search continues to a connected alternative');
  assert.notDeepEqual(q.args.a,{x:2,y:2});
  assert.equal(JSON.stringify(sm.s),before,'quotation cannot mutate save or RNG');
  for(const c of options)for(const unit of c.plan.creates)assert.ok(sm.unitFront(unit).some(f=>sm.D.vehReach[sm.idx(f.x,f.y)]&&VEH_GROUND.has(sm.groundAt(sm.idx(f.x,f.y)))));
  const r=sm.dispatch({type:'build',...q.args});assert.ok(r.ok,r.msg);
  const order=sm.s.orders.find(o=>o.id===r.order);
  for(let i=0;order.st==='construction'&&i<1500;i++)sm.step();
  assert.ok(sm.dispatch({type:'commission',order:order.id}).ok);
  assert.ok(order.objs.every(id=>unitInService(sm.s,sm.s.objects[id])),'proposed units actually enter service');
  console.log('PASS disconnected pavement skipped, connected alternative found, quotes read-only, actual construction and commissioning serviceable');
}
{
  const sm=fresh(),rs=ready(sm),before=yardInventory(sm);
  for(const u of rs)sm.signLease(u,{size:u.size});
  const inventory=yardInventory(sm),html=uiFor(sm).yardLoopHtml();
  assert.equal(inventory.occupied,before.occupied);assert.equal(inventory.reserved,before.reserved+rs.length);
  assert.ok(html.includes(`${before.occupied}/${inventory.total} occupied · ${inventory.reserved} reserved`));
  assert.ok(!html.includes(`${inventory.total}/${inventory.total} occupied`));
  console.log('PASS legacy untracked reservations remain distinct from physical occupancy in real production markup');
}
{
  const sm=fresh(),ui=uiFor(sm);let view,selected;
  ui.setTab=()=>{};ui.select=id=>{selected=id};ui.setView=v=>{view=v};
  const interior=sm.objs('unit').find(u=>u.access==='interior'&&(u.f||0)===0),drive=sm.objs('unit').find(u=>u.access==='drive');
  assert.ok(interior&&drive);
  for(const [unit,floor,want]of [[drive,0,'ext'],[interior,0,0],[interior,1,1]]){
    // Higher-floor case is a disposable controller fixture only.
    unit.f=floor;tap(ui,'yardUnit',unit.id);assert.equal(view,want);assert.equal(selected,unit.id);
  }
  console.log('PASS actual inspection handler: drive-up EXT, ground interior F1, upper interior correct floor');
}
{
  const sm=fresh(),units=ready(sm);assert.ok(sm.dispatch({type:'yardFocus',ids:units.map(u=>u.id)}).ok);
  sm.signLease(units[0],{size:units[0].size});const original=structuredClone(sm.s.yardLoop);
  const orders=[];
  for(const y of [4,5]){
    const args={tool:'du5x5',a:{x:13,y},b:{x:13,y},axis:'y',f:0};
    assert.equal(sm.plan(args).status,'valid');const r=sm.dispatch({type:'build',...args});assert.ok(r.ok,r.msg);orders.push(sm.s.orders.find(o=>o.id===r.order));
  }
  assert.deepEqual(sm.s.yardLoop.targets.slice(0,original.targets.length),original.targets);
  assert.deepEqual(sm.s.yardLoop.leases,original.leases);assert.equal(sm.s.yardLoop.started,original.started);
  assert.equal(sm.s.yardLoop.groups.length,3);assert.equal(yardProgress(sm).total,units.length+2);
  for(const ord of orders)assert.ok(ord.objs.every(id=>sm.s.yardLoop.targets.some(t=>t.id===id)));
  const loaded=new Sim(structuredClone(sm.s));assert.deepEqual(loaded.s.yardLoop,sm.s.yardLoop);
  for(let i=0;orders.some(o=>o.st==='construction')&&i<1500;i++)sm.step();
  for(const ord of orders)assert.ok(sm.dispatch({type:'commission',order:ord.id}).ok);
  for(const id of sm.s.yardLoop.targets.map(t=>t.id)){const u=sm.s.objects[id];if(!u.lease)sm.signLease(u,{size:u.size});}
  sm.events=[];
  for(let i=0;sm.s.yardLoop.completed==null&&i<3*1440;i++)sm.step();
  const celebrations=sm.events.filter(e=>e.type==='yard_filled');
  assert.equal(celebrations.length,3,'each independently occupied group gets one acknowledgment');
  assert.deepEqual(celebrations.map(e=>e.count).sort((a,b)=>a-b),[1,1,units.length].sort((a,b)=>a-b));
  assert.ok(sm.s.yardLoop.groups.every(g=>g.completed!=null));
  assert.ok(uiFor(sm).yardLoopHtml().includes('lease-up achieved'));
  const reloaded=new Sim(structuredClone(sm.s));reloaded.poll();assert.equal(reloaded.events.filter(e=>e.type==='yard_filled').length,0);
  assert.deepEqual(reloaded.s.yardLoop,sm.s.yardLoop);
  assert.deepEqual(sm.s.market.ask,state.market.ask);assert.deepEqual(sm.s.scenario.earned,state.scenario.earned);
  const legacy=structuredClone(original);delete legacy.groups;
  // Original recorded lease needs the corresponding original world, not a fabricated lease history.
  const oldWorld=structuredClone(loaded.s);oldWorld.yardLoop=legacy;
  const migrated=new Sim(oldWorld);assert.deepEqual(migrated.s.yardLoop.targets,original.targets);assert.deepEqual(migrated.s.yardLoop.leases,original.leases);assert.equal(migrated.s.yardLoop.groups.length,1);
  for(const groups of ['bad',[{label:'Invalid',started:state.t,ids:[999999],completed:null}]]){
    const bad=structuredClone(sm.s);bad.yardLoop.groups=groups;const safe=new Sim(bad);assert.equal(safe.s.yardLoop,undefined);assert.equal(safe.s.cash,sm.s.cash);assert.deepEqual(safe.s.scenario.earned,state.scenario.earned);
  }
  console.log('PASS two overlapping ordinary builds retain original leases, independently celebrate once, survive save/reload, migrate old tracker, reject malformed optional groups');
}
