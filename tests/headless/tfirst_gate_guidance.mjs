// SL-1 / FCPR Rev 1 D4: the acquired-parcel "Preview suggested gate" (GAT-13, a front-row gate with no public lot)
// is retired on classic lots. Acquired parcels instead show the SL-1 "still needed to open" list, and the
// ordinary gate tool places the first gate on any row. Actual acquisition, handlers and purchase engine; DOM stubbed.
// Changed from the abaf108 version (reason): the old groups asserted the retired front-row suggestion (D4).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {UI} from '../../js/ui.js';
import {Sim,newState,fmtTime} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,G,TOOLS} from '../../js/data.js';
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


let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
function acquired(market='blank'){
 const f=fixture();assert.ok(f.g.acquire('parcel',market).ok);f.g.company.active=1;f.g.sim=f.g.company.props[1].sim;f.sim=f.g.sim;
 Object.assign(f.g.rend,{setView(v){this.view=v;},setPreview(p){this.preview=p;},lookAt(x,y){this.target={x,y};}});
 f.ui.renderActionBar=UI.prototype.renderActionBar;f.ui.root.querySelector=()=>null;f.ui.root.classList={remove(){},add(){},toggle(){}};return f;
}
const press=(f,a,v)=>click(f,a,v);
const growth=f=>{f.ui.cat='site';f.ui.dockSummary=()=>'';return f.ui.growthSheet();};
// Rendering may fill display-only defaults (staff work counters, lessonsDone); the built world must not change.
const world=f=>{const s=f.sim.s;return JSON.stringify([s.objects,s.orders,s.ground,s.cash,s.t,s.speed,s.secLine,s.ledger]);};
const gate=(f,x,y)=>({type:'build',tool:'gate',f:0,a:{x,y},b:{x,y}});
test('retired: no suggested-gate methods or preview action remain in the UI',()=>{
 for(const m of ['firstGateGuidance','firstGateHtml','previewFirstGate'])assert.equal(typeof UI.prototype[m],'undefined',m);
 const f=acquired(),before=JSON.stringify(f.sim.s);press(f,'previewFirstGate');assert.equal(JSON.stringify(f.sim.s),before);assert.notEqual(f.ui.tool,'gate');assert.equal(f.ui.plan??null,null);
});
test('all acquired parcel markets list the security line first with an ordinary Place a gate button, and no suggested preview',()=>{
 for(const market of ['blank','urban','rural']){
  const f=acquired(market),before=world(f),html=growth(f);assert.equal(world(f),before);
  assert.doesNotMatch(html,/previewFirstGate/);assert.match(html,/Still needed to open/);assert.match(html,/data-need="line"[^]*?Choose your security line: place an Entrance Gate[^]*?data-a="goTool" data-v="gate"/);
 }
});
test('the ordinary gate tool shows no suggestion and quotes any row of the parcel without changing state',()=>{
 const f=acquired(),s=f.sim.s,p=s.parcel,before=JSON.stringify(s);f.ui.pickTool('gate');assert.doesNotMatch(f.boxes.abar.innerHTML,/Preview \$4,500 gate/);assert.equal(f.ui.plan??null,null);
 for(const y of [p.y0+1,p.y0+8,Math.round((p.y0+p.y1)/2),p.y1-3,p.y1]){const q=f.sim.plan(gate(f,20,y));assert.notEqual(q.status,'invalid',`row ${y}: ${q.reasons}`);assert.equal(q.cost,4500);}
 assert.equal(JSON.stringify(s),before);
});
test('an ordinary gate charges $4,500 once, sets the line, keeps manual Pause, and survives save/load',()=>{
 const f=acquired(),s=f.sim.s,cash=s.cash,t=s.t,L=s.parcel.y1-7;assert.ok(f.sim.dispatch(gate(f,20,L)).ok);assert.equal(s.cash,cash-4500);assert.equal(s.t,t);assert.equal(s.speed,0);assert.equal(f.sim.objs('gate').length,1);assert.equal(s.secLine,L);
 const after=JSON.stringify(s),re=new Sim(JSON.parse(after));re.ensure();assert.equal(re.s.secLine,L);assert.equal(re.s.speed,0);assert.equal(JSON.stringify(re.s),after);
});
test('an unaffordable gate is refused by the existing cash rule and never builds',()=>{
 const f=acquired();f.sim.s.cash=4499.99;const before=JSON.stringify(f.sim.s),r=f.sim.dispatch(gate(f,20,22));assert.equal(r.ok,false);assert.match(r.msg,/cash/i);assert.equal(JSON.stringify(f.sim.s),before);
});
test('after the first gate the line item clears and the drive item appears with an aisle button',()=>{
 const f=acquired();assert.ok(f.sim.dispatch(gate(f,20,22)).ok);const html=growth(f);assert.doesNotMatch(html,/data-need="line"/);assert.match(html,/data-need="gateDrive"[^]*?data-v="aisle"/);
});
test('a front-row first gate stays allowed with the advisory, and the list explains the missing public lot',()=>{
 const f=acquired(),y=f.sim.s.parcel.y1,q=f.sim.plan(gate(f,20,y));assert.notEqual(q.status,'invalid');assert.ok((q.warn||[]).some(w=>/front row leaves no public lot/.test(w)));assert.ok(f.sim.dispatch(gate(f,20,y)).ok);
 assert.match(growth(f),/data-need="frontRow"[^]*?remove the gate and place it further back/);
});
test('frontage (Maple) acquisitions and the source property are unaffected',()=>{
 const f=fixture();assert.ok(f.g.acquire('facility','maple').ok);f.g.company.active=1;f.g.sim=f.g.company.props[1].sim;f.sim=f.g.sim;assert.doesNotMatch(growth(f),/data-need=/);
 const g=fixture();assert.doesNotMatch(growth(g),/data-need=/);
});
console.log(`${n} first-gate guidance groups passed`);
