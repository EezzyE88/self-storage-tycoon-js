// Focused production-method checks. Synthetic fixtures are not natural play/device evidence.
// Optional exact baseline root enables numeric, operational and full-state parity checks.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {investmentEvidence, investment, growthReadiness, staffingEvidence, operations, demandEvidenceText, paybackText} from '../../js/economics.js';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {projectOffers} from '../../js/propertyprojects.js';
import {yardChoices,yardQuote} from '../../js/yardloop.js';
import {ReserveWait} from '../../js/reservewait.js';
import {recovered} from './project-fixture.mjs';
let groups=0;
const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
const plan=(products=['5x10|std'],extra={})=>({creates:products.map(k=>{const[size,env]=k.split('|');return{type:'unit',size,env};}),cost:620,opex:0,status:'valid',missing:[],warn:[],...extra});
function synthetic({day=30,from=1,products=['5x10|std'],leased=3,vacant=0,losses=5}={}){
 const stock=[],leases={};let id=0;
 for(const k of products){const[size,env]=k.split('|');for(let n=0;n<leased+vacant;n++){
  const u={id:++id,type:'unit',size,env,cstate:'operating',commercial:n<leased?'occupied':'ready',blocked:false,missing:[]};
  if(n<leased){u.lease=id;leases[id]={rent:100};}stock.push(u);
 }}
 return {day,s:{finance:{observedFrom:from},mkt:{lostLog:products.flatMap(k=>{const[sz,env]=k.split('|');return Array.from({length:losses},()=>({d:day,sz,climate:env==='climate',r:'noSize'}));})},leases,opts:{}},objs:()=>stock,askFor:()=>100,pressureOn:()=>false,financialPosition:()=>({available:10000})};
}
test('contract: aggregate, selected, no-unit and empty proposal',()=>{
 const s=synthetic();const a=investmentEvidence(s),e=investmentEvidence(s,plan());
 assert.equal(a.scope,'aggregate');assert.equal(a.supported,false);assert.equal(a.demandSupported,false);assert.deepEqual(a.reasons,['select_product']);
 assert.equal(e.scope,'selected');assert.equal(e.supported,true);assert.equal(e.products[0].key,'5x10|std');
 for(const p of [{creates:[]},{creates:[{type:'canopy'}]}]){const n=investmentEvidence(s,p);assert.equal(n.scope,'nonUnit');assert.deepEqual(n.products,[]);assert.deepEqual(n.reasons,['no_unit_proposal']);assert.equal(n.supported,false);assert.equal(investment(s,p),null);}
});
test('13 aggregate losses cannot substantiate three selected losses',()=>{
 const s=synthetic({losses:3});s.s.mkt.lostLog.push(...Array.from({length:10},()=>({d:30,sz:'10x10',r:'noSize'})));
 const a=investmentEvidence(s),p=investmentEvidence(s,plan());assert.equal(a.matchingLosses,13);assert.match(demandEvidenceText(a),/across sizes/);assert.equal(a.demandSupported,false);
 assert.equal(p.matchingLosses,3);assert.equal(p.demandSupported,false);assert.equal(investment(s,plan()).range,null);
});
test('exact window/date boundaries, future guard, climate normalization and empty interval',()=>{
 for(const[day,from,w,start]of[[15,1,14,1],[40,1,30,11],[15,20,0,20]]){const s=synthetic({day,from,losses:0});const e=investmentEvidence(s,plan());assert.equal(e.window,w);assert.deepEqual(e.period,{start,end:day});}
 const s=synthetic({day:40,from:12,losses:0});s.s.mkt.lostLog=[11,12,40,41].map(d=>({d,sz:'5x10',r:'noSize'}));assert.equal(investmentEvidence(s,plan()).matchingLosses,2);
 s.s.mkt.lostLog=[{d:40,sz:'5x10',r:'noClimate'}];assert.equal(investmentEvidence(s,plan(['5x10|climate'])).matchingLosses,1);assert.equal(investmentEvidence(s,plan()).matchingLosses,0);
});
test('window, comparable and loss thresholds retain exact boundaries',()=>{
 for(const[day,n,l,ok]of[[14,3,5,false],[15,3,5,true],[30,2,5,false],[30,3,4,false],[30,3,5,true]]){
  assert.equal(investment(synthetic({day,leased:n,losses:l}),plan()).enough,ok);
 }
});
test('ready, reserved, blocked, unfinished and unready stock stay distinct',()=>{
 const s=synthetic({vacant:1});let e=investmentEvidence(s,plan());assert.equal(e.products[0].readyVacancies,1);assert.equal(e.demandSupported,false);
 const u=s.objs()[3];u.lease=4;s.s.leases[4]={rent:100};u.commercial='reserved';e=investmentEvidence(s,plan());assert.equal(e.products[0].readyVacancies,0);assert.equal(e.products[0].contractedStock,4);assert.equal(e.demandSupported,true);
 delete u.lease;delete s.s.leases[4];for(const change of [{blocked:true,commercial:'ready'},{blocked:false,commercial:'unready'},{cstate:'construction',commercial:'ready'}]){Object.assign(u,change);e=investmentEvidence(s,plan());assert.equal(e.products[0].readyVacancies,0);assert.ok(e.products[0].unavailableStock);assert.match(demandEvidenceText(e),/restoration/);}
});
test('unevidenced product never inherits another product confidence',()=>{
 const s=synthetic();const I=investment(s,plan(['5x10|std','5x5|climate']));assert.equal(I.enough,false);assert.equal(I.range,null);
 assert.deepEqual(I.unavailableReasons.map(r=>r.product),['5x5|climate']);assert.match(paybackText(I),/5x5 climate/);assert.doesNotMatch(paybackText(I),/months/);
});
test('supported mixed products use own occupancy and count burden once',()=>{
 const s=synthetic({products:['5x10|std','5x5|climate']});s.objs().push({id:7,type:'unit',size:'5x5',env:'climate',cstate:'operating',commercial:'ready'});
 const I=investment(s,plan(['5x10|std','5x5|climate'],{opex:1}));assert.equal(I.enough,true);assert.deepEqual(I.productEstimates.map(p=>p.occupancy),[1,.75]);
 assert.equal(I.lowNet,115);assert.equal(I.highNet,140);assert.equal(I.daily,1);assert.equal(I.lowOccupancy,null);assert.match(paybackText(I),/85–95%/);assert.match(paybackText(I),/60–75%/);
});
test('missing evidence, non-positive margin and layout blockers coexist',()=>{
 const s=synthetic({losses:4});const I=investment(s,plan(undefined,{opex:100,status:'incomplete',missing:['access']}));
 assert.deepEqual(I.unavailableReasons.map(r=>r.code),['insufficient_evidence','non_positive_margin','layout_unresolved']);
 const text=paybackText(I);assert.match(text,/insufficient comparable/);assert.match(text,/non-positive/);assert.match(text,/prerequisites/);assert.equal(I.range,null);
 const enough=investment(synthetic(),plan(undefined,{opex:100}));assert.equal(enough.enough,true);assert.doesNotMatch(paybackText(enough),/insufficient comparable/);assert.match(paybackText(enough),/non-positive/);
});
test('office empty, serving-only, waiting-only and mixed share exact meanings',()=>{
 for(const[n,serving]of[[0,0],[1,1],[1,0],[2,1]]){
  const s=makeMaple();s.s.officeQ=Array.from({length:n},(_,i)=>900+i);s.s.agents.push(...Array.from({length:n},(_,i)=>({id:900+i,serveT:i<serving?1:0})));
  const o=operations(s);assert.equal(o.officeWaiting,n-serving);assert.equal(o.officeServing,serving);
  const e=staffingEvidence(s,'clerk');assert.ok(e.evidence.includes(`${n-serving} waiting now; ${serving} being served`));
  if(n)assert.ok(s.diagnostics().some(d=>d.cause.includes(`${n-serving} waiting now; ${serving} being served`)));
 }
});
test('proposed roles cannot clear measured overload and identify relevant work',()=>{
 const s=makeMaple();s.s.days=Array.from({length:7},()=>({workMeasured:true,ownerUsed:8,ownerOffice:2}));
 const obj=s.objs('unit')[0].id;s.s.tasks=[{id:990,need:'carts',type:'cart',obj,created:s.s.t},{id:991,need:'repair_simple',type:'repair',obj,created:s.s.t,assigned:2}];
 for(const role of ['porter','tech','clerk','manager']){const c=growthReadiness(s,null,{extraStaff:role}).checks.find(c=>c.label==='Capacity headroom');assert.equal(c.ok,false);assert.match(c.detail,/relief is not proven/i);}
 assert.equal(staffingEvidence(s,'porter').assignedHours,0);assert.equal(staffingEvidence(s,'tech').unassignedHours,0);assert.match(staffingEvidence(s,'tech').evidence,/No matching unassigned/);
 assert.match(staffingEvidence(s,'manager').evidence,/does not add task-hours/);s.s.days.forEach(d=>d.ownerUsed=2);assert.equal(growthReadiness(s).checks[3].ok,true);s.s.days.pop();assert.equal(growthReadiness(s).checks[3].ok,false);
});
function uiFor(sim){const u=Object.create(UI.prototype),boxes={};const el=()=>({innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}});u.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},faceYardExtension(){}}};u.title=false;u.root={classList:el().classList,querySelectorAll:()=>[],querySelector:()=>null};u.$=k=>boxes[k]||=el();u.sfx=()=>{};u.toast=()=>{};u.renderTut=()=>{};u.syncFeedbackProperty=()=>{};u.spendingHtml=()=>'';u.buildSheet=()=>'';u.frameOutline=()=>false;return{u,boxes};}
const seed=recovered().s;
const fresh=()=>{const s=new Sim(structuredClone(seed));s.s.cash=1100;s.ensure();return s;};
test('Growth sheet renders aggregate observations then scoped evidence without resuming Pause',()=>{
 const s=makeMaple();s.s.speed=0;s.s.tut={on:false,done:true};const{u}=uiFor(s);u.sheet=(_a,_b,h)=>h;u.yardInfillHtml=()=>'';u.portfolioHtml=()=>'';u.diagnosticHtml=()=>'';
 const general=u.growthSheet();assert.match(general,/Demand observations/);assert.doesNotMatch(general,/Proven demand/);assert.ok(general.includes(demandEvidenceText(investmentEvidence(s))));
 u.growthPlanArgs={tool:'du5x10',a:{x:13,y:21},b:{x:13,y:21},axis:'y',f:0};const q=s.plan(u.growthPlanArgs),specific=u.growthSheet();assert.ok(specific.includes(demandEvidenceText(investmentEvidence(s,q))));assert.ok(specific.includes(paybackText(s.investment(q))));assert.equal(s.s.speed,0);
});
test('authored project cards use shared product evidence and keep Preview',()=>{
 const s=fresh(),offers=projectOffers(s);assert.ok(offers.length);for(const p of offers){assert.deepEqual(p.evidence,p.investment.evidence);assert.equal(p.losses,p.evidence.matchingLosses);}
 const {u}=uiFor(s),html=u.yardInfillHtml();assert.ok(html.includes(demandEvidenceText(offers[0].evidence)));assert.ok(html.includes(paybackText(offers[0].investment)));assert.match(html,/data-a="projectPreview"/);assert.equal(s.s.speed,0);
});
test('ordinary build details consume shared reasons and keep paused controls',()=>{
 const s=makeMaple();s.s.tut={on:false,done:true};s.s.speed=0;const{u,boxes}=uiFor(s);u.tool='du5x10';u.plan=s.plan({tool:u.tool,a:{x:13,y:21},b:{x:13,y:21},axis:'y',f:0});u.planArgs=u.plan.args;u.renderActionBar();assert.ok(boxes.abar.innerHTML.includes(paybackText(s.investment(u.plan))));assert.match(boxes.abar.innerHTML,/data-a="confirm"/);assert.equal(s.s.speed,0);
});
test('vertical package details consume same reasons and lease-up allowance',()=>{
 const s=makeMaple();s.s.speed=0;const{u,boxes}=uiFor(s);u.renderActionBar=()=>{};u.syncFloorUi=()=>{};u.showVertical(12);const R=s.verticalPlan(12);assert.ok(R.ok);const I=s.investment({...R,status:'valid',missing:[],warn:[]},{completePackage:true,leaseUpMonths:2});assert.ok(boxes.modal.innerHTML.includes(paybackText(I)));assert.match(boxes.modal.innerHTML,/data-a="verticalConfirm"/);assert.equal(s.s.speed,0);
});
test('two-loss opportunity still actionable with unsupported payback',()=>{
 const s=fresh();s.s.finance.observedFrom=s.day;s.s.mkt.lostLog=Array.from({length:2},()=>({d:s.day-1,sz:'5x10',r:'noSize',climate:false}));
 const choices=yardChoices(s);assert.ok(choices.length);const q=choices[0];assert.equal(investment(s,q.plan).enough,false);assert.equal(investment(s,q.plan).range,null);
 const{u}=uiFor(s),html=u.yardLoopHtml();assert.match(html,/Opportunity to inspect/);assert.match(html,/Requests do not establish supported payback/);assert.match(html,/data-a="yardOpportunity"/);assert.match(html,/data-a="reserveStart"/);
 s.s.mkt.lostLog.pop();assert.equal(yardQuote(s,q.args),null);
});
test('repeated advice is read-only after normal initialization',()=>{
 const s=makeMaple();s.ensure();s.growthReadiness();const before=structuredClone(s.s),p=plan();for(let i=0;i<3;i++){investmentEvidence(s,p);s.investment(p);s.growthReadiness(p);s.staffingEvidence('porter');}assert.deepEqual(s.s,before);
});
const baseline=process.argv[2];
if(baseline){
 const mod=p=>import(pathToFileURL(resolve(baseline,p)).href);
 const B=await mod('js/economics.js'),{Sim:BaseSim}=await mod('js/sim.js'),{yardChoices:baseChoices,yardQuote:baseQuote}=await mod('js/yardloop.js'),{ReserveWait:BaseWait}=await mod('js/reservewait.js');
 test('single-product numeric parity, including wages and allowances',()=>{
  for(const products of [['5x10|std'],['5x5|climate']])for(const opts of [{},{extraStaff:'tech',repairAllowance:50,leaseUpMonths:2,completePackage:true}]){
   const s=synthetic({products}),p=plan(products),a=investment(s,p,opts),b=B.investment(s,p,opts);
   for(const k of ['window','missing','occupancy','observedRent','rentCapacity','lowOccupancy','highOccupancy','daily','staffDaily','lowNet','highNet','range','enough','position'])assert.deepEqual(a[k],b[k],k);
  }
 });
 test('baseline opportunity geometry, eligibility, ordering and quote parity',()=>{
  const s=fresh();s.s.finance.observedFrom=s.day;s.s.mkt.lostLog=['5x5','5x10','10x10'].flatMap((sz,i)=>Array.from({length:i+2},()=>({d:s.day-1,sz,r:'noSize',climate:false})));
  const b=new BaseSim(structuredClone(s.s));b.ensure();assert.deepEqual(yardChoices(s),baseChoices(b));for(const q of yardChoices(s)){assert.deepEqual(yardQuote(s,q.args),baseQuote(b,q.args));assert.equal(investment(s,q.plan).enough,false);}
 });
 test('baseline reserve-wait start, interrupt, resume, deadline and explicit stop parity',()=>{
  const s=fresh(),b=new BaseSim(structuredClone(s.s));b.ensure();const qs=yardChoices(s)[0],qb=baseChoices(b)[0];assert.ok(qs);const outA=[],outB=[],a=new ReserveWait(r=>outA.push(r)),w=new BaseWait(r=>outB.push(r));
  assert.deepEqual(a.start(s,qs),w.start(b,qb));const started=a.active.started;
  for(const [kind,change]of[['review',()=>{}],['deadline',()=>{s.s.t=b.s.t=started+7*1440;}]]){
   change();a.interrupt(kind);w.interrupt(kind);const ar=a.review(s),br=w.review(b);const comparable=r=>r?{...r,a:{...r.a,sim:r.a.sim.s}}:r;assert.deepEqual(comparable(ar),comparable(br));assert.deepEqual(a.resume(s),w.resume(b));assert.deepEqual(s.s,b.s);
  }
  assert.equal(a.stop('done'),w.stop('done'));assert.deepEqual(outA,outB);assert.deepEqual(s.s,b.s);
 });
 test('full-state/event parity through two financial boundaries with repeated guidance',()=>{
  const s=makeMaple(20261019),b=new BaseSim(structuredClone(s.s));s.ensure();b.ensure();s.s.speed=b.s.speed=1;
  // Normalize existing lazy work counters before the comparison; no simulation outcome is excluded.
  s.growthReadiness();b.growthReadiness();assert.deepEqual(s.s,b.s);
  // makeMaple emits setup events; the cloned constructor starts with an empty event buffer.
  s.events.length=b.events.length=0;
  for(let minute=0;minute<2*1440;minute++){
   if(minute%60===0){s.growthReadiness(plan());s.staffingEvidence('porter');s.investment(plan());}
   s.step();b.step();assert.deepEqual(s.events,b.events);s.events.length=b.events.length=0;
   if(minute%60===0||minute===2*1440-1)assert.deepEqual(s.s,b.s,`minute ${minute}`);
  }
 });
 test('protected production files byte-identical',()=>{
  for(const f of ['js/sim.js','js/data.js','js/finance.js','js/yardloop.js','js/yardinfill.js','js/reservewait.js','js/main.js','js/localsave.js','js/savearchive.js','js/cloud.js'])assert.deepEqual(readFileSync(f),readFileSync(resolve(baseline,f)),f);
 });
}else console.log('NOT TESTED baseline parity: supply exact baseline source root as first argument');
console.log(`ALL PASS ${groups} groups`);
