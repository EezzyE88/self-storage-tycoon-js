// Pause policy: temporary UI pauses restore the speed in force before them; a manual Pause survives actions,
// confirmations and panel closures. Production UI handlers with minimal DOM mocks; no economy or save change.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI} from '../../js/ui.js';
import {BEATS} from '../../js/tutorial.js';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
function el(){const c=new Set();return{dataset:{},innerHTML:'',textContent:'',hidden:false,firstChild:null,classList:{toggle:(k,on)=>on?c.add(k):c.delete(k),contains:k=>c.has(k),add:k=>c.add(k),remove:k=>c.delete(k)},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[]};}
function fixture(speed,sim=makeMaple(3)){sim.s.speed=speed;const ui=Object.create(UI.prototype),boxes={};
  ui.g={sim,audio:{unlock(){},play(){}},rend:{view:'ext',overlay:null,setView(v){this.view=v;},setOverlay(k){this.overlay=k;},setPreview(){},setSelection(){},setFocus(){},lookAt(){},previewG:{children:[]}},localsave:{ok:true,getKept:()=>null,get:()=>({})},savearchive:{list:()=>[],wouldDrop:()=>null}};
  ui.title=false;ui.sfx=()=>{};ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.$=id=>boxes[id]||(boxes[id]=el());ui.root={querySelectorAll:()=>[],querySelector:()=>null,classList:el().classList};
  ui.renderTut=()=>{};ui.renderFeed=()=>{};ui.syncFloorUi=()=>{};ui.spendingHtml=()=>'';return{ui,sim,boxes};}
const click=(ui,dataset)=>ui.onClick({target:{closest:()=>({dataset,closest:()=>null})}});
const SPEEDS=[0,1,2,4];

await test('every temporary pause source restores the exact previous speed (Pause, 1x, 2x, 4x)',()=>{
  for(const kind of ['panel','modal','review','convo','tutorial','scenario','lessonOffer','celebrate','rotate','vpreview'])for(const v of SPEEDS){const {ui,sim}=fixture(v);ui.pauseForPopup(kind);assert.equal(sim.s.speed,0,kind);ui.resumePopup(kind);assert.equal(sim.s.speed,v,`${kind} from ${v}`);}});
await test('nested and interleaved pauses restore the speed from before the first one',()=>{
  for(const v of SPEEDS){const {ui,sim}=fixture(v);ui.pauseForPopup('panel');ui.pauseForPopup('convo');ui.resumePopup('panel');assert.equal(sim.s.speed,0);ui.pauseForPopup('modal');ui.resumePopup('convo');assert.equal(sim.s.speed,0);ui.resumePopup('modal');assert.equal(sim.s.speed,v);
    ui.pauseForPopup('panel');ui.resumePopup('panel');assert.equal(sim.s.speed,v,'a second cycle captures afresh');}});
await test('manual Pause during a temporary pause is preserved by button and keyboard',()=>{
  for(const v of [1,2,4]){const {ui,sim}=fixture(v);ui.pauseForPopup('modal');click(ui,{a:'speed',v:'0'});ui.resumePopup('modal');assert.equal(sim.s.speed,0,'button Pause');
    const k=fixture(v);k.ui.pauseForPopup('panel');k.ui.notePause(0);k.ui.do({type:'speed',v:0});k.ui.resumePopup('panel');assert.equal(k.sim.s.speed,0,'keyboard Pause');}
  const main=readFileSync('js/main.js','utf8');assert.match(main,/const runSpeed = \(v\) => \{ ui\.notePause\(v\);/);});
await test('an inert run-speed tap during a blocking panel neither runs time nor changes what is restored',()=>{
  for(const v of SPEEDS){const {ui,sim}=fixture(v);ui.pauseForPopup('panel');click(ui,{a:'speed',v:'4'});assert.equal(sim.s.speed,0);ui.resumePopup('panel');assert.equal(sim.s.speed,v);}});
await test('tutorial: tapping 1x with only the tutorial card open is an explicit run choice',()=>{
  const {ui,sim}=fixture(0);ui.tutMin=false;ui.pauseForPopup('tutorial');click(ui,{a:'speed',v:'1'});assert.equal(sim.s.speed,1);assert.equal(ui.popupBlocks.size,0);
  const p=fixture(2);p.ui.tutMin=false;p.ui.pauseForPopup('tutorial');p.ui.tutMin=true;p.ui.resumePopup('tutorial');assert.equal(p.sim.s.speed,2,'collapsing the card restores 2x');});
await test('panel closure: Details → Back to map and close restore the previous speed, including Pause',()=>{
  for(const v of SPEEDS){const {ui,sim}=fixture(v);const box={innerHTML:'',firstChild:null,querySelector(){return null;}};ui.$=()=>box;ui.syncFeedbackProperty=()=>{};ui.tab='business';ui.businessSheet=()=>ui.sheet('Business','','<h3>Financing</h3>');
    ui.sheetTall=true;ui.renderSheet(true);assert.equal(sim.s.speed,0);ui.sheetTall=false;ui.renderSheet(true);assert.equal(sim.s.speed,v,'Back to map');
    ui.sheetTall=true;ui.renderSheet(true);ui.tab=null;ui.renderSheet(true);assert.equal(sim.s.speed,v,'closing the expanded panel');}});
await test('actions: commissioning, owner make-ready and build placement never start a paused clock',()=>{
  for(const v of SPEEDS){const {ui,sim}=fixture(v);const u=sim.objs('unit').find(u=>u.num===107);click(ui,{a:'cmd',cmd:JSON.stringify({type:'ownerMakeReady',unit:u.id,forceOwner:true})});assert.equal(sim.s.speed,v,'make-ready');
    const r=sim.objs('unit')[0];r.cstate='ready';click(ui,{a:'cmd',cmd:JSON.stringify({type:'commission',unit:r.id})});assert.equal(sim.s.speed,v,'commission');
    const box={innerHTML:''};ui.$=()=>box;ui.tool='du10x10';ui.plan={status:'valid',cost:0,count:1,reasons:[],missing:[],dur:0};ui.buildPlacing=false;ui.renderActionBar();assert.equal(sim.s.speed,0,'review holds time');ui.tool=null;ui.plan=null;ui.renderActionBar();assert.equal(sim.s.speed,v,'placement review released');}});
await test('confirmations: cancelling or keeping construction and confirming an expansion restore the previous speed',()=>{
  for(const v of SPEEDS){const sim=makeMaple(3);sim.s.cash=1e6;const R=sim.verticalPlan(12);sim.dispatch({type:'verticalUpgrade',...R});const ord=sim.s.orders.at(-1);
    const keep=fixture(v,new Sim(JSON.parse(JSON.stringify(sim.s))));keep.ui.confirmCancelOrder(ord.id);assert.equal(keep.sim.s.speed,0);keep.ui.closeModal();assert.equal(keep.sim.s.speed,v,'Keep building');
    const go=fixture(v,new Sim(JSON.parse(JSON.stringify(sim.s))));go.ui.confirmCancelOrder(ord.id);click(go.ui,{a:'cmd',confirmed:'1',cmd:JSON.stringify({type:'cancelOrder',id:ord.id})});assert.equal(go.sim.s.orders.at(-1).st,'cancelled');assert.equal(go.sim.s.speed,v,'Cancel construction');
    const ex=makeMaple(3);ex.s.cash=1e6;const f=fixture(v,ex);f.ui.renderActionBar=()=>{};f.ui.select=()=>{};f.ui.showVertical(12);assert.equal(ex.s.speed,0);click(f.ui,{a:'verticalConfirm'});assert.equal(ex.s.orders.at(-1).st,'construction');assert.equal(ex.s.speed,v,'Confirm expansion');
    const pv=makeMaple(3);pv.s.cash=1e6;const q=fixture(v,pv);q.ui.renderActionBar=()=>{};q.ui.select=()=>{};q.ui.setTab=()=>{};q.ui.showVertical(12);q.ui.previewVertical();assert.equal(pv.s.speed,0);click(q.ui,{a:'verticalCancel'});assert.equal(pv.s.speed,v,'Discard preview');}});
await test('requests: answering the last request, and navigating from Requests, keep the player speed',()=>{
  for(const v of SPEEDS){const {ui,sim}=fixture(v);sim.convo({key:'x',who:'T',text:'Hi',sev:'attention',actions:[{label:'OK'}]});ui.pauseForPopup('convo');assert.equal(sim.s.speed,0);click(ui,{a:'convo',id:String(sim.s.convos[0].id),i:'0'});assert.equal(sim.s.convos.length,0);assert.equal(sim.s.speed,v);}});
await test('property switch never applies another property’s saved speed; loads stay paused',()=>{
  const {ui}=fixture(4);ui.pauseForPopup('panel');const other=makeMaple(5);other.s.speed=0;ui.g.sim=other;ui.resumePopup('panel');assert.equal(other.s.speed,0);assert.equal(ui.popupResume,null);
  const src=readFileSync('js/main.js','utf8');assert.match(src,/st\.speed = 0; const sim = new Sim\(st\);/,'imports and loads still open paused');});
await test('showcase: unfreezing photo mode and starting the tour do not override a manual Pause',()=>{
  const sc=readFileSync('js/showcase.js','utf8');assert.match(sc,/v: sc\.freezeSpeed \?\? 0 \}\)/);assert.doesNotMatch(sc,/freezeSpeed \|\| 1/);
  const u=readFileSync('js/ui.js','utf8');assert.doesNotMatch(u,/startTour\(\); if \(!this\.sim\.s\.speed\) this\.do\(\{ type: 'speed', v: 1 \}\)/);
  const {ui,sim}=fixture(0);ui.closeModal=()=>{};ui.g.showcase={startTour(){}};click(ui,{a:'tour'});assert.equal(sim.s.speed,0);});
await test('tutorial wording no longer promises a 1x resume',()=>{const u=readFileSync('js/ui.js','utf8');assert.doesNotMatch(u,/the clock resumes at 1x/);assert.match(u,/time returns to the speed it had before, then you can tap <b>1x<\/b>/);
  const step=BEATS.find(b=>b.id==='makeready').steps[2];const {ui,sim}=fixture(0);ui.pauseForPopup('panel');ui.sheetTall=true;ui.$('sheet').firstChild={};assert.equal(ui.resolveStep(step).redirect,'back');ui.sheetTall=false;ui.resumePopup('panel');assert.equal(sim.s.speed,0);assert.equal(ui.resolveStep(step),step);});
await test('the policy is UI-only: no simulation or save field is added',()=>{
  const sim=makeMaple(3),keys=Object.keys(sim.s).sort().join();const {ui}=fixture(2,sim);ui.pauseForPopup('modal');ui.resumePopup('modal');assert.equal(Object.keys(sim.s).sort().join(),keys);assert.ok(!JSON.stringify(sim.s).includes('popupResume'));});
console.log(`${n} pause-policy checks passed`);
