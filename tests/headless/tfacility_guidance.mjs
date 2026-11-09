// AG-01 S1-S4: operating-facility acquisition guidance on existing surfaces. Actual UI methods + main.js game in a VM; stub DOM.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import vm from 'node:vm';
import {UI} from '../../js/ui.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,BILLING_CYCLE_DAYS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {portfolioCareer} from '../../js/career.js';
import {installTutorial} from '../../js/tutorial.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
function gameAt(dir=resolve('.')) {
  const src=readFileSync(join(dir,'js/main.js'),'utf8');
  const ctx=vm.createContext({Sim,fmtTime,makeMaple,makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,portfolioCareer,installTutorial,localsave,savearchive,cloud:{ok:false},Audio:class{},performance,console,BUILD:{name:'facility-guidance-test'},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
  vm.runInContext(src.slice(src.indexOf('const game = {'),src.indexOf('// initial world'))+src.slice(src.indexOf('const WORKING_FLOAT'),src.indexOf('// Save codes'))+src.slice(src.indexOf('function validState('),src.indexOf('function makeMapleSeedPrice'))+src.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+'\nglobalThis.game=game;',ctx);
  return ctx.game;
}
function element() {
  const e={dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},querySelectorAll(){return[];}};
  let html='';Object.defineProperty(e,'innerHTML',{get:()=>html,set:v=>{html=v;e.firstChild=v?{}:null;}});return e;
}
// A graduated Maple-like source with a rent roll that supports a term loan; cash is set per case.
function fixture(cash=17264,{t=780,coTier=2}={}) {
  const g=gameAt(),sim=makeMaple(4242);sim.s.tut.done=true;sim.s.tut.on=false;sim.s.mode='tutorial';sim.s.coTier=coTier;
  for(let i=0;i<t;i++)sim.step();sim.events.length=0;sim.s.cash=cash;sim.s.speed=0;sim.s.convos=[];
  g.sim=sim;g.company={props:[{name:'Maple Street Storage',sim}],active:0,feed:[]};
  const ui=Object.create(UI.prototype),boxes={},toasts=[];
  g.ui=ui;g.audio={unlock(){},play(){}};g.rend={view:'ext',rot:2,zoom:1.4,target:{x:17,y:13}};
  ui.g=g;ui.title=false;ui.$=id=>boxes[id]||=element();ui.sfx=()=>{};ui.toast=t=>toasts.push(t);
  ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};ui.setMeta=()=>{};
  return {g,sim,ui,boxes,toasts};
}
const click=(f,a,v,m)=>f.ui.onClick({target:{closest:()=>({dataset:{a,v,m},closest:()=>null})}});
const snap=f=>JSON.stringify(f.g.company.props.map(p=>[p.name,p.sim.s]))+JSON.stringify(f.g.company.feed);
const facilityRow=html=>{const i=html.indexOf('data-acquisition-offer="facility:maple"');assert.ok(i>=0);return html.slice(i,html.indexOf('data-acquisition-offer',i+10)>0?html.indexOf('data-acquisition-offer',i+10):undefined);};
const banned=/guarantee(?!d:)|profit|recommend|best choice|should borrow|you should|optimal/i;
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}

test('facility row shows preview facts, a covering existing loan preset with its exact payment, and reserve after borrowing and buying',()=>{
  const f=fixture(60000);const before=snap(f);const html=f.ui.portfolioHtml(),row=facilityRow(html);
  const pv=f.g.facilityPreview(),offer=f.g.offers().find(o=>o.kind==='facility');
  assert.equal(snap(f),before);
  for(const t of ['What comes with it',`${pv.leased} of ${pv.units}`,'$'+pv.roll.toLocaleString()+'/mo','Owner only','not guaranteed','before repairs, staff and loan payments'])assert.ok(row.includes(t),t);
  const lim=f.sim.loanLimit(),loan=[10000,25000,50000,100000].filter(v=>v<=lim).find(v=>f.sim.s.cash+v>=offer.price);assert.ok(loan,'fixture must allow a covering preset');
  const {rate,months}=f.sim.loanTerms(),pmt=f.sim.loanPmt(loan,rate,months),pos=f.sim.financialPosition({spend:offer.price-loan});
  for(const t of ['If you borrow:','$'+loan.toLocaleString()+' expansion loan',`$${pmt.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}/mo`,`${months} months`,`${(rate*100).toFixed(1)}%`,`first payment Day ${f.sim.day+BILLING_CYCLE_DAYS}`,`cash $${pos.cash.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`,'The 14-day reserve does not include the first loan payment'])assert.ok(row.includes(t),t);
  assert.ok(row.includes(Math.abs(pos.available).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})));
  assert.ok(row.includes('Buying, borrowing, saving up and waiting are all valid choices.'));assert.doesNotMatch(row.replace('not guaranteed',''),banned);
});
test('no covering preset says so plainly; cash-covered and parcel rows carry no loan or facility text',()=>{
  const low=fixture(500);const pv=low.g.facilityPreview();
  const lim=low.sim.loanLimit();const covering=[10000,25000,50000,100000].filter(v=>v<=lim).find(v=>500+v>=low.g.offers().find(o=>o.kind==='facility').price);
  assert.equal(covering,undefined);assert.ok(facilityRow(low.ui.portfolioHtml()).includes('No current loan option covers this price.'));
  const rich=fixture(250000);const row=facilityRow(rich.ui.portfolioHtml());assert.doesNotMatch(row,/If you borrow|No current loan option/);
  const html=rich.ui.portfolioHtml(),parcel=html.slice(html.indexOf('data-acquisition-offer="parcel:blank"'),html.indexOf('data-acquisition-offer="facility:maple"'));
  assert.doesNotMatch(parcel,/What comes with it|Career after purchase|If you borrow|all valid choices/);assert.ok(pv);
});
test('facility purchase review adds the same facts, career effect and choice line; parcel review is unchanged',()=>{
  const f=fixture(250000);const before=snap(f);click(f,'acquire','facility','maple');const html=f.boxes.modal.innerHTML,pv=f.g.facilityPreview();
  assert.equal(snap(f),before);
  for(const t of ['What comes with it',`${pv.leased} of ${pv.units}`,'Current contracted rent','Career after purchase','(current rules)',`properties ${pv.career.n} of ${pv.career.next.props}`,'all valid choices','Confirm'])assert.ok(html.includes(t),t);
  assert.ok(f.ui.acquisitionReview.quote.guidance);click(f,'modalClose');
  click(f,'acquire','parcel','blank');const p=f.boxes.modal.innerHTML;assert.doesNotMatch(p,/What comes with it|Career after purchase|all valid choices/);assert.equal(f.ui.acquisitionReview.quote.guidance,undefined);
});
test('existing term-loan payments are shown in the review; confirming buys exactly once and never borrows',()=>{
  const f=fixture(60000);assert.ok(f.sim.dispatch({type:'borrow',amt:50000}).ok);const debt=JSON.stringify(f.sim.s.debt);
  click(f,'acquire','facility','maple');const html=f.boxes.modal.innerHTML;const d=f.sim.s.debt[0];
  assert.ok(html.includes(`Term-loan payments $${d.pmt.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}/mo · next payment Day ${d.next}`));
  let calls=0;const acq=f.g.acquire.bind(f.g);f.g.acquire=(...a)=>{calls++;return acq(...a);};
  click(f,'acquisitionConfirm');click(f,'acquisitionConfirm');assert.equal(calls,1);assert.equal(f.g.company.props.length,2);assert.equal(JSON.stringify(f.sim.s.debt),debt);
});
test('career line reports requirements without promising a date; met requirements name the tier only',()=>{
  const f=fixture(250000);const pv=f.g.facilityPreview(),row=facilityRow(f.ui.portfolioHtml());
  const met=pv.career.roll>=pv.career.next.roll&&pv.career.n>=pv.career.next.props;
  assert.equal(row.includes('promotion is checked hourly'),met);assert.doesNotMatch(row,/Day \d+.*promot|will be promoted|guaranteed promotion/i);
});
test('See Acquisitions appears in Operator career only when the next tier needs more properties, and only navigates',()=>{
  const f=fixture(250000,{coTier:2});let jumped=null;f.ui.jumpSection=l=>{jumped=l;};
  const before=snap(f);click(f,'seeAcquisitions');assert.equal(jumped,'Acquisitions');assert.equal(snap(f),before);
  const src=readFileSync('js/ui.js','utf8');assert.match(src,/nx\.props > ti\.n && this\.g\.company \? '<button class="btn sm" data-a="seeAcquisitions">See Acquisitions<\/button>'/);
});
test('prices, loan terms, presets and eligibility are unchanged by guidance (same offers and limits before and after rendering)',()=>{
  const f=fixture();const o1=JSON.stringify(f.g.offers()),l1=f.sim.loanLimit(),t1=JSON.stringify(f.sim.loanTerms());
  f.ui.portfolioHtml();click(f,'acquire','facility','maple');
  assert.equal(JSON.stringify(f.g.offers()),o1);assert.equal(f.sim.loanLimit(),l1);assert.equal(JSON.stringify(f.sim.loanTerms()),t1);
  assert.match(readFileSync('js/ui.js','utf8'),/const LOAN_PRESETS = \[10000, 25000, 50000, 100000\];/);
});
for(const loan of [0,50000]){
  const f=fixture(loan?60000:250000);if(loan)assert.ok(f.sim.dispatch({type:'borrow',amt:loan}).ok);
  click(f,'acquire','facility','maple');click(f,'acquisitionConfirm');assert.equal(f.g.company.props.length,2);
  const json=f.g.saveJSON();assert.doesNotMatch(json,/"guidance"|facilityPreview|"pv"|What comes with it/);
  const r=await f.g.prepareLoad(json);assert.ok(r.ok,r.msg);const C=r.company;
  assert.equal(C.props.length,2);assert.equal(C.props[1].name,f.g.company.props[1].name);
  for(const k of [0,1])assert.equal(JSON.stringify({...C.props[k].sim.s,speed:0}),JSON.stringify({...f.g.company.props[k].sim.s,speed:0}));
  assert.equal(C.props[0].sim.s.debt.length,loan?1:0);for(const p of C.props)assert.equal(p.sim.s.speed,0);
  n++;console.log('PASS save and reload after a facility purchase '+(loan?'with a $'+loan+' loan':'without a loan')+' restores both properties, debt and Pause, and carries no preview data');
}
console.log(`${n} facility-guidance groups passed`);
