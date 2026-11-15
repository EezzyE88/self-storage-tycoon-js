// Recommended-placement visibility: recommendation previews frame the suggested build and open a compact review.
// Native Sim, real UI methods, the CPU renderer fixture and stubbed DOM measurements. Rendered and Safari evidence are separate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI} from '../../js/ui.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox} from '../../js/scenarios.js';
import {MIN_PER_DAY} from '../../js/data.js';
import {installTutorial} from '../../js/tutorial.js';
import {verticalLayout,verticalDone} from '../../js/blueprint.js';
import {careerDriveOpportunity} from '../../js/careeropportunity.js';
import {yardChoices} from '../../js/yardloop.js';
import {rescued} from './rescue-operation-fixture.mjs';
import {loadRenderer} from '../performance/renderer-fixture.mjs';

let passed=0;const ok=m=>{passed++;console.log('PASS '+m);};
const run=(sim,days,owner=false)=>{for(let i=0;i<days*MIN_PER_DAY;i++){if(owner&&i%30===0)for(const t of sim.s.tasks)if(!t.assigned&&!t.vendor)sim.dispatch({type:'ownerTask',task:t.id,forceOwner:true});sim.step();}sim.events.length=0;};
function el(){return{innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}};}
function uiFor(sim,company={props:[{name:'Maple Street Storage',sim}],active:0}){
  const u=Object.create(UI.prototype),boxes={};
  u.g={sim,company,audio:{unlock(){},play(){}},rend:{view:'ext',zoom:1,setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},setFocus(){},setOverlay(){},zoomBy(){}}};
  u.title=false;u.root={classList:el().classList,querySelectorAll:()=>[],querySelector:()=>null};u.$=k=>boxes[k]||=el();
  u.sfx=()=>{};u.toast=()=>{};u.renderTut=()=>{};u.syncFeedbackProperty=()=>{};u.frameOutline=()=>false;
  u.sheet=(_a,_b,h)=>h;u.portfolioHtml=()=>'';u.diagnosticHtml=()=>'';
  let frames=0;const real=u.frameRecommendation;u.frameRecommendation=function(...a){frames++;return real.apply(this,a);};
  return {u,boxes,frames:()=>frames};
}
const tap=(u,a,v)=>u.onClick({target:{closest:()=>({dataset:{a,v}})}});
const abar=u=>u.$('abar').innerHTML;
// Compact is presentation only: the full review stays in the page, Details and Peek stay reachable.
function compactReview(u,{peek}){
  const h=abar(u);
  assert.match(h,/class="actionbar[^"]*reco-review/,'review opens compact');
  assert.match(h,/data-a="recoDetails"/,'Details button offered');
  assert.match(h,/data-a="confirm"/,'Confirm stays in the compact review');
  assert.match(h,/Cash after build:/,'cash after stays in the compact review');
  assert.match(h,/Committed bills.*reserve.*Available after bills/s,'full financial review still rendered (hidden only by phone CSS)');
  if(peek)assert.match(h,/data-a="placementPeek"/,'Peek still offered');
}

// 1. Career Business Opportunity: Explore build opens compact; Details, Peek, Cancel, Confirm, manual placement.
{
  const sim=makeMaple();sim.s.tut={on:false,beat:99,flags:{},done:true};sim.ensure();
  const company={props:[{name:'Maple Street Storage',sim}],active:0};
  for(let d=0;d<40&&!careerDriveOpportunity(sim,company);d++)run(sim,1);
  assert.ok(careerDriveOpportunity(sim,company),'natural offer');
  sim.s.speed=0;const {u,frames}=uiFor(sim,company);const before=JSON.stringify(sim.s);
  tap(u,'careerDrivePreview');assert.ok(u.tool&&u.plan?.status==='valid');
  assert.equal(u.recoCompact,true);assert.equal(frames(),1,'one explicit framing request');compactReview(u,{peek:true});
  tap(u,'recoDetails');assert.equal(u.recoCompact,false);assert.doesNotMatch(abar(u),/reco-review|recoDetails/,'Details shows the ordinary full review');
  assert.match(abar(u),/data-a="placementPeek"/);
  tap(u,'placementPeek');assert.match(abar(u),/peek-review/,'Peek still works');tap(u,'placementPeek');
  tap(u,'cancelTool');assert.equal(u.tool,null);assert.equal(u.recoCompact,false);
  assert.equal(JSON.stringify(sim.s),before,'preview, Details, Peek and Cancel leave the save untouched');
  tap(u,'careerDrivePreview');assert.equal(u.recoCompact,true);u.placeStart(u.plan.creates[0]);assert.equal(u.recoCompact,false,'a manual placement is an ordinary review');
  u.buildPlacing=false;u.cancelPlacement();
  tap(u,'careerDrivePreview');const cash=sim.s.cash,cost=u.plan.cost;tap(u,'confirm');
  assert.equal(sim.s.cash,cash-cost,'Confirm spends exactly the quoted cost');assert.equal(u.recoCompact,false);assert.equal(sim.s.speed,0,'manual Pause kept');
  ok('Career opportunity: compact review with Details/Peek/Confirm, full review intact, Cancel/manual placement/Confirm clear it, save untouched');
}

// 2. Comeback Yard opportunity (won Comeback, natural evidence).
{
  const sim=rescued();for(let d=0;d<60&&!yardChoices(sim).length;d++)run(sim,1,true);
  const c=yardChoices(sim)[0];assert.ok(c,'genuine yard opportunity');sim.s.speed=0;
  const {u,frames}=uiFor(sim);const before=JSON.stringify(sim.s);
  assert.equal(u.previewYardOpportunity(c.size),true);assert.equal(u.recoCompact,true);assert.equal(frames(),1);compactReview(u,{peek:true});
  tap(u,'cancelTool');assert.equal(u.recoCompact,false);assert.equal(JSON.stringify(sim.s),before);
  ok(`Comeback Yard opportunity (${c.size}): compact review, one framing request, Cancel clears, save untouched`);
}

// 3. First gate on an acquired plain parcel.
{
  const root=makeMaple();root.s.tut={on:false,beat:99,flags:{},done:true};root.ensure();
  const parcel=makeSandbox({market:'blank',cash:60000,plain:true});parcel.s.speed=0;
  const company={props:[{name:'Maple Street Storage',sim:root},{name:'Suburban Lot 2',sim:parcel}],active:1};
  const {u,frames}=uiFor(parcel,company);assert.ok(u.firstGateGuidance()?.args,'gate guidance available');
  const before=JSON.stringify(parcel.s);tap(u,'previewFirstGate');assert.equal(u.tool,'gate');assert.equal(u.recoCompact,true);assert.equal(frames(),1);
  compactReview(u,{peek:false});tap(u,'cancelTool');assert.equal(JSON.stringify(parcel.s),before);
  ok('first gate: compact review, one framing request, Cancel clears, save untouched');
}

// 4. Two-floor lesson: Use suggested placement opens compact and refits; other suggested placements are unchanged.
{
  const sim=makeMaple();sim.s.tut={on:false,beat:99,flags:{},done:true};sim.ensure();installTutorial(sim);run(sim,2);
  sim.s.cash=60000;sim.s.lesson={id:'up',idMark:sim.s.nextId,built:[],flags:{},entered:true};
  assert.ok(sim.dispatch({type:'build',...verticalLayout(sim).plans.aisle}).ok);for(let i=0;i<3*MIN_PER_DAY&&!verticalDone(sim,'aisle');i++)sim.step();
  assert.ok(verticalDone(sim,'aisle'));sim.events.length=0;sim.s.speed=0;
  const {u,frames}=uiFor(sim);const outlineCalls=[];u.frameOutline=()=>{outlineCalls.push(1);return false;};
  tap(u,'suggestPlacement');assert.ok(u.tool&&u.plan,'suggested shell review open');assert.equal(u.plan.args.tool,'shell2');
  assert.equal(u.recoCompact,true);assert.equal(frames(),1,'refit requested once');compactReview(u,{peek:false});
  assert.match(abar(u),/data-a="suggestPlacement"/,'lesson recovery action kept');
  tap(u,'recoDetails');assert.equal(u.recoCompact,false);
  // Any other lesson's suggested placement keeps its existing presentation (same placement, lesson id changed).
  const shell=u.currentBlueprintPlan()||null;tap(u,'cancelTool');
  const other=new (sim.constructor)(structuredClone(sim.s));other.s.lesson.id='climate';installTutorial(other);
  const v=uiFor(other);const want=structuredClone(verticalLayout(sim).plans.shell2);v.u.currentBlueprintPlan=()=>want;
  tap(v.u,'suggestPlacement');assert.ok(v.u.tool&&v.u.plan,'other lesson review open');assert.equal(v.u.recoCompact,false);assert.equal(v.frames(),0);
  assert.doesNotMatch(abar(v.u),/reco-review|recoDetails/);void shell;
  ok('two-floor lesson: suggested shell review compact with refit; recovery action kept; other lessons unchanged');
}

// 5. frameRecommendation: fits into the measured strip, refits once after panels settle, never fights the player.
{
  const Renderer=await loadRenderer();
  const sim=makeMaple();sim.s.tut={on:false,beat:99,flags:{},done:true};sim.ensure();
  const width=375,height=667;globalThis.innerWidth=width;globalThis.innerHeight=height;
  const canvas={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({left:0,top:0,width,height})};
  const rend=new Renderer(canvas,sim);rend.aspect=width/height;rend.view=0;rend.zoom=1.2;
  const timers=[];globalThis.setTimeout=(f)=>{timers.push(f);return timers.length;};globalThis.clearTimeout=(id)=>{if(id)timers[id-1]=null;};
  const flush=()=>{const t=timers.splice(0);for(const f of t)f?.();};
  const u=Object.create(UI.prototype),boxes={};u.g={sim,rend};u.title=false;u.$=k=>boxes[k]||=el();
  boxes.tabs={getBoundingClientRect:()=>({top:height-60})};u.modalOpen=()=>false;
  let safe={left:8,right:width-8,top:200,bottom:280};u.safeRect=()=>safe;
  const args={tool:'du10x10',a:{x:26,y:20},b:{x:26,y:20},f:0};u.tool='du10x10';u.plan=sim.plan(args);u.plan.args=args;
  const pts=()=>{const P=u.plan,sh=[...(P.units||[]),...(P.creates||[]).filter(c=>c.w&&c.h)];return sh.flatMap(s=>[s.x,s.x+s.w].flatMap(x=>[s.y,s.y+s.h].map(y=>rend.project(x,y,0))));};
  const inside=()=>pts().every(p=>p.x>=safe.left&&p.x<=safe.right&&p.y>=safe.top&&p.y<=safe.bottom);
  const cam=()=>JSON.stringify([rend.center.x,rend.center.z,rend.zoom,rend.rot]);
  rend.lookAt(5,5);assert.ok(!inside(),'fixture starts with the target outside the strip');
  assert.equal(u.frameRecommendation(),true);assert.ok(inside(),'immediate fit into the measured strip');
  safe={...safe,bottom:430};const settled=cam();rend.lookAt(5,5);const away=cam();assert.notEqual(away,settled);
  // The player moved the camera before the panels settled: the deferred refit leaves it alone.
  flush();assert.equal(cam(),away,'deferred refit never undoes the player');
  // Panels settle without player input: one refit into the new strip.
  u.frameRecommendation();const first=cam();safe={...safe,top:240,bottom:330};flush();assert.notEqual(cam(),first);assert.ok(inside(),'refit after panels settle');
  // A changed placement or an active gesture is never reframed.
  u.frameRecommendation();const keep=cam();u.plan={...u.plan,args:{...args,a:{x:27,y:20},b:{x:27,y:20}}};safe={...safe,top:200};flush();assert.equal(cam(),keep);
  u.plan.args=args;u.pointerBusy=true;rend.lookAt(5,5);const busy=cam();assert.equal(u.frameRecommendation(),false);flush();assert.equal(cam(),busy);u.pointerBusy=false;
  delete globalThis.innerWidth;assert.equal(u.frameRecommendation(),false,'headless: nothing to measure');
  assert.equal(JSON.stringify(sim.s.objects).length>0,true);
  ok('frameRecommendation: immediate fit, one settled refit, player camera/changed placement/gesture never reframed, headless no-op');
}

// 6. The compact rules apply only on a phone held upright, and Details is hidden everywhere else.
{
  const css=readFileSync('css/game.css','utf8');const i=css.indexOf('#ui .reco-details { display:none; }');assert.ok(i>0);
  const block=css.slice(css.indexOf('@media (max-width:700px) and (orientation:portrait)',i));
  assert.match(block.slice(0,600),/\.actionbar\.reco-review \.reco-details \{ display:inline-flex; \}/);
  assert.equal((css.match(/\.reco-review/g)||[]).length,6,'every compact rule sits in the phone-portrait block');
  assert.doesNotMatch(block.slice(0,600),/confirm|status|cost|peek/i,'Confirm, status, cost and Peek are never hidden');
  ok('CSS: compact rules only in phone portrait; Confirm, status, cost and Peek never hidden');
}
console.log(`${passed} placement visibility checks passed`);
