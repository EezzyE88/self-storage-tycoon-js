// Actual UI click handlers and acquisition engine; minimal DOM only, no rendered-browser claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {UI} from '../../js/ui.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {portfolioCareer} from '../../js/career.js';
import {installTutorial} from '../../js/tutorial.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
import {financialContextBaseline} from './financial_context_baseline.mjs';
const parent=resolve(process.argv[2]);
const {UI:ParentUI}=await import(pathToFileURL(join(parent,'js/ui.js')));
function gameAt(dir) {
  const src=readFileSync(join(dir,'js/main.js'),'utf8');
  const ctx=vm.createContext({Sim,fmtTime,makeMaple,makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,portfolioCareer,installTutorial,localsave,savearchive,cloud:{ok:false},Audio:class{},performance,console,BUILD:{name:'acquisition-test'},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
  vm.runInContext(src.slice(src.indexOf('const game = {'),src.indexOf('// initial world'))+src.slice(src.indexOf('const WORKING_FLOAT'),src.indexOf('// Save codes'))+src.slice(src.indexOf('function validState('),src.indexOf('function makeMapleSeedPrice'))+src.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+'\nglobalThis.game=game;',ctx);
  return ctx.game;
}
function element() {
  const e={dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},querySelectorAll(){return[];}};
  let html='';Object.defineProperty(e,'innerHTML',{get:()=>html,set:v=>{html=v;e.firstChild=v?{}:null;}});return e;
}
function fixture(speed=0,dir=resolve('.'),Klass=UI) {
  const g=gameAt(dir),sim=makeSandbox({start:'starter',cash:250000});sim.s.t=780;sim.s.speed=speed;sim.s.coTier=3;sim.s.convos=[];
  g.sim=sim;g.company={props:[{name:'Purchasing Yard',sim}],active:0,feed:[]};
  const ui=Object.create(Klass.prototype),boxes={},toasts=[];
  g.ui=ui;g.audio={unlock(){},play(){}};g.rend={view:'ext',rot:2,zoom:1.4,target:{x:17,y:13}};
  ui.g=g;ui.title=false;ui.$=id=>boxes[id]||=element();ui.sfx=()=>{};ui.toast=t=>toasts.push(t);
  ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};ui.setMeta=()=>{};
  return {g,sim,ui,boxes,toasts};
}
const click=(f,a,v,m)=>f.ui.onClick({target:{closest:()=>({dataset:{a,v,m},closest:()=>null})}});
const review=(f,kind='parcel',market='blank')=>click(f,'acquire',kind,market);
const snap=f=>f.g.saveJSON();
const assertSame=(a,b)=>assert.deepEqual(JSON.parse(snap(a)),JSON.parse(snap(b)));
const options=[['parcel','blank'],['parcel','urban'],['parcel','rural'],['facility','maple']];
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}

test('every offered property opens a pure review with the selected name, authoritative total and included cash',()=>{
  for(const [kind,market] of options) {
    const f=fixture(),before=snap(f),offer=f.g.offers().find(o=>o.kind===kind&&o.market===market);
    const q=f.ui.acquisitionQuote(kind,market);assert.equal(snap(f),before);assert.equal(q.offer.price,offer.price);
    review(f,kind,market);assert.equal(snap(f),before);assert.equal(f.ui.acquisitionReview.quote.workingCash,5000);
    assert.equal(q.cashAfter,250000-offer.price);const html=f.boxes.modal.innerHTML;
    for(const text of [offer.name,'Purchasing Yard','Total price','Included opening working cash',"Purchasing property's cash after purchase",'Confirm','Back'])assert.ok(html.includes(text),text);
    for(const text of [offer.price.toLocaleString(),(250000-offer.price).toLocaleString(undefined,{minimumFractionDigits:2}), '$5,000'])assert.ok(html.includes(text),text);
  }
});
test('Back restores full saved state and original speed; stale confirmation after Back is inert',()=>{
  for(const speed of [0,1,2,4]) {
    const f=fixture(speed),before=snap(f),camera=structuredClone(f.g.rend);review(f);assert.equal(f.sim.s.speed,0);
    click(f,'modalClose');assert.equal(snap(f),before);click(f,'acquisitionConfirm');assert.equal(snap(f),before);
    assert.deepEqual(f.g.rend,camera);assert.equal(f.ui.acquisitionReview,null);
  }
});
test('confirmed purchases match the exact parent acquisition state, ledger, portfolio and clock for every offer',()=>{
  for(const speed of [0,1,2,4])for(const [kind,market] of options) {
    const f=fixture(speed),expected=fixture(speed,parent,ParentUI),camera=structuredClone(f.g.rend);
    const price=expected.g.offers().find(o=>o.kind===kind&&o.market===market).price,openingCash=f.ui.acquisitionQuote(kind,market).workingCash;
    assert.ok(expected.g.acquire(kind,market).ok);review(f,kind,market);click(f,'acquisitionConfirm');assertSame(f,expected);
    assert.equal(f.sim.s.cash,250000-price);assert.equal(f.g.company.props[1].sim.s.cash,openingCash);
    assert.equal(f.g.company.props[1].sim.s.t,f.sim.s.t);assert.deepEqual(f.g.rend,camera);
  }
});
test('duplicate confirmation can purchase only once even with ample funds for repeated purchases',()=>{
  const f=fixture();f.sim.s.cash=1e6;let calls=0;const acquire=f.g.acquire.bind(f.g);f.g.acquire=(...a)=>{calls++;return acquire(...a);};
  review(f);click(f,'acquisitionConfirm');const done=snap(f);click(f,'acquisitionConfirm');click(f,'acquisitionConfirm');
  assert.equal(calls,1);assert.equal(f.g.company.props.length,2);assert.equal(snap(f),done);
});
test('affordability is revalidated and an unaffordable stale quote cannot spend or add property',()=>{
  const f=fixture();review(f);f.sim.s.cash=49999;const before=snap(f);click(f,'acquisitionConfirm');
  assert.equal(snap(f),before);assert.match(f.toasts.at(-1),/quote changed/);assert.match(f.boxes.modal.innerHTML,/Not enough cash/);
  assert.doesNotMatch(f.boxes.modal.innerHTML,/data-a="acquisitionConfirm"/);assert.equal(f.ui.acquisitionReview,null);
  f.sim.s.cash=250000;const restored=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),restored);
});
test('changed remaining cash or offer terms require review again before any purchase',()=>{
  for(const mutate of [f=>f.sim.s.cash-=1,f=>{const offers=f.g.offers.bind(f.g);f.g.offers=()=>offers().map(o=>({...o,price:o.price+1000}));}]) {
    const f=fixture();review(f);mutate(f);const before=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),before);
    assert.match(f.toasts.at(-1),/quote changed/);assert.ok(f.ui.acquisitionReview);click(f,'acquisitionConfirm');assert.equal(f.g.company.props.length,2);
  }
  const f=fixture();review(f,'facility','maple');f.sim.s.t+=1440;const before=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),before);
});
test('removed offers and a newly full portfolio cannot be purchased through stale confirmation',()=>{
  for(const mutate of [f=>f.g.offers=()=>[],f=>{while(f.g.company.props.length<5)f.g.company.props.push({name:'Other yard',sim:makeSandbox({cash:1000})});}]) {
    const f=fixture();review(f);mutate(f);const before=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),before);assert.equal(f.ui.acquisitionReview,null);
    assert.doesNotMatch(f.boxes.modal.innerHTML,/data-a="acquisitionConfirm"/);
  }
});
test('switching active property, replacing its identity or loading another company invalidates confirmation',()=>{
  for(const change of ['switch','source','company']) {
    const f=fixture();review(f);
    if(change==='switch'){const sim=makeSandbox({cash:1e6});f.g.company.props.push({name:'Second yard',sim});f.g.company.active=1;f.g.sim=sim;}
    if(change==='source')f.g.company.props[0]={name:'Replacement',sim:f.sim};
    if(change==='company')f.g.company={...f.g.company,props:[...f.g.company.props]};
    const before=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),before);assert.equal(f.ui.acquisitionReview,null);
  }
});
test('nested panel/request holds and manual Pause survive both Back and successful purchase',()=>{
  for(const end of ['modalClose','acquisitionConfirm'])for(const speed of [0,1,2,4])for(const manual of [false,true]) {
    const f=fixture(speed);f.ui.pauseForPopup('panel');f.ui.pauseForPopup('convo');review(f);
    if(manual)click(f,'speed','0');click(f,end);assert.equal(f.sim.s.speed,0);f.ui.resumePopup('panel');assert.equal(f.sim.s.speed,0);
    f.ui.resumePopup('convo');assert.equal(f.sim.s.speed,manual?0:speed);
  }
});
test('opening a financial review invalidates pending acquisition and vice versa',()=>{
  for(const which of ['credit','term']) {
    const f=fixture();review(f);if(which==='credit')f.ui.showCreditReview(500);else f.ui.showTermLoanReview(10000);
    const before=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),before);assert.equal(f.ui.acquisitionReview,null);
    review(f);const acquisition=snap(f);click(f,which==='credit'?'creditConfirm':'termLoanConfirm');assert.equal(snap(f),acquisition);
    assert.equal(f.ui.requestPanel,false);
  }
});
test('existing credit and term-loan review, Back and confirmation retain exact parent behavior',()=>{
  for(const which of ['credit','term'])for(const speed of [0,1,2,4]) {
    const f=fixture(speed),b=fixture(speed,parent,ParentUI);
    for(const x of [f,b]){if(which==='credit')x.ui.showCreditReview(500);else x.ui.showTermLoanReview(10000);}
    assert.equal(f.boxes.modal.innerHTML,b.boxes.modal.innerHTML);assertSame(f,b);
    for(const x of [f,b])click(x,'modalClose');assertSame(f,b);
    for(const x of [f,b]){if(which==='credit')x.ui.showCreditReview(500);else x.ui.showTermLoanReview(10000);click(x,which==='credit'?'creditConfirm':'termLoanConfirm');}
    assertSame(f,b);
  }
});
test('failed engine purchase changes no saved state and returns to review',()=>{
  const f=fixture();review(f);f.g.acquire=()=>({ok:false,msg:'Offer not available'});const before=snap(f);
  click(f,'acquisitionConfirm');assert.equal(snap(f),before);assert.match(f.toasts.at(-1),/Offer not available/);assert.ok(f.ui.acquisitionReview);
});
test('review names are escaped and no transient review data is added to saved state',()=>{
  const f=fixture();f.g.company.props[0].name='<img src=x>';const offers=f.g.offers.bind(f.g);f.g.offers=()=>offers().map(o=>({...o,name:'<b>Offer</b>',desc:'<script>bad</script>'}));
  const before=snap(f);review(f);assert.equal(snap(f),before);assert.doesNotMatch(f.boxes.modal.innerHTML,/<script>|<img src=x>|<b>Offer/);
  assert.match(f.boxes.modal.innerHTML,/&lt;b&gt;Offer/);click(f,'modalClose');assert.equal(snap(f),before);
});
test('engine/save files remain unchanged; exact inverse of declared financial-context CSS matches parent',()=>{
  for(const file of ['js/main.js','js/sim.js','js/data.js','js/finance.js','js/localsave.js','js/savearchive.js','js/cloud.js','css/game.css'])assert.equal(financialContextBaseline(file),readFileSync(join(parent,file),'utf8'),file);
});
console.log(`${n} acquisition-review groups passed`);
