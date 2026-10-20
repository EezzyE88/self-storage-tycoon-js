import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {yardChoices,yardProgress} from '../../js/yardloop.js';
import {rescued} from './rescue-operation-fixture.mjs';

const path=process.argv[2];
const state=path?JSON.parse(zlib.gunzipSync(Buffer.from(fs.readFileSync(path,'utf8').trim().slice(5),'base64'))):rescued().s;
const fresh=()=>new Sim(structuredClone(state));
const ready=sm=>sm.objs('unit').filter(u=>u.commercial==='ready'&&!u.blocked&&!u.lease);
function el(){return{innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}};}
function uiFor(sm){const ui=Object.create(UI.prototype),boxes={};ui.g={sim:sm,audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},setFocus(){}}};ui.title=false;ui.root={classList:el().classList,querySelectorAll:()=>[],querySelector:()=>null};ui.$=k=>boxes[k]||=el();ui.sfx=()=>{};ui.toast=()=>{};ui.renderTut=()=>{};ui.syncFeedbackProperty=()=>{};ui.frameOutline=()=>false;return{ui,boxes};}
const tap=(u,a,v)=>u.onClick({target:{closest:()=>({dataset:{a,v}})}});
const sm=fresh(),{ui}=uiFor(sm),before=JSON.stringify(sm.s),units=ready(sm);
assert.ok(units.length);ui.yardLoopHtml();yardChoices(sm);assert.equal(JSON.stringify(sm.s),before,'render/quotes do not mutate save');
tap(ui,'yardWatch');const p=yardProgress(sm);assert.equal(p.total,units.length);assert.equal(p.signed,0);assert.deepEqual(sm.s.market.ask,state.market.ask);assert.equal(sm.s.cash,state.cash);
assert.equal(sm.dispatch({type:'yardFocus',ids:units.map(u=>u.id)}).ok,false,'cannot restart an active observation');
const saved=structuredClone(sm.s),loaded=new Sim(JSON.parse(zlib.gunzipSync(zlib.gzipSync(JSON.stringify(saved)))));loaded.poll();assert.deepEqual(loaded.s.yardLoop,sm.s.yardLoop);assert.ok(!loaded.events.some(e=>e.type==='yard_filled'));
const broken=structuredClone(saved);broken.yardLoop.targets.push(broken.yardLoop.targets[0]);const clean=new Sim(broken);assert.equal(clean.s.yardLoop,undefined);assert.equal(clean.s.cash,saved.cash);assert.deepEqual(clean.s.scenario.earned,state.scenario.earned);
const signed=sm.signLease(units[0],{size:units[0].size});assert.equal(yardProgress(sm).signed,1);assert.equal(yardProgress(sm).reserved,1);assert.equal(yardProgress(sm).occupied,0);assert.equal(yardProgress(sm).rent,signed.rent);
const duplicate=new Sim(structuredClone(sm.s));duplicate.poll();assert.equal(yardProgress(duplicate).signed,1);assert.ok(!duplicate.events.some(e=>e.type==='yard_filled'));
const vacated=new Sim(structuredClone(sm.s));vacated.endLease(vacated.s.leases[signed.id],'moveout');assert.equal(yardProgress(vacated).signed,1);assert.equal(yardProgress(vacated).activeRent,0);assert.equal(yardProgress(vacated).occupied,0);
delete duplicate.s.objects[units[0].id];assert.equal(yardProgress(duplicate).changed,true);
console.log('PASS read-only render, exact-price watch, active restart refusal, compressed state roundtrip, malformed optional data, signed/reserved distinction, no replay and missing targets');

// Paired run from actual input: metadata must not change money, RNG, customers or staffing.
const {Sim:BaseSim}=await import(pathToFileURL(process.env.SST_YARD_BASE+'/js/sim.js'));
const now=fresh(),base=new BaseSim(structuredClone(state));const focusUnits=path?ready(now):ready(now).filter(u=>state.scenario.targets.some(t=>t.ids.includes(u.id)));now.dispatch({type:'yardFocus',ids:focusUnits.map(u=>u.id)});
const events=[];
function operate(sim){sim.syncRequestHandling();for(const t of [...sim.s.tasks])if(!t.assigned&&!t.vendor&&t.need==='repair_simple')assert.ok(sim.dispatch({type:'ownerTask',task:t.id}).ok);for(const c of [...sim.s.convos]){if(c.staffHandling)continue;const safeOps=['moveoutOk','rateExplain','pwHold','noted','sizeKeep','biReport'];let i=c.actions.findIndex(a=>safeOps.includes(a.action?.op)&&!sim.requestActionDisabled(a));if(i<0)i=c.actions.findIndex(a=>a.action?.type==='ownerTaskFor'&&!sim.s.tasks.some(t=>t.obj===a.action.obj&&t.assigned)&&!sim.requestActionDisabled(a));if(i<0)i=c.actions.findIndex(a=>!a.action&&!sim.requestActionDisabled(a));assert.ok(i>=0,'recognized ordinary request');assert.ok(sim.dispatch({type:'convo',id:c.id,i}).ok);}}
for(let i=0;i<30*1440;i++){operate(now);operate(base);now.step();base.step();events.push(...now.events);now.events=[];base.events=[];}
const plain=structuredClone(now.s);delete plain.yardLoop;assert.deepEqual(plain,base.s,'exact gameplay state parity over 30 days');
const end=yardProgress(now);assert.ok(end.signed<=focusUnits.length);assert.ok(end.occupied<=end.total);assert.ok(events.filter(e=>e.type==='yard_filled').length<=1);if(path){assert.equal(end.signed,focusUnits.length);assert.equal(end.occupied,focusUnits.length);assert.equal(events.filter(e=>e.type==='yard_filled').length,1);}
const reload=new Sim(structuredClone(now.s));reload.poll();assert.equal(reload.events.filter(e=>e.type==='yard_filled').length,0);
const options=yardChoices(now);assert.ok(options.length,'next genuine rental opportunity appears after filling');
for(const c of options){assert.ok(c.losses>=2);assert.equal(c.plan.status,'valid');assert.equal(c.plan.missing.length,0);}
console.log('PASS exact 30-day baseline parity; natural signed/current occupancy outcomes; no duplicate completion; reload no replay; next valid demand opportunity',JSON.stringify({cash:now.s.cash,progress:{signed:end.signed,occupied:end.occupied,rent:end.rent},options:options.map(c=>({size:c.size,cost:c.plan.cost,losses:c.losses,available:c.position.available}))}));
for(const speed of [0,1,2,4]){const s=new Sim(structuredClone(now.s));if(!path)delete s.s.yardLoop;s.s.speed=speed;const {ui:u}=uiFor(s),cash=s.s.cash,t=s.s.t;const c=yardChoices(s)[0];assert.ok(u.previewYardOpportunity(c.size));assert.equal(s.s.cash,cash);assert.equal(s.s.t,t);assert.equal(s.s.speed,0);assert.equal(u.plan.status,'valid');u.requestSpeed(0);u.confirmPlan();assert.equal(s.s.speed,0);assert.equal(s.s.cash,cash-c.plan.cost);assert.equal(s.s.yardLoop.targets.length,1);assert.equal(yardProgress(s).building,1);}
console.log('PASS all-speed real UI placement, ordinary Confirm, manual Pause and new construction tracking');

if(path){
  // One natural reinvestment within the same 30-day cap. No funds, demand,
  // customer, condition or completion injection. No claim of guaranteed return.
  const cycle=fresh(),s=cycle.s;cycle.dispatch({type:'yardFocus',ids:ready(cycle).map(u=>u.id)});
  let order=null,selected=null,opened=false;const cycleEvents=[];
  while(s.t<state.t+30*1440){
    operate(cycle);
    if(!order&&yardProgress(cycle)?.completed!=null&&s.t%1440===420){
      const c=yardChoices(cycle).find(c=>c.position.available>=0);
      if(c){const r=cycle.dispatch({type:'build',...c.args});assert.ok(r.ok,r.msg);order=r.order;selected={day:cycle.day,size:c.size,cost:c.plan.cost,buffer:c.position.available};}
    }
    const ord=order&&s.orders.find(o=>o.id===order);
    if(ord?.objs.some(id=>s.objects[id]?.cstate==='ready')){assert.ok(cycle.dispatch({type:'commission',order}).ok);opened=true;}
    cycle.step();cycleEvents.push(...cycle.events);cycle.events=[];
  }
  assert.ok(selected&&opened);assert.ok(selected.buffer>=0);assert.equal(yardProgress(cycle).total,1);assert.equal(yardProgress(cycle).signed,1);assert.equal(yardProgress(cycle).occupied,1);
  assert.equal(cycleEvents.filter(e=>e.type==='yard_filled').length,2);assert.deepEqual(s.market.ask,state.market.ask);assert.deepEqual(s.scenario.earned,state.scenario.earned);assert.equal(s.loan.bal,0);
  console.log('PASS actual-save next investment, normal construction/commission, natural lease and occupied payoff within original Day45 cap',JSON.stringify({selected,endCash:s.cash,rent:yardProgress(cycle).rent}));
}
