// Acquisition offer guidance against actual game offers, handlers and purchase engine. DOM is stubbed; rendered checks are separate.
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
const press=(f,a)=>click(f,a);
test('all acquired parcel markets use actual frontage validation with truthful drive-aisle warning and unchanged quote',()=>{
 for(const market of ['blank','urban','rural']){
  const f=acquired(market),before=JSON.stringify(f.sim.s),g=f.ui.firstGateGuidance();assert.equal(JSON.stringify(f.sim.s),before);assert.ok(g.args);assert.equal(g.args.a.y,f.sim.s.parcel.y1);assert.notEqual(g.plan.status,'invalid');assert.deepEqual(g.plan,f.sim.plan(g.args));assert.equal(g.plan.cost,TOOLS.gate.cost);assert.equal(g.plan.cost,4500);assert.equal(g.plan.status,'incomplete');assert.ok(g.plan.missing.includes('Gate has no drive aisle behind it yet'));
 }
});
test('preview and cancel use production UI methods without spending, building, changing time or releasing manual Pause',()=>{
 const f=acquired(),before=JSON.stringify(f.sim.s);press(f,'previewFirstGate');assert.equal(JSON.stringify(f.sim.s),before);assert.equal(f.ui.tool,'gate');assert.equal(f.g.rend.view,'ext');assert.equal(f.ui.plan.status,'incomplete');assert.equal(f.ui.plan.args.a.y,f.sim.s.parcel.y1);assert.match(f.boxes.abar.innerHTML,/Gate has no drive aisle behind it yet/);assert.match(f.boxes.abar.innerHTML,/\$4,500/);assert.match(f.boxes.abar.innerHTML,/Cash after build/);press(f,'cancelTool');assert.equal(JSON.stringify(f.sim.s),before);assert.equal(f.ui.plan,null);
});
test('ordinary Confirm charges once, existing gate blocks repeat guidance, save/load retains the construction and Pause',()=>{
 const f=acquired(),cash=f.sim.s.cash,t=f.sim.s.t;press(f,'previewFirstGate');press(f,'confirm');assert.equal(f.sim.s.cash,cash-4500);assert.equal(f.sim.s.t,t);assert.equal(f.sim.s.speed,0);assert.equal(f.sim.objs('gate').length,1);assert.equal(f.ui.firstGateGuidance(),null);const after=JSON.stringify(f.sim.s);press(f,'confirm');assert.equal(JSON.stringify(f.sim.s),after);assert.equal(f.ui.previewFirstGate(),false);assert.equal(JSON.stringify(f.sim.s),after);f.g.sim=new Sim(JSON.parse(after));f.g.company.props[1].sim=f.g.sim;assert.equal(f.ui.firstGateGuidance(),null);assert.equal(f.g.sim.s.speed,0);
});
test('guidance requotes current blockers and prefers already connected drive-aisle frontage',()=>{
 const f=acquired(),s=f.sim.s,g=f.ui.firstGateGuidance(),x=g.args.a.x,y=s.parcel.y1;
 // Controlled structure fixture blocks the center; the production planner must choose elsewhere.
 const id=f.sim.id();s.objects[id]={id,type:'shell',x:x-1,y,w:3,h:1,floors:1,f:0,cstate:'operating'};f.sim.markDirty();const moved=f.ui.firstGateGuidance();assert.ok(moved.args);assert.notEqual(moved.args.a.x,x);assert.notEqual(f.sim.plan(moved.args).status,'invalid');
 delete s.objects[id];const ax=s.parcel.x0+2;s.ground[f.sim.idx(ax,y-1)]=G.ASPHALT;f.sim.markDirty();const linked=f.ui.firstGateGuidance();assert.equal(linked.plan.status,'valid');assert.ok(Math.abs(linked.args.a.x-ax)<=1);
 s.objects[id]={id,type:'shell',x:s.parcel.x0,y,w:s.parcel.x1-s.parcel.x0+1,h:1,floors:1,f:0,cstate:'operating'};f.sim.markDirty();const blocked=f.ui.firstGateGuidance();assert.equal(blocked.args,null);const before=JSON.stringify(s);assert.equal(f.ui.previewFirstGate(),false);assert.equal(JSON.stringify(s),before);assert.doesNotMatch(f.ui.firstGateHtml(blocked),/data-a="previewFirstGate"/);
});
test('unaffordable preview retains the existing hard cash requirement and never builds',()=>{
 const f=acquired();f.sim.s.cash=4499.99;const before=JSON.stringify(f.sim.s);press(f,'previewFirstGate');assert.equal(JSON.stringify(f.sim.s),before);assert.match(f.boxes.abar.innerHTML,/data-a="confirm" disabled/);press(f,'confirm');assert.equal(JSON.stringify(f.sim.s),before);
});
test('ordinary sandbox, Free Build, tutorial, scenarios, lessons, source property and operating acquisitions stay outside scope',()=>{
 for(const mutate of [f=>f.g.company.active=0,f=>f.sim.s.sb={},f=>f.sim.s.creative=true,f=>f.sim.s.scenario={},f=>f.sim.s.lesson={},f=>f.sim.s.tut.on=true,f=>f.sim.s.mirror=false]){const f=acquired();mutate(f);assert.equal(f.ui.firstGateGuidance(),null);}
 const f=fixture();assert.ok(f.g.acquire('facility','maple').ok);f.g.company.active=1;f.g.sim=f.g.company.props[1].sim;assert.equal(f.ui.firstGateGuidance(),null);
});
test('compact Growth retains one fixed preview action; normal gate tool retains an explicit suggestion',()=>{
 const f=acquired();f.ui.cat='site';f.ui.dockSummary=()=>'';const guide=f.ui.firstGateHtml(f.ui.firstGateGuidance());const html=f.ui.sheet('Growth','',guide);assert.match(html,/dock-actions[\s\S]*data-a="previewFirstGate"/);assert.equal((html.match(/data-a="previewFirstGate"/g)||[]).length,1);f.ui.pickTool('gate');assert.match(f.boxes.abar.innerHTML,/Preview \$4,500 gate/);assert.equal(f.ui.plan,null);
});
console.log(`${n} first-gate guidance groups passed`);
