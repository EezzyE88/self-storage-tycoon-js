// Candidate 22 independent-review repairs (#1-#10), exercised through the actual failure paths:
// the real main.js keydown handler, real localsave/savearchive modules over a localStorage that can fail writes,
// real construction ticks for ordered vs built hallways and for the freight handover, and real cash accounting.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Browser storage with injectable write failures (installed before the save modules load).
const mem=new Map();let failWrite=null;
globalThis.window={localStorage:{getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>{if(k==='sst.probe'||k==='sst.probe.archive'){mem.set(k,String(v));return;}if(failWrite&&failWrite(k))throw new DOMException('QuotaExceededError','QuotaExceededError');mem.set(k,String(v));},removeItem:k=>mem.delete(k)}};
const {localsave}=await import('../../js/localsave.js');
const {savearchive,ARCHIVE_MAX}=await import('../../js/savearchive.js');
const {UI}=await import('../../js/ui.js');
const {BEATS,LESSONS,stepState}=await import('../../js/tutorial.js');
const {makeMaple}=await import('../../js/maple.js');
const {Sim,fmtTime}=await import('../../js/sim.js');
const {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TOOLS}=await import('../../js/data.js');
const {modeLabel,sandboxName}=await import('../../js/scenarios.js');
const {verticalLayout,verticalDone,shaftHallState}=await import('../../js/blueprint.js');
const {tickVertical}=await import('../../js/vertical.js');
const {unitStatus,UNIT_STATUS}=await import('../../js/status.js');
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
const clone=s=>new Sim(JSON.parse(JSON.stringify(s.s)));
function el(){const c=new Set();return{dataset:{},innerHTML:'',textContent:'',hidden:false,firstChild:null,classList:{toggle:(k,on)=>on?c.add(k):c.delete(k),contains:k=>c.has(k),add:k=>c.add(k),remove:k=>c.delete(k)},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[]};}
function fixture(speed=0,sim=makeMaple(3)){sim.s.speed=speed;const ui=Object.create(UI.prototype),boxes={};
  ui.g={sim,audio:{unlock(){},play(){}},rend:{view:'ext',overlay:null,setView(v){this.view=v;},setOverlay(k){this.overlay=k;},setPreview(){},setSelection(){},setFocus(){},lookAt(){},rotate(){},pan(){},previewG:{children:[]}},localsave,savearchive};
  ui.title=false;ui.sfx=()=>{};ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.$=id=>boxes[id]||(boxes[id]=el());ui.root={querySelectorAll:()=>[],querySelector:()=>null,classList:el().classList};
  ui.renderTut=()=>{};ui.renderFeed=()=>{};ui.syncFloorUi=()=>{};return{ui,sim,boxes};}
// The real keydown listener from js/main.js, evaluated against a minimal `game`.
const mainSrc=readFileSync('js/main.js','utf8'),kStart=mainSrc.indexOf("window.addEventListener('keydown'"),kEnd=mainSrc.indexOf('\n});',kStart)+4;
function keyboard(ui){const h={},game={ui,sim:ui.g.sim,rend:ui.g.rend,showcase:{photo:false,mode:null}};vm.runInNewContext(mainSrc.slice(kStart,kEnd),{window:{addEventListener:(t,f)=>h[t]=f},game});return key=>h.keydown({key,target:{tagName:'CANVAS'},preventDefault(){}});}

// ---------- #1 Space during a temporary pause (real handler)
await test('#1 Space during any temporary pause records a manual Pause and never schedules a resume',()=>{
  for(const kind of ['panel','modal','review','convo','tutorial','lessonOffer','celebrate','rotate','vpreview','freeze'])for(const v of [1,2,4]){
    const {ui,sim}=fixture(v),key=keyboard(ui);ui.pauseForPopup(kind);assert.equal(sim.s.speed,0);key(' ');assert.equal(sim.s.speed,0,`${kind}: Space never runs time`);key(' ');assert.equal(sim.s.speed,0,'a second Space is still Pause');
    ui.resumePopup(kind);assert.equal(sim.s.speed,0,`${kind} from ${v}x: closing leaves manual Pause`);}});
await test('#1 the reviewer reproduction: 4x → blocking panel → Space → close panel stays paused',()=>{
  const {ui,sim}=fixture(4),key=keyboard(ui);const box={innerHTML:'',firstChild:null,querySelector(){return null;}};ui.$=()=>box;ui.syncFeedbackProperty=()=>{};ui.tab='business';ui.businessSheet=()=>ui.sheet('Business','','<h3>Financing</h3>');
  ui.sheetTall=true;ui.renderSheet(true);assert.equal(sim.s.speed,0);key(' ');ui.sheetTall=false;ui.renderSheet(true);assert.equal(sim.s.speed,0);});
await test('#1 outside a hold Space toggles; explicit 1x/2x/4x resume only after the hold is released',()=>{
  const {ui,sim}=fixture(0),key=keyboard(ui);key(' ');assert.equal(sim.s.speed,1);key(' ');assert.equal(sim.s.speed,0);sim.s.speed=4;key(' ');assert.equal(sim.s.speed,0);
  sim.s.speed=2;ui.pauseForPopup('modal');key('3');assert.equal(sim.s.speed,0,'number keys inert during the hold');key(' ');ui.resumePopup('modal');assert.equal(sim.s.speed,0);key('2');assert.equal(sim.s.speed,2,'2x resumes after release');
  const t=fixture(0);const tk=keyboard(t.ui);t.ui.tutMin=false;t.ui.pauseForPopup('tutorial');tk('1');assert.equal(t.sim.s.speed,1,'1 with only the tutorial card is an explicit run');assert.equal(t.ui.popupBlocks.size,0);});
// ---------- #2 Freeze in the shared controller
await test('#2 Freeze: Space cannot run time while frozen; Unfreeze and exiting photo mode preserve manual Pause',()=>{
  for(const exit of ['unfreeze','exitPhoto']){const {ui,sim}=fixture(4),key=keyboard(ui);ui.pauseForPopup('freeze');assert.equal(sim.s.speed,0);key(' ');assert.equal(sim.s.speed,0,'frozen: Space does not run');key('2');assert.equal(sim.s.speed,0);ui.resumePopup('freeze');assert.equal(sim.s.speed,0,exit);}
  const {ui,sim}=fixture(4);ui.pauseForPopup('freeze');ui.resumePopup('freeze');assert.equal(sim.s.speed,4,'without a Pause, unfreeze restores 4x');
  const sc=readFileSync('js/showcase.js','utf8');assert.doesNotMatch(sc,/freezeSpeed/);assert.match(sc,/if \(sc\.freeze\) ui\.pauseForPopup\('freeze'\); else ui\.resumePopup\('freeze'\);/);assert.match(sc,/if \(sc\.freeze\) \{ sc\.freeze = false; ui\.resumePopup\('freeze'\); \}/);assert.match(sc,/game\.attach = \(sim, kind, opts\) => \{ if \(sc\.photo\) exitPhoto\(\);/);});

// ---------- #3 / #4 labels and visible instructions
await test('#3 ring labels avoid blueprint captions, and no blueprint caption is drawn twice',()=>{
  const u=readFileSync('js/ui.js','utf8');assert.match(u,/\.actionbar \.status, #blueprint text'\)/);
  const s=makeMaple(20260929);s.s.tut={on:false,done:true,flags:{}};s.s.lesson={id:'up',idMark:s.s.nextId,built:[],flags:{},entered:true};s.s.creative=true;
  for(const k of ['aisle','shell2','hall','doorWide','loading','hall2'])assert.ok(s.dispatch({type:'build',...verticalLayout(s).plans[k]}).ok,k);
  const ui=Object.create(UI.prototype),box={innerHTML:'',setAttribute(){}};ui.g={sim:s,rend:{view:0,project:(x,y)=>({x:x*12,y:y*9,vis:true})}};ui.$=()=>box;ui.modalOpen=()=>false;globalThis.innerWidth=800;globalThis.innerHeight=600;
  assert.equal(stepState(s,{}).b.steps[stepState(s,{}).cur].blueprint,'elevator');ui.updateBlueprint();const caps=[...box.innerHTML.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m=>m[1].toLowerCase());
  assert.equal(caps.filter(c=>c==='elevator').length,1,'one Elevator caption');assert.equal(new Set(caps).size,caps.length,'no duplicate captions: '+caps.join('|'));});
await test('#4 the docked instruction strip keeps the how-to line visible',()=>{
  const {ui,sim}=fixture(0),box={innerHTML:''};ui.$=()=>box;ui.rend.setFocus=()=>{};ui.currentBlueprintPlan=()=>null;delete ui.renderTut;sim.s.tut.beat=BEATS.findIndex(b=>b.id==='makeready');ui.tutMin=true;UI.prototype.renderTut.call(ui,true);
  assert.match(box.innerHTML,/<span class="how-line">In the unit panel that opened|<span class="how-line">It.s on the drive-up row/);
  const css=readFileSync('css/game.css','utf8');assert.match(css,/#ui\.has-sheet \.tut:not\(\.offer\):not\(\.scen\) \.how-line, #ui:has\(\.actionbar\) \.tut:not\(\.offer\):not\(\.scen\) \.how-line \{ display:-webkit-box/);assert.match(css,/#ui \.tut \.how-line \{ display:none; \}/);});

// ---------- #5 hallway: missing / ordered / built, with a working route to time and no auto-resume
function upLesson(){const s=makeMaple(20260929);s.s.tut={on:false,done:true,flags:{}};s.s.lesson={id:'up',idMark:s.s.nextId,built:[],flags:{},entered:true};s.s.cash=1e6;s.s.open=false;return s;}
await test('#5 an ordered hallway is not a built one: the elevator step waits with a live route to time controls',()=>{
  const s=upLesson();const built=(sim,keys)=>{for(const k of keys)assert.ok(sim.dispatch({type:'build',...verticalLayout(sim).plans[k]}).ok,k);};const settle=sim=>{for(let i=0;i<20000&&sim.s.orders.some(o=>o.st==='construction');i++){sim.step();sim.events.length=0;}};
  built(s,['aisle','shell2']);settle(s);built(s,['hall','doorWide','loading','hall2']); // aisle and shell built; hallways only ordered
  const st=stepState(s,{}),step=st.b.steps[st.cur];assert.equal(step.blueprint,'elevator');assert.deepEqual(shaftHallState(s),['ordered','ordered']);
  {const P=s.plan(verticalLayout(s).plans.elevator);assert.match([...(P.reasons||[]),...(P.missing||[])].join(' '),/No hallway beside the shaft/,'simulation agrees the shaft would not work yet');}
  const {ui}=fixture(0,s);let r=ui.resolveStep(step);assert.equal(r.redirect,'wait');assert.match(r.t,/F1 hallway ordered: let construction finish/);assert.equal(r.sel,'#speed [data-v="4"]');assert.equal(s.s.speed,0,'guidance never resumes time');
  ui.pauseForPopup('panel');ui.sheetTall=true;ui.$('sheet').firstChild={};r=ui.resolveStep(step);assert.equal(r.redirect,'back','expanded panel: Back to map first');ui.sheetTall=false;ui.resumePopup('panel');
  ui.tool='elevator';ui.pauseForPopup('review');r=ui.resolveStep(step);assert.equal(r.redirect,'tool','placement review: Stop building first');assert.match(r.sel,/cancelTool/);ui.tool=null;ui.resumePopup('review');
  ui.pauseForPopup('convo');r=ui.resolveStep(step);assert.equal(r.redirect,'requests');ui.resumePopup('convo');
  ui.pauseForPopup('rotate');r=ui.resolveStep(step);assert.equal(r.sel,null,'no ring on an inert control');ui.resumePopup('rotate');assert.equal(s.s.speed,0);
  for(let i=0;i<20000&&shaftHallState(s).some(x=>x!=='built');i++){s.s.t++;s.step();s.events.length=0;}
  assert.deepEqual(shaftHallState(s),['built','built']);const done=ui.resolveStep(step);assert.equal(done,step,'built hallways: place the elevator');{const P=s.plan(verticalLayout(s).plans.elevator);assert.doesNotMatch([...(P.reasons||[]),...(P.missing||[])].join(' '),/No hallway beside the shaft/);}
  const m=upLesson();built(m,['aisle','shell2']);settle(m);built(m,['hall','doorWide','loading','hall2']);const c=verticalLayout(m).plans.elevator.a;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])m.s.hall[1][m.idx(c.x+dx,c.y+dy)]=0;
  const p=fixture(0,m).ui.resolveStep(step);assert.equal(p.redirect,'prereq');assert.match(p.t,/Build the F2 hallway first/);});

// ---------- #6 affordability
await test('#6 Confirm is disabled below the hard cash requirement and states the shortfall; reserve stays advisory',()=>{
  for(const [cash,disabled] of [[6527,true],[9500,false],[20000,false]]){const {ui,sim}=fixture(0);sim.s.cash=cash;const box={innerHTML:''};ui.$=()=>box;ui.tool='elevator';ui.plan={status:'valid',cost:9500,count:1,reasons:[],missing:[],warn:[],dur:2160};ui.canRush=()=>false;ui.renderActionBar();
    const btn=box.innerHTML.match(/<button class="btn pri" data-a="confirm"[^>]*>/)[0];assert.equal(/disabled/.test(btn),disabled,`cash ${cash}`);
    if(disabled)assert.match(box.innerHTML,/Not enough cash: needs \$2,973 more \(\$6,527 available, \$9,500 required\)/);else assert.doesNotMatch(box.innerHTML,/Not enough cash/);}
  const {ui,sim}=fixture(0);sim.s.cash=9600;sim.s.creative=false;const box={innerHTML:''};ui.$=()=>box;ui.tool='elevator';ui.plan={status:'valid',cost:9500,count:1,reasons:[],missing:[],warn:[],dur:2160};ui.canRush=()=>false;ui.renderActionBar();
  assert.doesNotMatch(box.innerHTML.match(/data-a="confirm"[^>]*>/)[0],/disabled/,'affordable but under reserve: still allowed (advisory only)');
  const f=fixture(0);f.sim.s.creative=true;f.sim.s.cash=0;const b2={innerHTML:''};f.ui.$=()=>b2;f.ui.tool='elevator';f.ui.plan={status:'valid',cost:9500,count:1,reasons:[],missing:[],warn:[],dur:0};f.ui.canRush=()=>false;f.ui.renderActionBar();assert.doesNotMatch(b2.innerHTML.match(/data-a="confirm"[^>]*>/)[0],/disabled/,'Free Build is unlimited');});

// ---------- #7 transactional save recovery with real storage modules and failing writes
const main=readFileSync('js/main.js','utf8');
function harness(){const ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave,savearchive,cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
  const g=ctx.game;g.localsave=localsave;g.ui={title:false};g.rend={view:'ext'};g.autosave=async()=>localsave.put(await g.saveCode(),g.saveMeta()); // main.js assigns game.localsave outside the evaluated slice; a restore removes its archive copy only after this browser save succeeds
  g.attach=function(s){this.sim=s;};return g;}
async function codeFor(g,name,cash){const sim=makeMaple(7);sim.s.cash=cash;const keep=[g.sim,g.company];g.sim=sim;g.company={props:[{name,sim}],active:0,feed:[]};const code=await g.saveCode();[g.sim,g.company]=keep;return {code,meta:{name,day:1,cash}};}
function session(g,name,cash){const sim=makeMaple(9);sim.s.cash=cash;g.sim=sim;g.company={props:[{name,sim}],active:0,feed:[]};}
function uiFor(g){const ui=Object.create(UI.prototype);ui.g=g;ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.closeModal=()=>{};ui.sfx=()=>{};ui.contSave=null;return ui;}
const snap=()=>JSON.stringify([...mem].filter(([k])=>!/probe/.test(k)).sort());
await test('#7 Restore previous game stores the outgoing game first; a failed store loads nothing and changes nothing',async()=>{
  mem.clear();failWrite=null;const g=harness();const prev=await codeFor(g,'Maple Previous',1111);localsave.keep({...prev,at:1});session(g,'Running Lot',2222);const running=g.sim;
  failWrite=k=>k==='sst.kept.previous';const before=snap();const ui=uiFor(g);assert.equal(await ui.restoreKept(),false);
  assert.equal(snap(),before,'slots unchanged byte-for-byte');assert.equal(g.sim,running,'running game not replaced');assert.match(ui.toasts.at(-1),/could not be stored safely, so the previous game was not restored\. Nothing was changed\./);assert.doesNotMatch(ui.toasts.join(' '),/now the previous game/);
  failWrite=null;assert.equal(await ui.restoreKept(),true);assert.equal(g.sim.s.cash,1111);assert.equal(localsave.getKept().meta.name,'Running Lot');assert.match(ui.toasts.at(-1),/The game you left is now the previous game/);});
await test('#7 Archive restore under storage failure keeps every archived game, even with a full archive',async()=>{
  mem.clear();failWrite=null;const g=harness();for(let i=0;i<ARCHIVE_MAX;i++)assert.ok(savearchive.push({...(await codeFor(g,'Archived '+i,100+i)),at:i}));localsave.keep({...(await codeFor(g,'Kept Older',555)),at:9});session(g,'Running Lot',2222);const running=g.sim;
  assert.equal(savearchive.list().length,ARCHIVE_MAX);const before=snap(),names=savearchive.list().map(r=>r.meta.name);
  for(const fail of [k=>k==='sst.kept.previous',k=>k==='sst.kept.archive']){failWrite=fail;const ui=uiFor(g);assert.equal(await ui.restoreArchived(2),false);
    assert.equal(snap(),before,'archive and kept slot restored byte-for-byte');assert.deepEqual(savearchive.list().map(r=>r.meta.name),names,'no archived game dropped');assert.equal(g.sim,running);assert.match(ui.toasts.at(-1),/nothing was restored\. Nothing was changed\./);}
  failWrite=null;const ui=uiFor(g);const target=savearchive.list()[2].meta.name;assert.equal(await ui.restoreArchived(2),true);assert.equal(g.sim.s.cash,102);
  const after=savearchive.list().map(r=>r.meta.name);assert.equal(after.length,ARCHIVE_MAX,'still full: one restored out, displaced previous game in');assert.ok(!after.includes(target));assert.ok(after.includes('Kept Older'));assert.equal(localsave.getKept().meta.name,'Running Lot');});
await test('#7 keeping the outgoing game is atomic: a failed write leaves no half-moved previous game',async()=>{
  mem.clear();failWrite=null;const g=harness();localsave.keep({...(await codeFor(g,'Kept Older',555)),at:1});session(g,'Running Lot',2222);const before=snap();
  failWrite=k=>k==='sst.kept.previous';{const r=await g.keepCurrent(null);assert.equal(r.ok,false);assert.equal(r.verified&&r.unchanged,true,'failure verified as no change');}assert.equal(snap(),before,'archive not left holding a duplicate');assert.equal(savearchive.list().length,0);
  failWrite=null;assert.equal((await g.keepCurrent(null)).ok,true);assert.equal(savearchive.list()[0].meta.name,'Kept Older');assert.equal(localsave.getKept().meta.name,'Running Lot');});

// ---------- #8 handover presentation (real F3 service test) vs genuine disconnection
await test('#8 held upper units show "Handover test" everywhere, not a fault; genuine disconnections still warn',()=>{
  const sim=makeMaple(3);sim.s.cash=1e6;sim.s.open=true;const SH=sim.objs('shell')[0].id;let o=null;
  for(let k=0;k<2;k++){const R=sim.verticalPlan(SH);sim.dispatch({type:'verticalUpgrade',...R});o=sim.s.orders.at(-1);if(k===0){for(let i=0;i<60000&&o.st==='construction';i++){sim.step();sim.events.length=0;}sim.dispatch({type:'commission',order:o.id});}}
  let held=[];for(let i=0;i<60000&&o.st==='construction';i++){sim.step();sim.events.length=0;held=sim.objs('unit').filter(u=>u.accessHold!=null);if(held.length)break;}
  assert.equal(held.length,14);const {ui}=fixture(sim.s.speed,sim);
  assert.ok(held.every(u=>unitStatus(u)==='handover'));assert.equal(UNIT_STATUS.handover.label,'Handover test');
  ui.computePins();assert.equal(ui.pinList.filter(p=>p.k==='blocked').length,0,'no fault pins for held units');
  assert.match(ui.coachHint().text,/Freight handover test: 14 upper units are briefly closed/);assert.doesNotMatch(ui.coachHint().text,/can't be reached/);
  ui.sel=held[0].id;assert.match(ui.dockSummary('Unit',''),/Handover test/);
  assert.match(readFileSync('js/render.js','utf8'),/if \(u\.blocked\) k = u\.accessHold != null \? null : 'missing';/);
  for(let i=0;i<60000&&o.st==='construction';i++){sim.step();sim.events.length=0;}sim.dispatch({type:'commission',order:o.id});sim.ensure();assert.equal(sim.objs('unit').filter(u=>u.blocked).length,0);
  const u=sim.objs('unit').find(u=>u.f===2&&u.cstate==='operating'),fc=sim.unitFront(u)[0];sim.s.hall[2][sim.idx(fc.x,fc.y)]=0;sim.markDirty();sim.ensure();
  assert.ok(sim.events.some(e=>e.type==='access_lost'));assert.equal(unitStatus(u),'blocked');ui.computePins();assert.ok(ui.pinList.some(p=>p.k==='blocked'&&p.id===u.id));assert.match(ui.coachHint().text,/can't be reached/);});

// ---------- #9 commissioning scope
await test('#9 building commissioning offers this order first; the property-wide action states its scope',()=>{
  const sim=makeMaple(3);sim.s.cash=1e6;const SH=sim.objs('shell')[0].id;const R=sim.verticalPlan(SH);sim.dispatch({type:'verticalUpgrade',...R});const o=sim.s.orders.at(-1);for(let i=0;i<60000&&o.st==='construction';i++){sim.s.t++;tickVertical(sim,o);}sim.ensure();
  const other=sim.objs('unit').find(u=>u.f===0&&u.cstate==='operating'&&!u.lease);other.cstate='ready';other.order=null;
  const {ui}=fixture(0,sim);const h=ui.buildingCommissionHtml(sim.s.objects[SH]);
  assert.match(h,/Commission F2 order · 14 units/);assert.match(h,/Commission all 15 ready units on property/);assert.match(h,/Property-wide: includes ready units outside this building/);assert.ok(h.indexOf('F2 order')<h.indexOf('all 15'));assert.doesNotMatch(readFileSync('js/ui.js','utf8'),/>Commission ready units</);
  const cmd=JSON.parse(h.match(/data-cmd='([^']+)'>Commission F2 order/)[1]);assert.ok(sim.dispatch(cmd).ok);assert.equal(other.cstate,'ready','order commissioning leaves the unrelated unit');
  assert.equal(fixture(0,sim).ui.buildingCommissionHtml(sim.s.objects[SH]).match(/Commission all 1 ready unit on property/)?.length,1);});

// ---------- #10 information-only ledger facts
await test('#10 cancellation records penalty, work-in-progress and retained-prerequisite facts without moving cash',()=>{
  const sim=makeMaple(3);sim.s.cash=1e6;const SH=sim.objs('shell')[0].id;const R=sim.verticalPlan(SH);sim.dispatch({type:'verticalUpgrade',...R});let o=sim.s.orders.at(-1);for(let i=0;i<20;i++){sim.s.t++;tickVertical(sim,o);}
  let fin=JSON.stringify(sim.s.finance),cash=sim.s.cash;sim.dispatch({type:'cancelOrder',id:o.id});assert.equal(sim.s.cash-cash,17810);
  assert.match(sim.s.ledger.at(-1).note,/Full undo within the grace period: no penalty, nothing retained/);assert.equal(sim.s.ledger.at(-1).amt,0);
  sim.dispatch({type:'verticalUpgrade',...sim.verticalPlan(SH)});o=sim.s.orders.at(-1);while(o.vertical.phase<1){sim.s.t++;tickVertical(sim,o);}for(let i=0;i<100;i++){sim.s.t++;tickVertical(sim,o);}
  const finBefore=JSON.parse(JSON.stringify(sim.s.finance));cash=sim.s.cash;const n0=sim.s.ledger.length;sim.dispatch({type:'cancelOrder',id:o.id});
  const rows=sim.s.ledger.slice(n0);assert.deepEqual(rows.map(r=>[r.cat,r.amt]),[['capex',10371],['info',0],['info',0],['info',0]]);assert.ok(rows.slice(1).every(r=>r.info===true));
  assert.match(rows[1].note,/Cancellation penalty, not refunded: \$6,913\.39/);assert.match(rows[2].note,/Work in progress not refunded: \$129\.61/);assert.match(rows[3].note,/Retained with the building: reinforcement \$396; the next F2 quote omits it/);
  assert.equal(sim.s.cash-cash,10371,'only the refund moves cash');
  const delta=(a,b)=>JSON.stringify(a.cashDays.map(d=>[d.day,d.incoming,d.outgoing,d.categories]))!==JSON.stringify(b.cashDays.map(d=>[d.day,d.incoming,d.outgoing,d.categories]));
  const day=sim.s.finance.cashDays.at(-1);assert.equal(day.categories.info,undefined,'no info category in cash accounting');assert.ok(delta(finBefore,sim.s.finance));
  const w=sim.cashWindow(30);const sum=sim.s.ledger.filter(r=>!r.info&&r.t>sim.s.t-30*1440).reduce((a,r)=>a+r.amt,0);assert.ok(Math.abs(w.net-sum)<0.01||w.complete===false,'cash window equals non-info ledger');
  const legacy=JSON.parse(JSON.stringify(sim.s));delete legacy.finance;const L=new Sim(legacy);for(const d of L.s.finance.cashDays)assert.equal(d.categories.info,undefined,'legacy migration skips info rows');
  const {ui}=fixture(0,sim);ui.renderSheet=()=>{};const box={innerHTML:''};ui.$=()=>box;ui.showFinances();assert.match(box.innerHTML,/— info/);assert.match(box.innerHTML,/Information only · no cash moved/);});
console.log(`${n} review-repair checks passed`);
