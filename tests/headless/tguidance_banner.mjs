// Candidate 22 bounded repair: tool/floor guidance after Confirm, and celebration-banner placement.
// Production handlers on real construction state: suggestPlacement -> replan (a map hold) -> confirmPlan, the real
// resolveStep/guideTarget/updateBlueprint/renderActionBar, and the real main.js keydown listener for Space.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
globalThis.window={localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
const {UI}=await import('../../js/ui.js');
const {stepState}=await import('../../js/tutorial.js');
const {makeMaple}=await import('../../js/maple.js');
const {verticalLayout}=await import('../../js/blueprint.js');
const {bannerTop}=await import('../../js/bannerplace.js');
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};

function el(){const c=new Set();return{dataset:{},innerHTML:'',textContent:'',hidden:false,firstChild:null,classList:{toggle:(k,on)=>on?c.add(k):c.delete(k),contains:k=>c.has(k),add:k=>c.add(k),remove:k=>c.delete(k)},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,right:0,top:0,bottom:0,width:0,height:0})};}
// Real lesson state: aisle, shell, F1/F2 hallways, entrance and loading built; the elevator step is current.
function atElevatorStep(speed=0){const s=makeMaple(20260929);s.s.tut={on:false,done:true,flags:{}};s.s.lesson={id:'up',idMark:s.s.nextId,built:[],flags:{},entered:true};s.s.cash=1e6;s.s.open=false;
  const b=k=>assert.ok(s.dispatch({type:'build',...verticalLayout(s).plans[k]}).ok,k);const settle=()=>{for(let i=0;i<20000&&s.s.orders.some(o=>o.st==='construction');i++){s.s.t++;s.step();s.events.length=0;}};
  b('aisle');b('shell2');settle();for(const k of ['hall','doorWide','loading','hall2'])b(k);settle();s.s.speed=speed;
  const ui=Object.create(UI.prototype),boxes={};const R={view:'ext',zoom:1,center:{x:0,z:0},project:(x,y,h=0)=>({x:120+(x-y)*6,y:200+(x+y)*3-h*6,vis:true}),setPreview(){},setView(v){this.view=v;},lookAt(){},setFocus(){},pan(){},zoomBy(){},setSelection(){},setOverlay(){},previewG:{children:[]}};
  ui.g={sim:s,rend:R,audio:{unlock(){},play(){}},localsave:{ok:true,getKept:()=>null,get:()=>({})},savearchive:{list:()=>[],wouldDrop:()=>[]}};ui.title=false;ui.$=id=>boxes[id]||(boxes[id]=el());ui.modalOpen=()=>false;ui.sfx=()=>{};ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.renderSheet=()=>{};ui.renderTut=()=>{};ui.renderFeed=()=>{};ui.syncFloorUi=()=>{};
  ui.root={querySelectorAll:()=>[],querySelector:()=>null,classList:el().classList};globalThis.innerWidth=393;globalThis.innerHeight=659;return {s,ui};}
const step=(s,ui)=>{const st=stepState(s,ui);return st.b.steps[st.cur];};
const resolved=(s,ui)=>ui.resolveStep(step(s,ui));
// The next map action a player would take at the highlighted target: a hold there with whatever tool is armed.
function holdAtTarget(s,ui){const w=ui.stepPlacement(step(s,ui));ui.planArgs={a:{...w.a},b:{...w.a}};ui.replan();const q={tool:ui.plan?.args?.tool,f:ui.plan?.args?.f,status:ui.plan?.status,cost:ui.plan?.cost};ui.plan=null;ui.planArgs=null;return q;}
const captions=ui=>{ui.updateBlueprint();return ui.capLayout.placed.map(c=>c.t);};
const bar=ui=>{ui.renderActionBar();return ui.$('abar').innerHTML;};
const mainSrc=readFileSync('js/main.js','utf8'),kStart=mainSrc.indexOf("window.addEventListener('keydown'"),kEnd=mainSrc.indexOf('\n});',kStart)+4;
function keyboard(ui){const h={},game={ui,sim:ui.g.sim,rend:ui.g.rend,showcase:{photo:false,mode:null}};vm.runInNewContext(mainSrc.slice(kStart,kEnd),{window:{addEventListener:(t,f)=>h[t]=f},game});return key=>h.keydown({key,target:{tagName:'CANVAS'},preventDefault(){}});}

await test('Elevator Confirm -> "Light both hallways" with Elevator still armed: guided to switch, no actionable map cue (reproduced first)',()=>{
  const {s,ui}=atElevatorStep();ui.suggestPlacement();assert.equal(ui.plan.args.tool,'elevator');assert.equal(ui.plan.cost,9500);const cash=s.s.cash;ui.confirmPlan();assert.equal(cash-s.s.cash,9500,'charged once');
  assert.equal(step(s,ui).t,'Light both hallways');assert.equal(ui.tool,'elevator','tool stays armed after Confirm (repeat placement is kept)');
  // The reproduced failure path: a hold at the Light target with Elevator armed quotes a $9,500 Elevator.
  const q=holdAtTarget(s,ui);assert.deepEqual([q.tool,q.cost],['elevator',9500],'what following the old "Tap here" did');
  const r=resolved(s,ui);assert.equal(r.redirect,'switch');assert.equal(r.t,'Switch to Light');assert.equal(r.sel,'#tut [data-a="suggestPlacement"]');assert.match(r.d,/<b>Elevator<\/b> is still armed, so a hold would place another Elevator/);
  ui.guideStep=r;assert.equal(ui.guideTarget(),null,'no map ring when the control is not on screen (never a map "Tap here")');
  const t=captions(ui);assert.ok(!t.some(x=>/Place here|Start here|End here/.test(x)),'no imperative placement cue');assert.ok(t.includes('Light goes here · F1'),'target outline kept, described');
  assert.doesNotMatch(ui.$('blueprint').innerHTML,/<circle[^>]*fill="#ffd23a"/,'no placement marker');
  assert.match(bar(ui),/Hold places another Elevator on F1 · lesson needs Light on F1/,'build bar says what a hold would do');});

await test('Light F1 -> Light F2: the floor mismatch is guided too; tool+floor match gives the normal cue; then F2 units',()=>{
  const {s,ui}=atElevatorStep();ui.suggestPlacement();ui.confirmPlan();
  ui.suggestPlacement();assert.deepEqual([ui.tool,ui.rend.view,ui.plan.args.f,ui.plan.status],['light',0,0,'valid'],'one tap arms Light on F1');assert.equal(resolved(s,ui).redirect,undefined,'tool and floor match: no redirect');
  ui.confirmPlan();assert.equal(s.objs('light').filter(o=>o.f===0).length>0,true);
  assert.equal(step(s,ui).t,'Light both hallways');const want=ui.stepPlacement(step(s,ui));assert.equal(want.f,1,'second light goes on F2');
  const q=holdAtTarget(s,ui);assert.equal(q.f,0,'a hold now would quote on F1 (reproduced)');
  const r=resolved(s,ui);assert.equal(r.redirect,'switch');assert.equal(r.t,'Switch to F2 for this Light');ui.guideStep=r;assert.equal(ui.guideTarget(),null);
  assert.ok(captions(ui).includes('Light goes here · F2'));assert.ok(!captions(ui).includes('Place here'));assert.match(bar(ui),/Hold places another Light on F1 · lesson needs Light on F2/);
  ui.suggestPlacement();assert.deepEqual([ui.tool,ui.rend.view,ui.plan.args.f,ui.plan.status],['light',1,1,'valid'],'one tap moves to F2');assert.equal(resolved(s,ui).redirect,undefined);
  ui.plan=null;ui.planArgs=null;assert.ok(captions(ui).includes('Place here'),'matching tool and floor: the actionable cue returns');
  ui.suggestPlacement();ui.confirmPlan();assert.equal(step(s,ui).t,'F2 units');assert.equal(resolved(s,ui).redirect,'switch','next tool differs again');
  const u=captions(ui);assert.ok(u.some(t=>/goes here · F2/.test(t))&&!u.includes('Start here')&&!u.includes('Place here'));assert.doesNotMatch(ui.$('blueprint').innerHTML,/#ffd23a/,'no yellow placement outline, unit footprint or door marker while the wrong tool is armed');});

await test('repeated placement with the same tool and floor is unchanged; ordinary building outside lessons is unchanged',()=>{
  const {s,ui}=atElevatorStep();ui.suggestPlacement();ui.confirmPlan();ui.suggestPlacement();ui.plan=null;ui.planArgs=null; // Light armed on F1, first light not yet placed
  assert.equal(ui.placementMismatch(step(s,ui)),null);assert.equal(resolved(s,ui).redirect,undefined);assert.match(bar(ui),/Hold to place/);assert.doesNotMatch(bar(ui),/lesson needs/);
  s.s.lesson=null;for(const t of ['elevator','light','aisle']){ui.tool=t;assert.equal(ui.placementMismatch(null),null,'no lesson: '+t);const h=bar(ui);assert.match(h,/Hold to place/);assert.doesNotMatch(h,/lesson needs/);}
  const free=makeMaple(5);const u2=Object.create(UI.prototype);u2.g={sim:free,rend:{view:0}};u2.tool='light';assert.equal(u2.placementMismatch(null),null);});

await test('no recursion: the placement helpers never call resolveStep',()=>{
  const {s,ui}=atElevatorStep();ui.suggestPlacement();ui.confirmPlan();let calls=0;const orig=ui.resolveStep;ui.resolveStep=function(x){calls++;return orig.call(this,x);};
  ui.currentBlueprintPlan();ui.stepPlacement(step(s,ui));ui.placementMismatch(step(s,ui));assert.equal(calls,0);ui.resolveStep(step(s,ui));assert.equal(calls,1,'resolveStep itself does not re-enter');});

await test('manual Pause survives the whole chain; prior 2x is restored after each review; Space during a review hold records Pause',()=>{
  let {s,ui}=atElevatorStep(0);ui.suggestPlacement();assert.equal(s.s.speed,0);ui.confirmPlan();ui.suggestPlacement();ui.confirmPlan();ui.suggestPlacement();ui.confirmPlan();assert.equal(step(s,ui).t,'F2 units');assert.equal(s.s.speed,0,'manual Pause kept');
  ({s,ui}=atElevatorStep(2));ui.suggestPlacement();assert.equal(s.s.speed,0,'review holds time');ui.confirmPlan();assert.equal(s.s.speed,2,'prior 2x restored');ui.suggestPlacement();assert.equal(s.s.speed,0);ui.confirmPlan();assert.equal(s.s.speed,2);
  const key=keyboard(ui);ui.suggestPlacement();assert.equal(s.s.speed,0);key(' ');ui.confirmPlan();assert.equal(s.s.speed,0,'Space during the hold recorded Pause');});

await test('banner placement: below the measured phone control rows, clear of the panel; no room means wait',()=>{
  // Measured on the real page (Chromium): controls end at 107 px; sheet top 495 (393x659) / 768 (430x932); banner 60 px compact, 107 px full.
  assert.equal(bannerTop({controlsBottom:107,limit:495,height:60,H:659,prefer:null}),115,'393x659 with a panel: just under the controls');
  assert.equal(bannerTop({controlsBottom:107,limit:768,height:60,H:932,prefer:null}),115,'430x932 with a panel');
  assert.equal(bannerTop({controlsBottom:107,limit:599,height:107,H:659}),237,'393x659 no panel: unchanged mid-upper position');
  assert.equal(bannerTop({controlsBottom:107,convoBottom:300,limit:599,height:107,H:659}),310,'below request cards');
  assert.equal(bannerTop({controlsBottom:107,limit:170,height:60,H:659,prefer:null}),null,'no room: wait instead of covering');
  assert.equal(bannerTop({controlsBottom:107,limit:330,height:107,H:659}),115,'preferred spot too low: as high as the controls allow');
  for(const [lim,h] of [[495,60],[768,60],[599,107]]){const t=bannerTop({controlsBottom:107,limit:lim,height:h,H:900,prefer:null});assert.ok(t>=115&&t+h<=lim-8,'never overlaps controls or panel');}});

await test('a lesson offer hidden behind an open panel waits without holding time, then shows and holds; Later restores the prior speed',()=>{
  const s=makeMaple(3);s.s.tut={on:false,done:true,flags:{}};s.s.lesson=null;s.s.speed=2;const ui=Object.create(UI.prototype),boxes={};ui.g={sim:s,rend:{view:0,setFocus(){}},audio:{unlock(){},play(){}}};ui.title=false;ui.$=id=>boxes[id]||(boxes[id]=el());ui.toasts=[];ui.modalOpen=()=>false;ui.sfx=()=>{};
  ui.root={querySelectorAll:()=>[],querySelector:()=>null,classList:el().classList};globalThis.innerWidth=393;globalThis.innerHeight=659;const offer='interior';s.s.lessonOffer=offer;
  ui.$('sheet').firstChild={};ui.renderTut(true);assert.ok(!(ui.popupBlocks||new Set()).has('lessonOffer'),'covered by the panel: not holding time (was: held, invisible)');assert.equal(s.s.speed,2);assert.doesNotMatch(ui.$('tut').innerHTML,/lesson-chip/);
  ui.$('sheet').firstChild=null;ui.renderTut(true);assert.ok(ui.popupBlocks.has('lessonOffer'),'visible: holds as designed');assert.equal(s.s.speed,0);assert.match(ui.$('tut').innerHTML,/lesson-chip/);
  ui.onClick({target:{closest:()=>({dataset:{a:'lessonLater',v:offer}})}});assert.equal(s.s.speed,2,'answered: prior 2x restored');assert.ok(!ui.popupBlocks.has('lessonOffer'));});

console.log(n+' guidance/banner checks passed');
