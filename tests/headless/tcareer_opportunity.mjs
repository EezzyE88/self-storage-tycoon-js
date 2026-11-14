// Career Business Opportunities Rev 1: derived, read-only Growth guidance for one standard drive-up unit.
// Native Sim, real UI methods and the production save envelope. No Safari or rendered-device claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime,newState} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {makeScenario,makeSandbox,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,G} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {installTutorial} from '../../js/tutorial.js';
import {portfolioCareer} from '../../js/career.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
import {careerDriveEligible,careerDriveOpportunity} from '../../js/careeropportunity.js';

let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
const solo=sim=>({props:[{name:'Maple Street Storage',sim}],active:0});
const graduated=()=>{const sim=makeMaple();sim.s.tut={on:false,beat:99,flags:{},done:true};sim.ensure();return sim;};
const run=(sim,days)=>{for(let i=0;i<days*MIN_PER_DAY;i++)sim.step();sim.events.length=0;};
function el(){return{innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}};}
function uiFor(sim,company=solo(sim)){
  const u=Object.create(UI.prototype),boxes={},toasts=[];
  u.g={sim,company,audio:{unlock(){},play(){}},rend:{view:'ext',setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},setFocus(){},setOverlay(){}}};
  u.title=false;u.root={classList:el().classList,querySelectorAll:()=>[],querySelector:()=>null};u.$=k=>boxes[k]||=el();
  u.sfx=()=>{};u.toast=(m,k)=>toasts.push([m,k]);u.renderTut=()=>{};u.syncFeedbackProperty=()=>{};u.frameOutline=()=>false;
  u.sheet=(_a,_b,h)=>h;u.portfolioHtml=()=>'';u.diagnosticHtml=()=>'';
  return {u,boxes,toasts};
}
const tap=(u,a,v)=>u.onClick({target:{closest:()=>({dataset:{a,v}})}});

// 1. Natural graduated Maple Street play produces a genuine, valid offer; no injection of demand or money.
const maple=graduated(),company=solo(maple);let day=null;
for(let d=0;d<40&&!day;d++){run(maple,1);if(careerDriveOpportunity(maple,company))day=maple.day;}
assert.ok(day,'an offer appears from natural demand within 40 days');
const before=JSON.stringify(maple.s),offer=careerDriveOpportunity(maple,company);
assert.equal(JSON.stringify(maple.s),before,'deriving the offer never mutates the save');
const plan=maple.plan(offer.args);
assert.equal(plan.status,'valid');assert.equal(plan.cost,offer.plan.cost);assert.equal(plan.creates.length,1);
assert.equal(plan.creates[0].size,offer.size);assert.equal((plan.creates[0].env||'std'),'std');
assert.ok(offer.evidence.supported&&offer.evidence.demandSupported);
assert.equal(offer.daily,maple.planDailyCost(plan));
assert.deepEqual(offer.position,maple.financialPosition({spend:plan.cost,extraDaily:offer.daily}));
const stock=maple.objs('unit').filter(u=>u.size===offer.size&&(u.env||'std')==='std');
assert.ok(stock.length&&stock.every(u=>u.lease&&maple.s.leases[u.lease]),'only fully leased matching stock');
ok(`natural graduated Maple offer Day ${day}: one ${offer.size} standard, $${plan.cost}, valid plan, read-only`);

// 2. Growth renders the card from the same evidence without changing state or Pause.
{
  // growthSheet lazily creates s.lessonsDone on first render at fa8ae6e too (pre-existing); settle it first.
  const {u}=uiFor(maple);maple.s.speed=0;u.growthSheet();const b=JSON.stringify(maple.s);const html=u.growthSheet();
  assert.match(html,/<h3>Business Opportunity<\/h3>/);assert.match(html,new RegExp(`Investigate one ${offer.size} standard drive-up unit`));
  assert.match(html,/data-a="careerDrivePreview"/);assert.match(html,/Requests are not guaranteed leases/);
  assert.equal(JSON.stringify(maple.s),b);assert.equal(maple.s.speed,0);
  const outside=uiFor(maple,undefined);outside.u.g.company=null;assert.doesNotMatch(outside.u.growthSheet(),/Business Opportunity/,'no company, no card');
  ok('Growth card renders, read-only, Pause kept; absent company shows no card');
}

// 3. Explore build at every speed: ordinary build review, temporary pause, ordinary Cancel/Confirm; manual Pause kept.
for(const speed of [0,1,2,4]){
  const sim=new Sim(structuredClone(maple.s));sim.ensure();sim.s.speed=speed;const {u}=uiFor(sim);
  const cash=sim.s.cash,t=sim.s.t,orders=sim.s.orders.length;
  assert.equal(u.previewCareerDriveOpportunity(),true);
  assert.equal(u.tool,offer.args.tool);assert.equal(u.plan.status,'valid');assert.equal(u.plan.creates.length,1);
  assert.equal(sim.s.speed,0,'review pauses');assert.equal(sim.s.cash,cash);assert.equal(sim.s.t,t);assert.equal(sim.s.orders.length,orders,'nothing bought by exploring');
  tap(u,'cancelTool');assert.equal(u.tool,null);assert.equal(sim.s.speed,speed,'Cancel restores the speed in force (manual Pause stays paused)');
  assert.equal(sim.s.cash,cash);
  assert.equal(u.previewCareerDriveOpportunity(),true);u.requestSpeed(0);tap(u,'cancelTool');assert.equal(sim.s.speed,0,'manual Pause during review is never overridden');
  if(speed)u.requestSpeed(speed);
  assert.equal(u.previewCareerDriveOpportunity(),true);u.confirmPlan();
  assert.equal(sim.s.orders.length,orders+1,'ordinary Confirm is the only purchase');assert.equal(Math.round((cash-sim.s.cash)*100),Math.round(plan.cost*100));
  assert.equal(careerDriveOpportunity(sim,solo(sim))?.size===offer.size,false,'unfinished matching stock removes the same-size offer');
}
ok('Explore build at speeds 0/1/2/4: review pauses, Cancel restores speed, manual Pause kept, Confirm buys once, offer withdrawn while building');

// 4. Demand or placement disappearing between display and tap is refused at tap time, without side effects.
{
  const sim=new Sim(structuredClone(maple.s));sim.ensure();sim.s.speed=2;const {u,toasts}=uiFor(sim);
  assert.match(u.growthSheet(),/careerDrivePreview/);sim.s.mkt.lostLog=[];
  const b=JSON.stringify(sim.s);assert.equal(u.previewCareerDriveOpportunity(),false);
  assert.ok(!u.tool);assert.equal(JSON.stringify(sim.s),b);assert.equal(sim.s.speed,2);assert.match(toasts.at(-1)[0],/changed/);
  const v=new Sim(structuredClone(maple.s));v.ensure();const lease=v.s.leases[stock[0].lease];v.endLease(lease,'moveout');
  assert.notEqual(careerDriveOpportunity(v,solo(v))?.size,offer.size,'a vacated matching unit comes first');
  ok('demand loss between card and tap refused (no tool, no state change, speed kept); vacated matching unit withdraws offer');
}

// 5. No valid frontage means no offer, and the negative result is cached until the structure changes.
{
  const sim=new Sim(structuredClone(maple.s));sim.ensure();const p=sim.s.parcel;
  for(let y=p.y0;y<=p.y1;y++)for(let x=p.x0;x<=p.x1;x++){const i=sim.idx(x,y);if(sim.s.ground[i]===G.GRASS||sim.s.ground[i]===G.CONCRETE)sim.s.ground[i]=G.SIDEWALK;}
  sim.markDirty();sim.ensure();const c=solo(sim);
  assert.equal(careerDriveOpportunity(sim,c),null);
  let calls=0;const plan0=sim.plan.bind(sim);sim.plan=a=>{calls++;return plan0(a);};
  const t0=performance.now();for(let i=0;i<25;i++)assert.equal(careerDriveOpportunity(sim,c),null);const ms=performance.now()-t0;
  assert.equal(calls,0,'no rescans while the structure is unchanged');
  const v0=sim.s.structV;sim.markDirty();assert.equal(careerDriveOpportunity(sim,c),null);assert.equal(sim._careerDriveFrontage.structV,v0+1,'structure change refreshes the cache');
  ok(`impossible frontage: no offer; cached no-site result (0 plan calls over 25 refreshes, ${ms.toFixed(1)} ms)`);
}

// 6. Eligibility: tutorial, lessons, scenarios, Creative, stand-alone sandboxes and inactive properties never offer.
{
  const t=makeMaple();t.ensure();assert.equal(careerDriveEligible(t,solo(t)),false,'tutorial in progress');
  const L=new Sim(structuredClone(maple.s));L.s.lesson={id:'financing'};assert.equal(careerDriveEligible(L,solo(L)),false,'lesson');
  const C=new Sim(structuredClone(maple.s));C.s.creative=true;assert.equal(careerDriveEligible(C,solo(C)),false,'Creative');
  const Sc=new Sim(structuredClone(maple.s));Sc.s.scenario={id:'comeback',status:'won',acknowledged:true};assert.equal(careerDriveEligible(Sc,solo(Sc)),false,'Comeback excluded from Rev 1');
  const sb=makeSandbox({kind:'business',market:'urban',cash:60000});assert.equal(careerDriveEligible(sb,solo(sb)),false,'stand-alone sandbox');
  const parcel=makeSandbox({market:'rural',cash:0,plain:true});
  assert.equal(careerDriveEligible(parcel,{props:[{sim:maple},{sim:parcel}],active:1}),false,'acquired parcel not yet opened');
  parcel.s.open=true;assert.equal(careerDriveEligible(parcel,{props:[{sim:maple},{sim:parcel}],active:1}),true,'opened acquired parcel');
  assert.equal(careerDriveOpportunity(parcel,{props:[{sim:maple},{sim:parcel}],active:1}),null,'empty acquired parcel: no stock, no offer');
  assert.equal(careerDriveEligible(maple,{props:[{sim:maple},{sim:parcel}],active:1}),false,'not the active property');
  ok('eligibility: tutorial/lesson/Creative/Comeback/stand-alone sandbox/inactive excluded; unopened parcel excluded, opened parcel eligible, empty parcel no offer');
}

// 7. Production game: acquired operating facility (both layouts), property switching and save/reload.
const main=readFileSync('js/main.js','utf8');
const ctx=vm.createContext({portfolioCareer,Sim,fmtTime,makeScenario,makeSandbox,makeMaple,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,installTutorial,localsave,savearchive,Audio:class{},performance,console,BUILD:{name:'cbo-test'},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+'function makeMapleSeedPrice(day){return 95000+(day%7)*1500;}globalThis.game=game;',ctx);
const g=ctx.game;g.attach=function(sim){this.sim=sim;installTutorial(sim)};g.ui={title:false,setMeta(){},renderFeed(){},toast(){}};g.drain=()=>{};g.autosavePaused=()=>{};
{
  const home=new Sim(structuredClone(maple.s));home.ensure();home.s.cash=500000;g.sim=home;g.company={props:[{name:'Maple Street Storage',sim:home}],active:0,feed:[]};
  for(const k of [1,2]){const fac=g.buildFacility(home,g.company.props);g.company.props.push({name:'Facility '+k,sim:fac});}
  const mirrors=g.company.props.slice(1).map(p=>p.sim.s.mirror);assert.deepEqual([...mirrors].sort(),[false,true],'both facility layouts');
  for(const k of [1,2])assert.equal(careerDriveEligible(g.company.props[k].sim,{...g.company,active:k}),true,`acquired facility mirror=${mirrors[k-1]} eligible`);
  assert.equal(careerDriveOpportunity(home,g.company)?.size,offer.size,'Maple offer while Maple is active');
  for(const k of [1,2]){const fac=g.company.props[k].sim;assert.equal(careerDriveOpportunity(fac,g.company),null,'inactive facility never offers');}
  home.s.speed=2;g.switchProperty(1);assert.equal(g.sim,g.company.props[1].sim);assert.equal(careerDriveOpportunity(home,g.company),null,'switched away: old property offers nothing');
  const {u}=uiFor(g.sim,g.company);assert.equal(u.sim,g.company.props[1].sim);
  const facOffer=careerDriveOpportunity(g.sim,g.company);if(facOffer)assert.equal(g.sim.plan(facOffer.args).status,'valid');
  assert.equal(g.sim.s.speed,2,'switching keeps the company speed');
  g.switchProperty(0);
  const ref=careerDriveOpportunity(g.sim,g.company);assert.equal(ref.size,offer.size);
  for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){
    assert.doesNotMatch(g.saveJSON(),/careerDrive/,'nothing saved');
    const prep=await g.prepareLoad(code);assert.ok(prep.ok,prep.msg);assert.equal(g.applyLoad(prep),true);
    assert.equal(g.company.props.length,3);assert.equal(g.company.active,0);
    const again=careerDriveOpportunity(g.sim,g.company);
    assert.deepEqual(again.args,ref.args);assert.equal(again.plan.cost,ref.plan.cost);assert.equal(again.daily,ref.daily);
    assert.equal(g.sim._careerDriveFrontage?.structV,g.sim.s.structV,'transient cache rebuilt per Sim instance');
  }
  ok(`acquired facilities (mirror true/false) eligible; switching isolates offers; raw+compressed save/reload reproduce the same offer, nothing persisted${facOffer?' (facility offer '+facOffer.size+')':' (no facility offer at acquisition: no evidence window yet)'}`);
}

// 8. Economy/RNG parity: refreshing Growth every in-game 15 minutes for 10 days changes nothing.
{
  const a=new Sim(structuredClone(maple.s)),b=new Sim(structuredClone(maple.s));a.ensure();b.ensure();a.s.speed=b.s.speed=1;
  const {u}=uiFor(a);let shown=0;
  for(let i=0;i<10*MIN_PER_DAY;i++){if(i%15===0){if(/Business Opportunity/.test(u.growthSheet()))shown++;}a.step();b.step();a.events.length=0;b.events.length=0;}
  assert.deepEqual(JSON.parse(JSON.stringify(a.s)),JSON.parse(JSON.stringify(b.s)),'exact state parity');
  ok(`10-day economy/RNG parity with ${shown} Growth renders showing the card`);
}
console.log(`${passed} Career Business Opportunities checks passed`);
