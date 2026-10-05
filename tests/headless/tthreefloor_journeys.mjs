// Deterministic F3 customer/cart/elevator journeys on the real simulation (no renderer, no fake agents in the journey).
// Each fixed seed builds F2 then F3 through the real staged packages, commissions them, and drives a keen 5x10 shopper
// through Sim.step(): lease → arrival → cart → freight queue → ride → F3 unit → return → departure.
// Fixture arrangement: vacant rent-ready 5x10 units on F1/F2 are marked as awaiting make-ready, so the only rent-ready
// 5x10 stock is on F3 (a real game state). No demand, price or market coefficient is changed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';

// Production save path (SST1 export/import) evaluated from js/main.js, as in tthreefloor_save.mjs.
const main=readFileSync('js/main.js','utf8');
const context=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:true},savearchive:{list:()=>[],push:()=>true,wouldDrop:()=>null},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);
const g=context.game;g.ui={title:false};g.attach=function(s){this.sim=s;};
async function reload(sim){g.sim=sim;g.company={props:[{name:'Journey',sim}],active:0,feed:[]};const code=await g.saveCode();assert.match(code,/^SST1\./);assert.equal(await g.loadCode(code),true);const r=g.sim;r.s.speed=sim.s.speed;return r;}

const SEEDS=[1,2,3,4], LIMIT=6000;
const counts={seeds:0,journeys:0,cartJourneys:0,elevatorRidesUp:0,elevatorRidesDown:0,reloads:0,outageRecoveries:0,burstCallers:0,failures:0,perSeed:[],outage:[]};
function diff(a,b,p='',out=[]){if(out.length>20)return out;if(typeof a!==typeof b||Array.isArray(a)!==Array.isArray(b)||a===null||b===null||typeof a!=='object'){if(a!==b&&!(Number.isNaN(a)&&Number.isNaN(b)))out.push([p,a,b]);return out;}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],p+'.'+k,out);return out;}
// Compare in the save's serialized form, modulo the loader's documented text sanitization (sanitizeSave strips <>"` and
// curls apostrophes in strings). Every number, id, position, queue and flag must still match exactly.
const json=v=>JSON.parse(JSON.stringify(v),(k,x)=>typeof x==='string'?x.replace(/[<>"`]/g,'').replace(/'/g,'\u2019').slice(0,2000):x);
const clone=sim=>new Sim(JSON.parse(JSON.stringify(sim.s)));

function threeFloor(seed){
  const sim=makeMaple(seed);sim.s.cash=1e6;sim.s.open=true;const sh=sim.objs('shell')[0];const costs=[];
  for(let n=0;n<2;n++){const R=sim.verticalPlan(sh.id);assert.ok(R.ok,R.msg);const cash=sim.s.cash;assert.ok(sim.dispatch({type:'verticalUpgrade',...R}).ok);assert.equal(sim.s.cash,cash-R.cost);costs.push(R.cost);
    const ord=sim.s.orders.at(-1);for(let i=0;i<60000&&ord.st==='construction';i++){sim.step();sim.events.length=0;}assert.equal(ord.st,'done');assert.ok(sim.dispatch({type:'commission',order:ord.id}).ok);}
  assert.deepEqual(costs,[17810,10210],'verified F2/F3 complete-package prices');
  for(const u of sim.objs('unit'))if(u.f!==2&&u.size==='5x10'&&u.commercial==='ready'&&!u.lease)u.commercial='unready';
  // Earlier ordinary traffic can leave carts stranded (Maple has no Porter); start as if the "Recover cart" chores were done.
  const cor=sim.objs('corral')[0];for(const c of sim.s.carts)if(c.st==='stranded'){Object.assign(c,{st:'corral',corral:cor.id,f:0,x:cor.x,y:cor.y});delete c.since;}
  sim.s.tasks=sim.s.tasks.filter(t=>t.type!=='carts');
  const m=sim.s.t%1440;sim.schedule({kind:'prospect',size:'5x10',climate:false,keen:true},sim.s.t-m+1440+9*60);
  return {sim,shell:sh.id};
}
function invariants(sim){
  const ids=sim.s.agents.map(a=>a.id);assert.equal(new Set(ids).size,ids.length,'duplicate agent');
  const cids=sim.s.carts.map(c=>c.id);assert.equal(new Set(cids).size,cids.length,'duplicate cart');
  for(const el of sim.objs('elevator')){const used=el.riders.reduce((n,r)=>n+r.slots,0);assert.ok(used<=el.cap&&el.cap===4,'elevator over capacity');
    for(const r of el.riders){const a=sim.s.agents.find(a=>a.id===r.a);assert.ok(a,'rider without agent');assert.equal(r.slots,a.cart?2:1,'cart rider must use two slots');}
    for(const id of el.q.flat())assert.ok(sim.s.agents.some(a=>a.id===id),'queued caller without agent');}
  for(const c of sim.s.carts.filter(c=>c.st==='inuse'))assert.ok(sim.s.agents.some(a=>a.cart===c.id),'in-use cart without a holder');
}
// Run until the F3 move-in visitor departs, checking per-tick movement continuity; returns the journey record.
function journey(sim,{until,stop}={}){
  const F3=new Set(sim.objs('unit').filter(u=>u.f===2).map(u=>u.id));let ag=null,prev=null,cart=null;const J={lease:null,phases:[],cartFloors:new Set(),events:[]};
  for(let i=0;i<LIMIT;i++){
    sim.step();for(const e of sim.events){if(e.type==='lease'&&F3.has(e.unit))J.lease=e;J.events.push(e);}sim.events.length=0;invariants(sim);
    const a=sim.s.agents.find(a=>a.kind==='cust'&&a.vt==='movein'&&F3.has(a.unit));
    if(a){ag=a;if(a.cart)cart=a.cart;const c=cart&&sim.cartById(cart);if(c&&c.st==='inuse')J.cartFloors.add(c.f);
      const ph=a.inElev?`ride${a.f}`:a.elev?`queue${a.f}`:`${a.st}${a.f}`;if(J.phases.at(-1)!==ph)J.phases.push(ph);
      if(prev&&!prev.hidden&&!a.hidden){if(prev.f!==a.f)assert.ok(prev.inElev||a.inElev,`floor changed outside the elevator: ${prev.f}->${a.f}`);
        else if(!prev.inElev&&!a.inElev)assert.ok(Math.hypot(a.x-prev.x,a.y-prev.y)<=0.6,`teleport ${prev.x},${prev.y} -> ${a.x},${a.y}`);}
      prev={f:a.f,x:a.x,y:a.y,inElev:!!a.inElev,hidden:!!a.hidden};
      if(stop&&stop(a,sim))return {J,ag:a,stopped:true};
    }else if(ag){J.departed=sim.s.t;break;}
    if(until&&sim.s.t>=until)break;
  }
  J.unit=ag&&ag.unit;return {J,ag};
}
const done=(J)=>J.lease&&J.departed;
function settled(sim){invariants(sim);for(const el of sim.objs('elevator')){assert.equal(el.q.flat().length,0,'stuck queue');assert.equal(el.riders.length,0,'stuck rider');}assert.ok(!sim.s.agents.some(a=>a.elev),'stuck elevator reservation');}

for(const seed of SEEDS){
  const {sim:base}=threeFloor(seed);counts.seeds++;
  // 1-7: full journey on the original run.
  const run=clone(base),trips0=run.objs('elevator')[0].trips,{J}=journey(run);
  assert.ok(J.lease,`seed ${seed}: shopper signed an F3 unit`);assert.ok(done(J),`seed ${seed}: visitor departed`);
  const order=['queue0','ride0','ride2','atunit2','queue2','ride0'];let k=0;for(const p of J.phases)if(p===order[k])k++;
  assert.equal(k,order.length,`seed ${seed}: ordered phases ${J.phases.join(' > ')}`);
  assert.ok(J.phases.some(p=>/^(walk|toUnit)2$/.test(p)),'walked on F3 after leaving the elevator');
  assert.ok(J.phases.some(p=>/0$/.test(p)&&!/^ride|^queue/.test(p)&&J.phases.indexOf(p)>J.phases.indexOf('atunit2')),'returned to the exterior on F1');
  assert.ok(J.cartFloors.has(2)&&J.cartFloors.has(0),'cart travelled to F3 and back');
  const u=run.s.objects[J.unit];assert.equal(u.f,2);assert.equal(u.doorOpen,false);assert.equal(u.commercial,'occupied');
  const unitAtF3=J.phases.includes('atunit2');assert.ok(unitAtF3);
  settled(run);for(const c of run.s.carts)assert.notEqual(c.st,'inuse');
  counts.journeys++;if(J.cartFloors.has(2))counts.cartJourneys++;const at=J.phases.indexOf('atunit2');if(J.phases.slice(0,at).includes('ride2'))counts.elevatorRidesUp++;if(J.phases.slice(at).includes('ride0'))counts.elevatorRidesDown++;
  counts.perSeed.push({seed,unit:run.s.objects[J.unit].name,leaseAt:J.lease.t,departedAt:J.departed,minutes:J.departed-J.lease.t,elevatorBoardingsAllUsers:run.objs('elevator')[0].trips-trips0});
  // Determinism: an identical run reproduces the same phases and state.
  const again=clone(base),{J:J2}=journey(again);assert.deepEqual(J2.phases,J.phases);assert.deepEqual(again.s,run.s);

  // 11. Production save/reload while waiting, riding, on F3, and with the cart on F3; continuation is identical.
  for(const [name,stop] of [['waiting',a=>a.elev&&!a.inElev&&a.f===0],['riding',a=>a.inElev&&a.f===1],['travelling on F3',a=>!a.inElev&&a.f===2&&a.st==='walk'],['cart returning from F3',a=>a.f===2&&a.st==='retCart'&&!a.elev]]){
    const s1=clone(base),r=journey(s1,{stop});assert.ok(r.stopped,`seed ${seed}: reached ${name}`);
    const s2=await reload(s1);assert.notEqual(s2,s1);assert.deepEqual(diff(json(s1.s),json(s2.s)),[],'reload is exact');
    const a1=journey(s1),a2=journey(s2);assert.ok(a1.J.departed&&a2.J.departed,`seed ${seed}: journey completes after reload (${name})`);
    assert.equal(a2.J.departed,a1.J.departed);assert.deepEqual(diff(json(s1.s),json(s2.s)),[],`seed ${seed}: reload diverged (${name})`);settled(s2);counts.reloads++;
  }

  // 13-14. Elevator becomes unavailable while the visitor waits on F1; a genuine access warning appears; service restored.
  { const s=clone(base),r=journey(s,{stop:a=>a.elev&&!a.inElev&&a.f===0});assert.ok(r.stopped);const el=s.objs('elevator')[0];
    el.cond=0;s.markDirty();s.ensure();const ev=s.events.splice(0);
    assert.ok(ev.some(e=>e.type==='access_lost'&&/Elevator/.test(e.why)),'real outage reports an access warning');
    assert.ok(s.objs('unit').filter(u=>u.f>0&&u.cstate==='operating').every(u=>u.blocked&&u.accessHold==null),'outage is not hidden as a handover');
    const out=journey(s,{until:s.s.t+240});assert.ok(!out.J.phases.some(p=>/2$/.test(p)),'no travel to F3 while the freight elevator is down');
    el.cond=1;s.markDirty();s.ensure();const fin=journey(s);
    assert.ok(fin.J.departed,`seed ${seed}: visitor finished or left after recovery`);settled(s);counts.outage.push({seed,reachedF3AfterRecovery:fin.J.phases.includes('atunit2'),phasesAfterRecovery:fin.J.phases.length});
    assert.ok(s.objs('unit').filter(u=>u.f===2&&u.cstate==='operating').every(u=>!u.blocked),'F3 access restored');counts.outageRecoveries++;
  }

  // 8-10. Burst beyond capacity: four slots, carts take two, deterministic FIFO boarding, every caller delivered.
  { const s=clone(base);s.s.agents=[];s.s.carts=[];s.s.visits=[];const el=s.objs('elevator')[0];Object.assign(el,{pos:0,tgt:null,door:0,riders:[],q:[[],[],[]],priorityCall:null,emptyPickup:null});
    const callers=[];for(let i=0;i<9;i++){const cart=i%3!==2,a={id:900000+i,kind:'cust',f:0,x:el.x+.5,y:el.y+.5,st:'walk',pi:0,exp:{elev:0,walk:0,door:0},cart:cart?950000+i:null};s.s.agents.push(a);if(cart)s.s.carts.push({id:a.cart,st:'inuse',f:0,x:a.x,y:a.y,cond:1});s.s.t++;s.joinElevator(a,el,2);callers.push(a);}
    const boarded=[];let maxUsed=0;
    for(let i=0;i<4000&&callers.some(a=>a.elev);i++){s.s.t++;const before=new Set(el.riders.map(r=>r.a));s.updateElevator(el);invariants(s);maxUsed=Math.max(maxUsed,el.riders.reduce((n,r)=>n+r.slots,0));for(const r of el.riders)if(!before.has(r.a)&&!boarded.includes(r.a))boarded.push(r.a);}
    assert.ok(callers.every(a=>!a.elev&&a.f===2),'every caller delivered to F3');assert.equal(maxUsed,4);
    assert.deepEqual(boarded,callers.map(a=>a.id),'boarding follows enqueue order');
    for(const a of callers.filter(a=>a.cart))assert.equal(s.cartById(a.cart).f,2);settled(s);counts.burstCallers+=callers.length;
  }
}
// Handover reporting: the transient service-test topology is held, then authoritative validation runs at completion.
{ const sim=makeMaple(7);sim.s.cash=1e6;sim.s.open=true;const sh=sim.objs('shell')[0];const seen=[];let hold=false;
  for(let n=0;n<2;n++){const R=sim.verticalPlan(sh.id);sim.dispatch({type:'verticalUpgrade',...R});const ord=sim.s.orders.at(-1);for(let i=0;i<60000&&ord.st==='construction';i++){sim.step();if(sim.objs('unit').some(u=>u.accessHold!=null))hold=true;seen.push(...sim.events.filter(e=>['access_lost','complete'].includes(e.type)));sim.events.length=0;}sim.dispatch({type:'commission',order:ord.id});}
  assert.ok(hold,'F2 units were held during the F3 service test');assert.ok(!seen.some(e=>e.type==='access_lost'),'no transient access complaint');
  const comp=seen.filter(e=>e.type==='complete');assert.deepEqual(comp.map(e=>[e.floor,e.units,e.ready,e.otherReady]),[[2,14,14,0],[3,14,14,0]]);
  assert.ok(sim.objs('unit').every(u=>u.accessHold==null&&!u.blocked));
}
console.log('F3 journey counts',JSON.stringify(counts));
console.log(`PASS deterministic F3 journeys: ${counts.journeys} customer+cart journeys over seeds ${SEEDS.join(',')}, ${counts.reloads} production save/reload checkpoints, ${counts.outageRecoveries} outage recoveries, ${counts.burstCallers} burst callers; ${counts.failures} failures`);
