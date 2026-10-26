// Acquisition offer guidance against actual game offers, handlers and purchase engine. DOM is stubbed; rendered checks are separate.
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
  g.ui=ui;g.audio={unlock(){},play(){}};g.rend={view:'ext',rot:2,zoom:1.4,target:{x:17,y:13},setSelection(){}};ui.root={querySelectorAll:()=>[]};
  ui.g=g;ui.title=false;ui.$=id=>boxes[id]||=element();ui.sfx=()=>{};ui.toast=t=>toasts.push(t);
  ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};ui.setMeta=()=>{};
  return {g,sim,ui,boxes,toasts};
}
const click=(f,a,v,m)=>f.ui.onClick({target:{closest:()=>({dataset:{a,v,m},closest:()=>null})}});
const review=(f,kind='parcel',market='blank')=>click(f,'acquire',kind,market);
const snap=f=>f.g.saveJSON();
const assertSame=(a,b)=>assert.deepEqual(JSON.parse(snap(a)),JSON.parse(snap(b)));

const money=n=>(n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
function row(html,kind,market){const marker=`data-acquisition-offer="${kind}:${market}"`;const at=html.indexOf(marker);assert.ok(at>=0);const next=html.indexOf('data-acquisition-offer=',at+marker.length);return html.slice(at,next<0?undefined:next);}
test('all live offer types, days, portfolio sizes and tiers use purchase-price minus active cash',()=>{
 for(const tier of [1,3])for(const count of [1,2,4])for(const day of [1,3,17]) {
  const f=fixture();f.sim.s.coTier=tier;f.sim.s.t=(day-1)*1440+780;
  while(f.g.company.props.length<count)f.g.company.props.push({name:'Other '+f.g.company.props.length,sim:makeSandbox({start:'starter',cash:999999})});
  f.sim.s.cash=22662.75;const before=snap(f),html=f.ui.portfolioHtml();assert.equal(snap(f),before,'render is read-only');
  const offers=f.g.offers();assert.equal(offers.length,tier===1?2:4);
  for(const ofr of offers){const r=row(html,ofr.kind,ofr.market),gap=ofr.price-f.sim.s.cash;assert.ok(gap>0);assert.ok(r.includes(money(gap)),`${ofr.name}: exact gap`);assert.match(r,/data-a="acquisitionFinancing"/);assert.match(r,/disabled>Review/);assert.equal(f.ui.acquisitionQuote(ofr.kind,ofr.market).ok,false);}
 }
});
test('one-cent, equal and above-price boundaries preserve the original affordability gate and exact charge',()=>{
 for(const cash of [0,-100.25,49999.99,50000,50000.01]) {
  const f=fixture();f.sim.s.cash=cash;const r=row(f.ui.portfolioHtml(),'parcel','blank'),before=snap(f);
  assert.equal(f.ui.acquisitionQuote('parcel','blank').ok,cash>=50000);
  if(cash<50000){assert.ok(r.includes(money(50000-cash)));assert.match(r,/disabled>Review/);assert.equal(f.g.acquire('parcel','blank').ok,false);assert.equal(snap(f),before);}
  else{assert.doesNotMatch(r,/acquisition-shortfall|acquisitionFinancing|disabled>Review/);review(f);click(f,'acquisitionConfirm');assert.equal(f.sim.s.cash,cash-50000);assert.equal(f.g.company.props.length,2);assert.equal(f.g.company.props[1].sim.s.cash,5000);const after=snap(f);click(f,'acquisitionConfirm');assert.equal(snap(f),after);}
 }
});
test('Financing shortcut uses the existing Business section without borrowing, buying or unpausing',()=>{
 const f=fixture();f.sim.s.cash=22662.75;f.ui.fundingContext={sim:f.sim,args:{tool:'aisle'}};
 const before={cash:f.sim.s.cash,t:f.sim.s.t,debt:JSON.stringify(f.sim.s.debt),loan:JSON.stringify(f.sim.s.loan),ledger:JSON.stringify(f.sim.s.ledger),props:f.g.company.props.length};
 click(f,'acquisitionFinancing');assert.equal(f.ui.tab,'business');assert.equal(f.ui.sheetTall,true);assert.deepEqual(f.ui.sectionChoice,{tab:'business',label:'Financing'});assert.equal(f.ui.fundingContext,null);
 assert.equal(f.sim.s.speed,0);for(const k of ['cash','t'])assert.equal(f.sim.s[k],before[k]);for(const k of ['debt','loan','ledger'])assert.equal(JSON.stringify(f.sim.s[k]),before[k]);assert.equal(f.g.company.props.length,before.props);
 const html=f.ui.financingHtml();assert.match(html,/Expansion loan/);assert.match(html,/Credit line/);assert.match(html,/data-a="termLoanReview"/);
});
test('display refreshes after cash changes and current-property switch; names remain escaped',()=>{
 const f=fixture();f.sim.s.cash=49999.99;assert.match(row(f.ui.portfolioHtml(),'parcel','blank'),/\$0\.01/);
 f.sim.s.cash=50000;assert.doesNotMatch(row(f.ui.portfolioHtml(),'parcel','blank'),/acquisition-shortfall/);
 const s=makeSandbox({start:'starter',cash:1000});s.s.coTier=3;f.g.company.props.push({name:'Second',sim:s});f.g.company.active=1;f.g.sim=s;assert.ok(row(f.ui.portfolioHtml(),'parcel','blank').includes(money(f.g.offers()[0].price-s.s.cash)));
 const offers=f.g.offers.bind(f.g);f.g.offers=()=>offers().map(o=>({...o,name:'<b>Offer</b>',desc:'<script>bad</script>'}));assert.doesNotMatch(f.ui.portfolioHtml(),/<script>|<b>Offer<\/b>/);assert.match(f.ui.portfolioHtml(),/View Financing for &lt;b&gt;Offer&lt;\/b&gt;/);
});
console.log(`${n} acquisition-affordability groups passed`);
