// Candidate 22 final bounded repair: coordinated blueprint captions, resolved-step preview, once-per-step framing in
// the measured usable area (desktop side column included), and F3 complaint-location navigation.
// Visual geometry here uses deterministic projections; the real-page measurements are browser scenarios I-L.
import assert from 'node:assert/strict';
globalThis.window={localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
const {UI}=await import('../../js/ui.js');
const {layoutCaptions,CAPTION_PRIORITY:CP}=await import('../../js/captions.js');
const {stepState}=await import('../../js/tutorial.js');
const {makeMaple}=await import('../../js/maple.js');
const {Sim}=await import('../../js/sim.js');
const {verticalLayout,verticalDone,shaftHallState}=await import('../../js/blueprint.js');
const {diagnoseComplaint,reportedTarget,supportedFloor}=await import('../../js/complaints.js');
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
const hit=(a,b)=>a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
const noOverlap=(placed,label)=>{for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)assert.ok(!hit(placed[i].box,placed[j].box),`${label}: ${placed[i].t} overlaps ${placed[j].t}`);};
const measure=t=>t.length*7;

// ---------- 1. caption layout
await test('1. layout: crowded captions at one spot never overlap; priority order decides who keeps the best spot',()=>{
  // The reproduced failure: five captions within a few pixels of the shaft.
  const caps=[{t:'9 × 9 · 2 floors',ax:180,ay:300,prio:CP.context},{t:'Drive aisle',ax:172,ay:312,prio:CP.secondary,cls:'secondary'},{t:'Elevator',ax:182,ay:304,prio:CP.target},{t:'Place here',ax:182,ay:304,prio:CP.target,dy:-15},{t:'Entrance',ax:178,ay:309,prio:CP.secondary,cls:'secondary'},{t:'Loading',ax:176,ay:314,prio:CP.secondary,cls:'secondary'}];
  const L=layoutCaptions(caps,{width:393,height:659,obstacles:[],measure});noOverlap(L.placed,'crowded');
  for(const t of ['Elevator','Place here'])assert.ok(L.placed.some(c=>c.t===t),t+' (target) is drawn');
  assert.ok(L.placed.some(c=>/Entrance · Loading|Drive aisle · Entrance/.test(c.t)),'nearby secondary captions are grouped, not stacked');
  const target=L.placed.find(c=>c.t==='Place here');assert.ok(Math.hypot(target.x-target.ax,target.y-target.ay)<=60,'target caption stays next to its spot');});
await test('1. layout: captions avoid interface obstacles; a displaced caption keeps a leader line to its map spot',()=>{
  const hud={l:0,t:0,r:393,b:110},tut={l:0,t:530,r:393,b:659},ring={l:150,t:280,r:220,b:330};
  const L=layoutCaptions([{t:'Place here',ax:185,ay:305,prio:CP.target,dy:-15},{t:'F1 hallway · under construction',ax:185,ay:120,prio:CP.prerequisite}],{width:393,height:659,obstacles:[hud,tut,ring],measure});
  noOverlap(L.placed,'obstacles');for(const c of L.placed)for(const o of [hud,tut,ring])assert.ok(!hit(c.box,o),c.t+' clear of the interface');
  const ph=L.placed.find(c=>c.t==='Place here');assert.ok(ph.leader,'moved off its anchor: leader line drawn');});
await test('1. layout: essential captions are never hidden; only context/secondary captions may be left out',()=>{
  const wall={l:0,t:0,r:393,b:659}; // nowhere is clear
  const L=layoutCaptions([{t:'Place here',ax:100,ay:100,prio:CP.target},{t:'F2 hallway needed',ax:120,ay:120,prio:CP.prerequisite},{t:'9 × 9 · 2 floors',ax:100,ay:140,prio:CP.context},{t:'Loading',ax:90,ay:160,prio:CP.secondary,cls:'secondary'}],{width:393,height:659,obstacles:[wall],measure});
  assert.deepEqual(L.placed.map(c=>c.t).sort(),['F2 hallway needed','Place here']);assert.deepEqual(L.dropped.sort(),['9 × 9 · 2 floors','Loading']);});
await test('1. layout: placement is stable across frames (no flicker) and follows the map during pan and zoom',()=>{
  const caps=k=>[{t:'Elevator',ax:180*k,ay:300*k,prio:CP.target},{t:'Place here',ax:180*k,ay:300*k,prio:CP.target,dy:-15},{t:'Entrance',ax:186*k,ay:306*k,prio:CP.secondary,cls:'secondary'}];
  let prev=null;for(const [dx,dy,k] of [[0,0,1],[-40,-20,1],[-40,-20,1.4],[30,60,0.8]]){const c=caps(k).map(x=>({...x,ax:x.ax+dx,ay:x.ay+dy}));const L=layoutCaptions(c,{width:393,height:659,obstacles:[],measure,prev});noOverlap(L.placed,'pan/zoom');
    for(const p of L.placed)assert.ok(Math.hypot(p.x-p.ax,p.y-p.ay)<=70,'caption stays associated with its spot');if(prev){const again=layoutCaptions(c,{width:393,height:659,obstacles:[],measure,prev:new Map(L.placed.map(p=>[p.t,p.pick]))});assert.deepEqual(again.placed.map(p=>p.pick),L.placed.map(p=>p.pick),'same input, same placement');}prev=new Map(L.placed.map(p=>[p.t,p.pick]));}});

// ---------- 2. resolved-step preview on real construction state
function upLesson(){const s=makeMaple(20260929);s.s.tut={on:false,done:true,flags:{}};s.s.lesson={id:'up',idMark:s.s.nextId,built:[],flags:{},entered:true};s.s.cash=1e6;s.s.open=false;return s;}
const build=(s,k)=>{const r=s.dispatch({type:'build',...verticalLayout(s).plans[k]});assert.ok(r.ok,k+': '+r.msg);};
const settle=s=>{for(let i=0;i<20000&&s.s.orders.some(o=>o.st==='construction');i++){s.s.t++;s.step();s.events.length=0;}};
function el(){const c=new Set();return{dataset:{},innerHTML:'',textContent:'',hidden:false,firstChild:null,classList:{toggle:(k,on)=>on?c.add(k):c.delete(k),contains:k=>c.has(k),add:k=>c.add(k),remove:k=>c.delete(k)},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,right:0,top:0,bottom:0,width:0,height:0})};}
function uiFor(sim){const ui=Object.create(UI.prototype),boxes={};const R={view:0,zoom:1,center:{x:0,z:0},ox:0,oy:0,k:9,pans:[],zooms:[],
    project(x,y,h=0){return {x:this.ox+(x-y)*this.k*this.zoom+200,y:this.oy+(x+y)*this.k*this.zoom*0.5-h*this.k*this.zoom,vis:true};},pan(dx,dy){this.ox+=dx;this.oy+=dy;this.pans.push([dx,dy]);},zoomBy(f){this.zoom*=f;this.zooms.push(f);},setView(v){this.view=v;},setFocus(){},lookAt(){},setPreview(){},setSelection(){},setOverlay(){},previewG:{children:[]}};
  ui.g={sim,audio:{unlock(){},play(){}},rend:R,localsave:{ok:true,getKept:()=>null,get:()=>({})},savearchive:{list:()=>[],wouldDrop:()=>[]}};ui.title=false;ui.sfx=()=>{};ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.$=id=>boxes[id]||(boxes[id]=el());ui.root={querySelectorAll:()=>[],querySelector:()=>null,classList:el().classList};ui.modalOpen=()=>false;ui.renderTut=()=>{};ui.renderFeed=()=>{};ui.syncFloorUi=()=>{};
  globalThis.innerWidth=393;globalThis.innerHeight=659;return ui;}
const drawn=ui=>{ui.updateBlueprint();return ui.capLayout.placed.map(c=>c.t);};
await test('2. waiting after early commitment: no placement plan, no "Place here", the unfinished hallways are shown',()=>{
  const s=upLesson();build(s,'aisle');build(s,'shell2');settle(s);for(const k of ['hall','doorWide','loading','hall2'])build(s,k);
  const ui=uiFor(s);assert.equal(ui.currentBlueprintPlan(),null,'hallways only ordered: the step already waits, so no elevator placement is suggested');assert.ok(!drawn(ui).includes('Place here'));
  build(s,'elevator');assert.equal(verticalDone(s,'elevator'),false);assert.equal(ui.resolveStep(stepState(s,ui).b.steps[stepState(s,ui).cur]).redirect,'wait');
  assert.equal(ui.currentBlueprintPlan(),null,'resolved waiting step asks for no placement');
  const t=drawn(ui);assert.ok(!t.includes('Place here'),'no placement cue while waiting');assert.ok(!t.includes('Elevator'),'no elevator placement caption');
  assert.ok(t.includes('F1 hallway · under construction')&&t.includes('F2 hallway · under construction'),'the unfinished hallways are named');
  assert.doesNotMatch(ui.$('blueprint').innerHTML,/fill="#ffd23a"/,'no yellow placement outline or marker while waiting');
  for(const k of ['Drive aisle','Entrance','Loading'])assert.ok(!t.some(x=>x.includes(k)),'obsolete cue for completed work: '+k);
  // Hallways finish: the lesson moves on and the waiting cues go.
  for(let i=0;i<20000&&shaftHallState(s).some(x=>x!=='built');i++){s.s.t++;s.step();s.events.length=0;}
  assert.equal(stepState(s,ui).b.steps[stepState(s,ui).cur].t,'Light both hallways');const after=drawn(ui);assert.ok(!after.some(x=>/under construction/.test(x)));assert.ok(after.some(x=>/Place here|Start here/.test(x)),'next step shows its own target');});
await test('2. normal order: hallways finished, then the elevator step shows its target and nothing for completed work',()=>{
  const s=upLesson();build(s,'aisle');build(s,'shell2');settle(s);for(const k of ['hall','doorWide','loading','hall2'])build(s,k);settle(s);
  const ui=uiFor(s);const t=drawn(ui);assert.ok(t.includes('Place here')&&t.includes('Elevator'));assert.ok(!t.some(x=>/Drive aisle|Entrance|Loading|9 × 9/.test(x)),'completed work and the existing building are not captioned');noOverlap(ui.capLayout.placed,'elevator step');});
await test('2. a missing hallway beside a committed elevator: the hallway step returns first with its own placement; the held elevator step asks for none',()=>{
  const s=upLesson();build(s,'aisle');build(s,'shell2');settle(s);for(const k of ['hall','doorWide','loading','hall2'])build(s,k);build(s,'elevator');settle(s);
  const e=s.objs('elevator').at(-1);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])s.s.hall[1][s.idx(e.x+dx,e.y+dy)]=0; // test state: F2 hallway beside the shaft removed
  const ui=uiFor(s);const raw=stepState(s,ui).b.steps.find(x=>x.blueprint==='elevator');const r=ui.resolveStep(raw);assert.equal(r.redirect,'prereq');assert.equal(r.blueprint,undefined);
  assert.equal(stepState(s,ui).b.steps[stepState(s,ui).cur].blueprint,'hall2');assert.equal(ui.currentBlueprintPlan()?.tool,'hall','the F2 hallway placement is offered');assert.equal(ui.currentBlueprintPlan().f,1);const t=drawn(ui);assert.ok(!t.includes('Elevator'));noOverlap(ui.capLayout.placed,'missing hallway');});

// ---------- 3. framing and usable area
function framingFixture(){const s=upLesson();build(s,'aisle');build(s,'shell2');settle(s);for(const k of ['hall','doorWide','loading','hall2'])build(s,k);build(s,'elevator');
  const ui=uiFor(s);ui.safeRect=()=>({top:115,bottom:531,left:8,right:385});ui.rend.ox=260;ui.rend.oy=260;ui.guideKey='up:6wait';return {s,ui};}
const inside=(ui)=>{const r=ui.safeRect();return ui.stepOutline().every(([x,y,z])=>{const p=ui.rend.project(x,y,z);return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;});};
await test('3. the step outline (building + unfinished hallways), not one anchor cell, is framed inside the usable area once',()=>{
  const {ui}=framingFixture();assert.equal(inside(ui),false,'starts partly outside (reproduced)');ui.frameStep();assert.equal(inside(ui),true,'whole outline framed');
  const moves=ui.rend.pans.length;ui.frameStep();ui.frameStep();assert.equal(ui.rend.pans.length,moves,'once per step');assert.equal(ui.autoPanKey,ui.guideKey,'ring auto-pan for this step is satisfied, so it cannot pull the outline out again');});
await test('3. after framing, the player\'s own pan and zoom are never undone; a new step frames again',()=>{
  const {ui}=framingFixture();ui.frameStep();ui.rend.pan(-150,90);ui.rend.zoomBy(1.6);const pans=ui.rend.pans.length,zooms=ui.rend.zooms.length;
  for(let i=0;i<5;i++)ui.frameStep();assert.equal(ui.rend.pans.length,pans);assert.equal(ui.rend.zooms.length,zooms,'no snap back');
  ui.guideKey='up:7';ui.frameStep();assert.ok(ui.rend.pans.length>pans,'next step frames');});
await test('3. a step that changes during a drag or pinch leaves the camera alone; framing never zooms in',()=>{
  const {ui}=framingFixture();ui.pointerBusy=true;ui.frameStep();assert.equal(ui.rend.pans.length,0);ui.pointerBusy=false;ui.frameStep();assert.equal(ui.rend.pans.length,0,'not deferred to the end of the gesture either');
  const f=framingFixture();f.ui.rend.zoom=3;f.ui.frameStep();assert.ok(f.ui.rend.zooms.every(z=>z<1),'zoom out only, as far as needed');assert.equal(inside(f.ui),true);
  const g=framingFixture();g.ui.rend.ox=-80;g.ui.rend.oy=40;g.ui.frameStep();assert.equal(g.ui.rend.zooms.length,0,'fits without zooming: pan only');});
function rectEl(l,t,r,b){return {hidden:false,firstElementChild:null,getBoundingClientRect:()=>({left:l,top:t,right:r,bottom:b,width:r-l,height:b-t})};}
function safeFixture(W,H,els){const ui=Object.create(UI.prototype),boxes={tabs:rectEl(...els.tabs),sheet:{firstElementChild:null},abar:{firstElementChild:null},tut:{firstElementChild:els.tut?rectEl(...els.tut):null}};ui.$=id=>boxes[id];ui.root={querySelector:sel=>els[sel]?rectEl(...els[sel]):null};globalThis.innerWidth=W;globalThis.innerHeight=H;return ui;}
await test('3. desktop: the side view-control column narrows the usable width instead of pushing the top down',()=>{
  // Rectangles measured on the real page at 1280x720 (scenario J reproduces them live).
  const ui=safeFixture(1280,720,{tabs:[872,660,1272,714],tut:[8,600,368,656],'.hud':[8,8,485,58],'.speed':[248,8,436,58],'.viewctl':[1206,64,1272,448]});const r=ui.safeRect();
  assert.ok(r.top<=66,'top follows the HUD (was 456)');assert.ok(r.right<=1198,'column narrows the width');assert.ok(r.bottom-r.top>=500,'usable height restored');
  // Phones: the view-control row still sits under the HUD and pushes the top, unchanged.
  const p=safeFixture(393,659,{tabs:[8,599,373,653],tut:[8,539,385,595],'.hud':[8,6,385,52],'.speed':[8,57,190,107],'.viewctl':[201,57,385,107]}).safeRect();assert.deepEqual(p,{top:115,bottom:531,left:8,right:385});});

// ---------- 4. F3 complaint location (real three-floor property, production feedback sheet and click handler)
const three=makeMaple(3);three.s.cash=1e6;three.s.open=true;{const SH=three.objs('shell')[0].id;for(let k=0;k<2;k++){const P=three.verticalPlan(SH);assert.ok(three.dispatch({type:'verticalUpgrade',...P}).ok);const o=three.s.orders.at(-1);for(let i=0;i<60000&&o.st==='construction';i++){three.step();three.events.length=0;}three.dispatch({type:'commission',order:o.id});}}
const copy=()=>new Sim(JSON.parse(JSON.stringify(three.s)));
function feedbackUi(sim){const ui=Object.create(UI.prototype),seen=[];ui.g={sim,audio:{unlock(){}},rend:{lookAt:(...a)=>seen.push(['camera',...a])}};ui.setTab=v=>seen.push(['tab',v]);ui.setView=v=>seen.push(['floor',v]);ui.select=v=>seen.push(['select',v]);ui.feedbackSim=sim;ui.feedbackEpoch=0;return {ui,seen};}
const click=(ui,targetJson)=>ui.onClick({target:{closest:()=>({dataset:{a:'complaintView',property:'0',target:targetJson}})}});
const unescape=h=>h.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
await test('4. F1, F2 and F3 reports: Cause & remedy offers View reported location, which opens that floor at that unit',()=>{
  for(const f of [0,1,2]){const sim=copy();const u=sim.objs('unit').find(x=>(x.f||0)===f&&x.access==='interior');sim.s.thoughts=[];sim.thought({id:950+f,unit:u.id,x:u.x,y:u.y,f,size:u.size},'The hallway is dark.');const th=sim.s.thoughts.at(-1);
    const d=diagnoseComplaint(sim,th);assert.equal(d.target?.f,f,`F${f+1} target resolves`);assert.doesNotMatch(d.location,/unavailable/);assert.match(d.location,new RegExp(`F${f+1}`));
    const {ui,seen}=feedbackUi(sim);ui.feedbackFocus=th;const html=ui.feedbackSheet();const m=html.match(/data-a="complaintView"[^>]*data-target="([^"]*)"/);assert.ok(m,`F${f+1}: production sheet renders the View button`);
    click(ui,unescape(m[1]));assert.deepEqual(seen.find(x=>x[0]==='floor'),['floor',f]);const cam=seen.find(x=>x[0]==='camera');assert.deepEqual([cam[1],cam[2]],[th.location.x,th.location.y]);assert.ok(seen.some(x=>x[0]==='select'&&x[1]===u.id),`F${f+1}: the reported unit is selected`);}});
await test('4. unsupported floors (F4/F5, beyond the property, non-integer) and invalid coordinates are rejected',()=>{
  const sim=copy();assert.equal(supportedFloor(sim,2),true);for(const f of [3,4,-1,1.5,'2',null,NaN])assert.equal(supportedFloor(sim,f),false,'floor '+f);
  // Even with five floor layers allocated (architecture supports five), F4/F5 stay unexposed.
  const five=copy();for(const k of ['hall','dirt'])while(five.s[k].length<5)five.s[k].push(new Array(five.s.W*five.s.H).fill(0));five.objs('shell')[0].floors=5;assert.equal(supportedFloor(five,3),false);assert.equal(supportedFloor(five,4),false);
  const one=makeMaple(3);assert.equal(supportedFloor(one,2),false,'a two-layer property has no F3');
  for(const l of [{x:-1,y:2,f:2},{x:2,y:sim.s.H,f:2},{x:'a',y:2,f:2},{x:2,y:2,f:3},{x:2,y:2,f:2.5}])assert.equal(reportedTarget(sim,l),null,JSON.stringify(l));
  const {ui,seen}=feedbackUi(sim);for(const l of [{x:2,y:2,f:3},{x:2,y:2,f:4},{x:999,y:2,f:2}])click(ui,JSON.stringify(l));assert.equal(seen.length,0,'no camera, floor or selection change');});
await test('4. stale reports: a removed unit keeps its spot without selecting anything; a floor no building reaches opens F1',()=>{
  const sim=copy();const u=sim.objs('unit').find(x=>x.f===2);const l={obj:u.id,x:u.x,y:u.y,f:2};delete sim.s.objects[u.id];let {ui,seen}=feedbackUi(sim);click(ui,JSON.stringify(l));
  assert.deepEqual(seen.find(x=>x[0]==='floor'),['floor',2]);assert.ok(seen.some(x=>x[0]==='camera'));assert.ok(!seen.some(x=>x[0]==='select'&&x[1]!=null),'nothing else selected');
  const low=copy();low.objs('shell').forEach(o=>{if(o.floors>2)o.floors=2;});({ui,seen}=feedbackUi(low));click(ui,JSON.stringify({x:u.x,y:u.y,f:2}));assert.deepEqual(seen.find(x=>x[0]==='floor'),['floor',0],'stale upper floor: shown from F1');});

console.log(n+' final-repair checks passed');
