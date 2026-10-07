// Candidate 22 regressions: floor identity, completion counts, save/import safety, UI isolation, tutorial state machine,
// Requests navigation, expansion review/preview, cancellation confirmation, copy consistency and orientation policy.
// UI checks call production handlers with minimal DOM mocks; visual/touch behavior is covered by browser emulation QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI,floorName,completeText} from '../../js/ui.js';
import {BEATS,LESSONS,stepState,alreadyShowing} from '../../js/tutorial.js';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {expansionEvidence,tickVertical} from '../../js/vertical.js';
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
const clone=sim=>new Sim(JSON.parse(JSON.stringify(sim.s)));

// Three-floor fixture through the real staged packages (Building 12 on Maple, as in the Candidate-21 playtest).
const three=makeMaple(3);three.s.cash=1e6;three.s.open=true;const SH=three.objs('shell')[0].id;const charges=[],completions=[];
for(let k=0;k<2;k++){const R=three.verticalPlan(SH);const cash=three.s.cash;assert.ok(three.dispatch({type:'verticalUpgrade',...R}).ok);charges.push(cash-three.s.cash);const ord=three.s.orders.at(-1);for(let i=0;i<60000&&ord.st==='construction';i++){three.step();completions.push(...three.events.filter(e=>e.type==='complete'||e.type==='access_lost'));three.events.length=0;}if(k===0)assert.ok(three.dispatch({type:'commission',order:ord.id}).ok);}
const unitNo=num=>three.objs('unit').find(u=>u.num===num);

// Minimal DOM: elements with classList/dataset; enough for the production handlers under test.
function el(attrs={}){const cls=new Set(attrs.cls||[]);return{dataset:attrs.dataset||{},textContent:'',innerHTML:'',hidden:false,firstChild:null,attrs:{},classList:{toggle:(c,on)=>{on===undefined?(cls.has(c)?cls.delete(c):cls.add(c)):on?cls.add(c):cls.delete(c);},contains:c=>cls.has(c),add:c=>cls.add(c),remove:c=>cls.delete(c)},setAttribute(k,v){this.attrs[k]=v;},cls,querySelector:()=>null,querySelectorAll:()=>[]};}
function fixture(sim=clone(three),speed=0){sim.s.speed=speed;const ui=Object.create(UI.prototype);const floors=[el({dataset:{a:'view',v:'ext'}}),el({dataset:{a:'view',v:'0'}}),el({dataset:{a:'floorChoose'}})];const boxes={};
  const rend={view:'ext',overlay:null,setView(v){this.view=v;},setOverlay(k){this.overlay=k;},setPreview(p){this.preview=p;},setSelection(){},setFocus(){},lookAt(){}};
  ui.g={sim,audio:{unlock(){},play(){}},rend,localsave:{ok:true,getKept:()=>null,get:()=>({})},savearchive:{list:()=>[],wouldDrop:()=>null},playing:()=>true,saveMeta:()=>({name:'Current',day:9,cash:1234}),outgoingMeta:()=>({name:'Current',day:9,cash:1234})};
  ui.title=false;ui.sfx=()=>{};ui.toasts=[];ui.toast=(t)=>ui.toasts.push(t);ui.$=id=>boxes[id]||(boxes[id]=el());
  ui.root={querySelectorAll:sel=>sel==='#floors button'?floors:[],querySelector:sel=>sel==='[data-a="floorChoose"]'?floors[2]:null,classList:el().classList};
  ui.renderSheet=()=>{};ui.renderTut=()=>{};ui.renderActionBar=()=>{};return{ui,sim,floors,boxes,rend};}

await test('1. unit floor identity: F1, F2 and F3 units never share a label (Unit 307 vs Unit 315)',()=>{
  assert.equal(floorName(0),'Floor 1');assert.equal(floorName(1),'Floor 2');assert.equal(floorName(2),'Floor 3');assert.equal(floorName(undefined),'Floor 1');
  const {ui}=fixture(three);const html=num=>{ui.sel=unitNo(num).id;return ui.inspector();};
  assert.equal(unitNo(307).f,1);assert.equal(unitNo(315).f,2);
  assert.match(html(307),/>Floor 2</);assert.doesNotMatch(html(307),/>Floor 3</);assert.match(html(315),/>Floor 3</);assert.doesNotMatch(html(315),/>Floor 2</);
  const f1=three.objs('unit').find(u=>u.access==='interior'&&!u.f);assert.match(html(f1.num),/>Floor 1</);
  ui.sel=unitNo(315).id;assert.match(ui.dockSummary('Unit 315',''),/5x10 · Floor 3/);ui.sel=unitNo(307).id;assert.match(ui.dockSummary('Unit 307',''),/5x10 · Floor 2/);});
await test('1. EXT/F1/Floors highlight follows the rendered view, including direct renderer changes',()=>{
  const {ui,floors,rend}=fixture();for(const [v,on] of [['ext',[1,0,0]],[0,[0,1,0]],[1,[0,0,1]],[2,[0,0,1]]]){rend.view=v;ui.syncFloorUi();assert.deepEqual(floors.map(b=>+b.classList.contains('on')),on,String(v));}
  assert.equal(floors[2].textContent,'F3 ▾');rend.view=0;ui.syncFloorUi();assert.equal(floors[2].textContent,'Floors');assert.equal(floors[1].classList.contains('on'),true);});
await test('1. saved floor restores when valid, otherwise falls back to an existing view',()=>{const {ui}=fixture();assert.equal(ui.validView(2),2);assert.equal(ui.validView(1),1);assert.equal(ui.validView(3),'ext');assert.equal(ui.validView(4),'ext');assert.equal(ui.validView('bogus'),'ext');assert.equal(ui.validView(-1),'ext');
  const {ui:one}=fixture(makeMaple(3));assert.equal(one.validView(1),'ext');assert.equal(one.validView(0),0);});

await test('2. completion reports defined order counts, separately labelled extras, and order-only commissioning',()=>{
  const comp=completions.filter(e=>e.type==='complete');assert.deepEqual(comp.map(e=>[e.label,e.units,e.ready,e.otherReady]),[['Building 12 → F2',14,14,0],['Building 12 → F3',14,14,0]]);
  for(const e of comp)assert.ok(Number.isInteger(e.ready)&&!/undefined/.test(completeText(e)));
  assert.equal(completeText(comp[1]),'Building 12 → F3 finished - 14/14 order units ready to commission');
  assert.equal(completeText({label:'X',units:14,ready:12,otherReady:3,vertical:true}),'X finished - 12/14 order units ready to commission · 3 other ready units elsewhere on the property');
  assert.equal(completeText({label:'Legacy',units:2}),'Legacy finished - 0/2 units ready to commission');
  const s=clone(three),f3=s.s.orders.at(-1).id,extra=s.objs('unit').find(u=>u.f===0&&u.cstate==='operating'&&!u.lease);extra.cstate='ready';extra.order=null;
  const {ui}=fixture(s);ui.sel=s.objs('unit').find(u=>u.order===f3).id;const h=ui.inspector();assert.match(h,/Commission whole order · 14 units/);assert.match(h,/Commission all ready units on property · 15/);
  assert.ok(s.dispatch({type:'commission',order:f3}).ok);assert.equal(extra.cstate,'ready','order commissioning leaves other ready units alone');assert.ok(s.objs('unit').filter(u=>u.order===f3).every(u=>u.cstate==='operating'));});
await test('2. full package arithmetic, single charge and full grace-period refund',()=>{
  assert.deepEqual(charges,[17810,10210]);const two=makeMaple(3);two.s.cash=1e6;const R=two.verticalPlan(SH,{fitout:false});assert.equal(R.cost,12470,'structure-only F2');
  const s=makeMaple(3);s.s.cash=1e6;const P=s.verticalPlan(SH);const cash=s.s.cash;s.dispatch({type:'verticalUpgrade',...P});s.dispatch({type:'verticalUpgrade',...P});assert.equal(s.s.cash,cash-17810);
  const ord=s.s.orders.at(-1);for(let i=0;i<10;i++)s.step();const pre=s.s.cash;assert.ok(s.dispatch({type:'cancelOrder',id:ord.id}).ok);assert.equal(s.s.cash-pre,17810,'full refund within the grace period');
  // Structure-only F3 on a freshly completed F2 building.
  const g=makeMaple(3);g.s.cash=1e6;const p2=g.verticalPlan(SH);g.dispatch({type:'verticalUpgrade',...p2});const o2=g.s.orders.at(-1);for(let i=0;i<60000&&o2.st==='construction';i++){g.step();g.events.length=0;}assert.equal(g.verticalPlan(SH,{fitout:false}).cost,4870,'structure-only F3');assert.equal(g.verticalPlan(SH).cost,10210);});
await test('3. handover topology is held, not reported; a real disconnection still warns after handover',()=>{
  assert.ok(!completions.some(e=>e.type==='access_lost'),'no transient access complaint during F3 handover');
  const s=clone(three);for(const u of s.objs('unit').filter(u=>u.f===2))s.dispatch({type:'commission',unit:u.id});s.ensure();s.events.length=0;
  const u=s.objs('unit').find(u=>u.f===2&&u.cstate==='operating'),fc=s.unitFront(u)[0];s.s.hall[2][s.idx(fc.x,fc.y)]=0;s.markDirty();s.ensure();
  const ev=s.events.filter(e=>e.type==='access_lost');assert.equal(ev.length,1);assert.equal(u.accessHold,undefined);assert.ok(u.blocked);});

// Production save path, as in tthreefloor_save.mjs, with spies on the slots.
function harness(){const main=readFileSync('js/main.js','utf8');const writes=[];const kept={rec:{code:'OLD',meta:{name:'Maple Street Storage',day:40,cash:5000}}};
  const localsave={ok:true,get:()=>({main:null}),getKept:()=>kept.rec,keep:r=>{writes.push(['keep',r.meta.name]);kept.rec=r;return true;}};const archive=[];const savearchive={list:()=>archive,push:r=>{writes.push(['archive',r.meta.name]);archive.unshift(r);return true;},wouldDrop:()=>[],
    // Spy double of savearchive.keep's order (archive the displaced game, then overwrite the kept slot); the real module's sequence is tested over failing storage in tsave_recovery.mjs.
    keep:(cur,keepFn)=>{const old=kept.rec;if(old&&old.code!==cur.code)savearchive.push(old);return {ok:keepFn(cur)};}};
  const context=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave,savearchive,cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);
  const g=context.game;const attached=[];g.ui={title:false};g.rend={view:'ext'};g.attach=function(s,k,o){this.sim=s;attached.push(o&&o.view);};return{g,writes,kept,archive,attached};}
await test('6. import validates fully with no slot writes; a valid import keeps the outgoing game and archives the displaced one',async()=>{
  const {g,writes,archive,attached}=harness();g.sim=clone(three);g.company={props:[{name:'Sandbox Lot',sim:g.sim}],active:0,feed:[]};const running=g.sim;
  for(const bad of ['', 'SST1.@@@', 'SST0.'+btoa('{"W":3}'), '{"company":1,"props":[{"name":"x","s":{}}]}', JSON.stringify({...three.s,floorModelVersion:9})]){const p=await g.prepareLoad(bad);assert.equal(p.ok,false);}
  assert.deepEqual(writes,[]);assert.equal(g.sim,running,'running game untouched by failed parses');
  const incoming=makeMaple(5);incoming.s.cash=4321;const prep=await g.prepareLoad(await (async()=>{const c=g.sim;g.sim=incoming;g.company={props:[{name:'Maple Street Storage',sim:incoming}],active:0,feed:[]};const code=await g.saveCode();g.sim=c;g.company={props:[{name:'Sandbox Lot',sim:c}],active:0,feed:[]};return code;})());
  assert.equal(prep.ok,true);assert.equal(prep.meta.cash,4321);assert.equal(prep.meta.day,1);assert.equal(g.sim,running);assert.deepEqual(writes,[]);
  assert.equal((await g.keepCurrent(null)).ok,true);assert.deepEqual(writes,[['archive','Maple Street Storage'],['keep','Sandbox Lot']],'previous game archived before the outgoing game is kept');
  g.applyLoad(prep);assert.equal(g.sim.s.cash,4321);assert.equal(g.sim.s.speed,0,'imports load paused');assert.equal(archive[0].meta.name,'Maple Street Storage');});
await test('6. legacy Candidate-21 saves (no view field) and expanded saves load; reload after import restores the saved floor',async()=>{
  const {g,attached}=harness();g.sim=clone(three);g.company={props:[{name:'A',sim:g.sim}],active:0,feed:[]};g.rend.view=2;const code=await g.saveCode();assert.match(JSON.stringify(JSON.parse(g.saveJSON())),/"uiView":2/);
  assert.equal(await g.loadCode(code),true);assert.equal(attached.at(-1),2);assert.equal(g.sim.s.uiView,undefined,'view is not left in simulation state');
  const legacy=JSON.stringify(three.s);assert.equal(await g.loadCode(legacy),true);assert.equal(attached.at(-1),undefined);
  const raw='SST0.'+btoa(unescape(encodeURIComponent(legacy)));assert.equal(await g.loadCode(raw),true);
  g.rend.view=1;g.company={props:[{name:'P1',sim:clone(three)},{name:'P2',sim:makeMaple(2)}],active:0,feed:[]};g.sim=g.company.props[0].sim;assert.equal(await g.loadCode(await g.saveCode()),true);assert.equal(attached.at(-1),1);});
await test('6. import confirmation names incoming, running, stored-previous and displaced games',async()=>{
  const {ui,boxes}=fixture();ui.g.localsave.getKept=()=>({code:'K',meta:{name:'Maple Street Storage',day:40,cash:5000}});
  ui.showImportConfirm({meta:{name:'Imported Lot',day:12,cash:777}});const h=boxes.modal.innerHTML;
  for(const re of [/Incoming: <b>Imported Lot<\/b> · Day 12 · \$777/,/Currently running: <b>Current<\/b> · Day 9/,/Stored as your <b>previous game<\/b>: <b>Current<\/b>/,/existing previous game \(<b>Maple Street Storage<\/b> · Day 40 · \$5,000\) moves to <b>Older saved games<\/b>/,/data-a="importYes"/,/data-a="importNo"/])assert.match(h,re);
  let applied=false;ui.g.prepareLoad=async()=>({ok:false});ui.g.applyLoad=()=>{applied=true;};ui.closeModal=()=>{};assert.equal(await ui.importSave('junk','code'),false);assert.equal(applied,false);assert.equal(ui.pendingImport,null);
  const order=[];ui.g.keepCurrent=async()=>{order.push('keep');return true;};ui.g.applyLoad=()=>order.push('apply');ui.g.autosave=()=>{};ui.pendingImport={ok:true,meta:{name:'I',day:1}};await ui.confirmImport();assert.deepEqual(order,['keep','apply']);
  order.length=0;ui.g.keepCurrent=async()=>false;ui.showLoad=()=>{};ui.pendingImport={ok:true,meta:{name:'I',day:1}};await ui.confirmImport();assert.deepEqual(order,[],'nothing loads if the safety copy fails');});

await test('7. switching games clears transient overlay, review and panel state; only the saved view carries over',()=>{
  const {ui,rend}=fixture();rend.setOverlay('security');rend.view=1;ui.verticalReview={shell:1};ui.verticalQuote={f:2};ui.requestPanel=true;ui.sheetTall=true;ui.pendingImport={};
  ui.resetSession(undefined);assert.equal(rend.overlay,null);assert.equal(rend.view,'ext');assert.equal(ui.verticalReview,null);assert.equal(ui.verticalQuote,null);assert.equal(ui.requestPanel,false);assert.equal(ui.sheetTall,false);assert.equal(ui.pendingImport,null);
  rend.setOverlay('carts');ui.resetSession(2);assert.equal(rend.overlay,null);assert.equal(rend.view,2);
  const src=readFileSync('js/main.js','utf8');assert.match(src,/this\.ui\.resetSession\(opts\.view\)/);assert.match(readFileSync('js/showcase.js','utf8'),/game\.attach = \(sim, kind, opts\) => \{[^\n]*origAttach\(sim, kind, opts\)/,'showcase wrapper forwards the saved view');});

await test('4. tutorial step is the first incomplete step; restored lessons never skip an unmet step',()=>{
  const s=makeMaple(3);s.s.tut.on=false;s.s.tut.done=true;s.s.lesson={id:'interior',idMark:s.s.nextId,built:[],flags:{},entered:true};s.s.milestones.first_cart_trip=true;
  const st=stepState(s,{tab:null,sel:null});assert.equal(st.cur,0,'cart lesson starts at its unmet first step');assert.deepEqual(st.done,[false,true,true]);
  s.s.lesson.flags.corralInspected=true;assert.equal(stepState(s,{sel:null}).all,true);
  const m=makeMaple(3);m.s.tut.beat=BEATS.findIndex(b=>b.id==='makeready');const u107=m.objs('unit').find(u=>u.num===107);
  m.s.speed=1;assert.equal(stepState(m,{sel:null}).cur,0,'running clock does not skip "Tap Unit 107"');
  assert.equal(stepState(m,{sel:u107.id}).cur,1);});
await test('4. an already-selected tab or category completes its navigation step',()=>{
  assert.equal(alreadyShowing({sel:'#tabs [data-v="build"]'},{tab:'build',sel:null}),true);assert.equal(alreadyShowing({sel:'#tabs [data-v="build"]'},{tab:'build',sel:5}),false);
  assert.equal(alreadyShowing({sel:'.cats [data-v="units"]'},{tab:'build',cat:'units',sel:null}),true);assert.equal(alreadyShowing({sel:'.cats [data-v="units"]'},{tab:'operate',cat:'units',sel:null}),false);
  const m=makeMaple(3);m.s.tut.beat=BEATS.findIndex(b=>b.id==='expand');assert.equal(stepState(m,{tab:'build',cat:'units',sel:null}).cur,2,'Units already chosen: next action is the Drive-Up card');});
await test('4. clock steps never target an inert 1x: an expanded panel redirects to Back to map, then 1x works',()=>{
  const {ui,sim,boxes}=fixture();const step=BEATS.find(b=>b.id==='makeready').steps[2];
  ui.popupBlocks=new Set(['tutorial']);assert.equal(ui.resolveStep(step),step,'tutorial card pause alone leaves 1x usable');
  ui.popupBlocks=new Set();ui.pauseForPopup('panel');ui.sheetTall=true;boxes.sheet=el();boxes.sheet.firstChild={};const r=ui.resolveStep(step);assert.equal(r.redirect,'back');assert.match(r.t,/Back to map/);assert.match(r.sel,/sheetGrow/);
  ui.onClick({target:{closest:()=>({dataset:{a:'speed',v:'1'}})}});assert.equal(sim.s.speed,0,'1x is inert while the panel holds time');
  ui.sheetTall=false;ui.resumePopup('panel');assert.equal(sim.s.speed,0,'Back to map restores the paused clock it found');assert.equal(ui.resolveStep(step),step,'the step now targets the working 1x');
  ui.onClick({target:{closest:()=>({dataset:{a:'speed',v:'1'}})}});assert.equal(sim.s.speed,1,'1x responds after Back to map');
  ui.popupBlocks=new Set(['modal']);boxes.modal=el();boxes.modal.firstChild={};assert.equal(ui.resolveStep(step).redirect,'modal');});
await test('4. an armed build tool redirects map/commission steps to putting the tool away',()=>{
  const {ui}=fixture();ui.tool='du10x10';const commission=BEATS.find(b=>b.id==='expand').steps.at(-1);const r=ui.resolveStep(commission);assert.equal(r.redirect,'tool');assert.match(r.sel,/cancelTool/);
  const place=BEATS.find(b=>b.id==='expand').steps.find(s=>s.placement);assert.equal(ui.resolveStep(place),place);ui.tool=null;assert.equal(ui.resolveStep(commission),commission);});
await test('4. instructions use current UI terms and navigation',()=>{
  const all=[...BEATS,...LESSONS].flatMap(b=>b.steps||[]);for(const st of all)assert.doesNotMatch(st.d||'',/Scroll (down )?to/i,st.t);
  assert.match(BEATS.find(b=>b.id==='hire').steps[1].d,/section selector/);assert.match(BEATS.find(b=>b.id==='makeready').steps[1].t,/Owner Make-Ready/);assert.doesNotMatch(BEATS.find(b=>b.id==='makeready').steps[1].t,/Start Owner/);
  const ui=readFileSync('js/ui.js','utf8');assert.match(ui,/>Owner Make-Ready · \$\{mh\}h</);assert.match(ui,/\['Overlays', 'Overlays'\]/);
  const css=readFileSync('css/game.css','utf8');assert.doesNotMatch(css,/#ui\.has-sheet #tut, #ui:has\(\.modal-bg\) #tut, #ui:has\(\.actionbar\) #tut \{ display:none; \}/,'instruction no longer disappears behind panels');assert.match(css,/#ui\.has-sheet \.tut:not\(\.offer\):not\(\.scen\)/);assert.match(css,/#guide\.nolabel \.glbl/);});
await test('4. passive watch steps are labelled as watching, not tapping',()=>{const src=readFileSync('js/ui.js','utf8');assert.match(src,/'Watch here'/);});

await test('5. Requests navigation closes the dialog first, keeps time paused and returns predictably',()=>{
  const {ui,sim,boxes}=fixture();sim.s.convos=[{id:1,text:'x',actions:[]}];ui.popupBlocks=new Set(['convo']);ui.renderFeed=()=>{};ui.ownerRequestCards=['<p>x</p>'];ui.showRequests();assert.equal(ui.requestPanel,true);assert.match(boxes.modal.innerHTML,/Your decision/);
  let tab=null;ui.setTab=t=>{tab=t;ui.tab=t;};ui.select=()=>{};const inModal={closest:s=>s==='.modal'?{}:null};
  ui.onClick({target:{closest:()=>({dataset:{a:'requestHelp',id:'1'},...inModal})}});assert.equal(boxes.modal.innerHTML,'');assert.equal(ui.requestPanel,false);assert.equal(tab,'feedback');assert.equal(sim.s.speed,0);assert.ok(!ui.popupBlocks.has('modal'));
  ui.onClick({target:{closest:()=>({dataset:{a:'close'}})}});assert.match(boxes.modal.innerHTML,/Your decision/,'closing Cause & remedy returns to the decision');
  ui.onClick({target:{closest:()=>({dataset:{a:'overlay',v:'security'},...inModal})}});assert.equal(boxes.modal.innerHTML,'');assert.equal(ui.rend.overlay,'security');assert.equal(sim.s.speed,0);});

await test('8/12. review keeps full terms, exact price, preview on map without losing the quote, and demand evidence',()=>{
  const s=makeMaple(3);s.s.cash=1e6;const {ui,boxes,rend}=fixture(s);ui.syncFloorUi=()=>{};ui.spendingHtml=()=>'<p>cash after</p>';ui.select=()=>{};ui.setTab=()=>{};
  ui.showVertical(SH);const h=boxes.modal.innerHTML;for(const re of [/Required/,/Freight elevator access to the new floor is required/,/Options/,/Extend existing stairs/,/optional redundancy/,/Unit mix &amp; demand evidence/,/5x10 standard/,/Complete package \$17,810/,/cash after/,/Cancellation:/,/data-a="verticalPreview"/,/Confirm · \$17,810/,/5x10 standard unit × 14/])assert.match(h,re);
  assert.ok(rend.preview&&rend.preview.proposed,'proposed preview is marked distinct');
  ui.popupBlocks=new Set(['modal']);ui.previewVertical();assert.equal(boxes.modal.innerHTML,'');assert.ok(ui.verticalQuote&&ui.verticalPreviewing);assert.equal(rend.view,1);assert.equal(s.s.speed,0);
  const bar=ui.verticalBarHtml();assert.match(bar,/Proposed F2 · Building 12/);assert.match(bar,/not built, not commissioned/);assert.match(bar,/verticalBack/);assert.match(bar,/verticalConfirm/);assert.match(bar,/verticalCancel/);
  const cash=s.s.cash;ui.onClick({target:{closest:()=>({dataset:{a:'verticalConfirm'}})}});assert.equal(cash-s.s.cash,17810);assert.equal(ui.verticalQuote,null);
  const css=readFileSync('css/game.css','utf8');assert.match(css,/\.vr-opt input\[type=checkbox\] \{ width:26px; height:26px/);assert.match(css,/\.vr-opt \{ display:flex; align-items:center; gap:10px; min-height:48px/);});
await test('12. evidence verdicts follow observed history only',()=>{
  const s=makeMaple(3);const R=s.verticalPlan(SH);s.s.mkt.lostLog=[];assert.equal(expansionEvidence(s,R).verdict,'insufficient');
  s.s.mkt.lostLog=Array.from({length:12},()=>({d:s.day,r:'noReady',sz:'5x10',climate:false}));assert.equal(expansionEvidence(s,R).verdict,'supported');
  s.s.mkt.lostLog=[...Array.from({length:3},()=>({d:s.day,r:'noReady',sz:'5x10',climate:false})),...Array.from({length:9},()=>({d:s.day,r:'noSize',sz:'10x20',climate:false}))];const E=expansionEvidence(s,R);assert.equal(E.verdict,'partial');assert.equal(E.elsewhere[0].product,'10x20 standard');
  for(const u of s.objs('unit').filter(u=>u.size==='5x10'&&u.env==='std').slice(0,5)){u.lease=null;u.commercial='ready';u.cstate='operating';u.blocked=false;}assert.equal(expansionEvidence(s,R).verdict,'unsupported');
  assert.equal(expansionEvidence(s,{...R,unitCreates:[]}).verdict,'structure');const before=JSON.stringify(s.s);expansionEvidence(s,R);assert.equal(JSON.stringify(s.s),before,'evidence is read-only');});

await test('13. destroying a construction order needs a deliberate second tap even for a full refund',()=>{
  const s=makeMaple(3);s.s.cash=1e6;const R=s.verticalPlan(SH);s.dispatch({type:'verticalUpgrade',...R});const ord=s.s.orders.at(-1);const {ui,boxes}=fixture(s);ui.closeModal=()=>{boxes.modal.innerHTML='';};
  const cmd=JSON.stringify({type:'cancelOrder',id:ord.id});ui.onClick({target:{closest:()=>({dataset:{a:'cmd',cmd}})}});assert.equal(ord.st,'construction');assert.match(boxes.modal.innerHTML,/Cancel this construction\?/);for(const re of [/Original package charge<\/span><b class="">\$17,810/,/Exact refund<\/span><b class="good">\$17,810/,/Cancellation penalty<\/span><b class="">\$0/,/full undo within the grace period/,/Cash after cancelling<\/span><b class="">\$1,000,000/])assert.match(boxes.modal.innerHTML,re);assert.match(boxes.modal.innerHTML,/Keep building/);
  ui.onClick({target:{closest:()=>({dataset:{a:'cmd',cmd,confirmed:'1'}})}});assert.equal(ord.st,'cancelled');assert.equal(s.s.cash,1e6);});
await test('13. wage copy matches the Porter wage and does not silently round $12.50',()=>{
  const src=readFileSync('js/ui.js','utf8');assert.doesNotMatch(src,/\$55\/day/);assert.match(src,/Owner \+ porter \(\$\{money\(ROLES\.porter\.wage, true\)\}\/day\)/);assert.equal(ROLES.porter.wage,12.5);
  const s=makeMaple(3);s.dispatch({type:'hire',role:'porter'});const {ui}=fixture(s);ui.tab='operate';ui.hireRoleFocus=null;const h=ui.operateSheet();assert.match(h,/\$12\.50\/day/);assert.doesNotMatch(h,/Porter · [^<]*\$13\/day/);
  assert.match(src,/on-site work \(walking time extra\)/);assert.match(src,/response time ~\$\{h\}h/);});
await test('9. orientation policy: portrait manifest and a pausing rotate prompt for phone-height landscape',()=>{
  assert.equal(JSON.parse(readFileSync('manifest.webmanifest','utf8')).orientation,'portrait');assert.match(readFileSync('index.html','utf8'),/id="rotate"/);assert.match(readFileSync('css/game.css','utf8'),/@media \(orientation: landscape\) and \(max-height: 500px\) \{\n  #rotate \{ display:flex/);
  const {ui,sim}=fixture(makeMaple(3),2);let land=true;globalThis.matchMedia=()=>({matches:land});ui.syncOrientation();assert.equal(sim.s.speed,0);ui.onClick({target:{closest:()=>({dataset:{a:'speed',v:'4'}})}});assert.equal(sim.s.speed,0);land=false;ui.syncOrientation();assert.equal(sim.s.speed,2,'portrait restores the previous speed');delete globalThis.matchMedia;});
await test('10. suite runs without hidden Git history',()=>{for(const f of ['tests/headless/tlayout_hierarchy.mjs','tests/headless/tthreefloor_parity.mjs'])assert.doesNotMatch(readFileSync(f,'utf8'),/execFileSync\('git'|54d432f/);readFileSync('tests/fixtures/render-pre-layout-hierarchy.js');readFileSync('tests/fixtures/candidate19/sim.js');});

// ---- Grok addendum (A-F) ----
await test('A. map rings require the point itself to be the map, never an interface layer or off-screen',()=>{
  const {ui}=fixture();globalThis.innerWidth=393;globalThis.innerHeight=659;let hit={id:'view'};ui.root.ownerDocument={elementFromPoint:()=>hit,querySelectorAll:()=>[]};
  assert.equal(ui.mapPointClear({x:200,y:300}),true);hit={id:'',closest:s=>/#pins/.test(s)?{}:null};assert.equal(ui.mapPointClear({x:200,y:300}),true);
  hit={id:'',closest:()=>null,className:'tabs'};assert.equal(ui.mapPointClear({x:200,y:620}),false,'covered by bottom navigation');assert.equal(ui.mapPointClear({x:200,y:700}),false,'outside viewport');
  const src=readFileSync('js/ui.js','utf8');assert.match(src,/#pins \.pin\[data-k="obj"\]\[data-id="\$\{o\.id\}"\]/,'ring binds to the object pin');assert.match(src,/g\.style\.transition = jump \|\| g\.hidden \? 'none' : ''/);});
await test('B. make-ready action stays in compact and detailed unit views until accepted, then shows status only',()=>{
  const s=makeMaple(3);const u=s.objs('unit').find(u=>u.num===107);if(u.lease)s.endLease(s.s.leases[u.lease],'moveout');assert.ok(s.s.tasks.some(t=>t.type==='makeready'&&t.obj===u.id));const {ui}=fixture(s);ui.sel=u.id;
  for(const tall of [false,true]){ui.sheetTall=tall;const h=ui.inspector(),rail=h.slice(h.indexOf('class="dock-actions"'),h.indexOf('class="body"'));assert.match(rail,/ownerMakeReady/,`action present when ${tall?'detailed':'compact'}`);}
  assert.ok(s.dispatch({type:'ownerMakeReady',unit:u.id,forceOwner:true}).ok);for(const tall of [false,true]){ui.sheetTall=tall;const h=ui.inspector();assert.doesNotMatch(h,/"type":"ownerMakeReady"/,'no stale action');assert.match(h,/Make-ready assigned|Make-ready \d+%/);}
  const p=makeMaple(3);const v=p.objs('unit').find(u=>u.num===107);if(v.lease)p.endLease(p.s.leases[v.lease],'moveout');p.dispatch({type:'hire',role:'porter'});const f=fixture(p).ui;f.sel=v.id;assert.match(f.inspector(),/Queue Porter|ownerMakeReady/,'staff-first route still offered');});
await test('D. floor chooser shows live in-progress state, never "not built yet", never counts it complete',()=>{
  const s=makeMaple(3);s.s.cash=1e6;const R=s.verticalPlan(SH);s.dispatch({type:'verticalUpgrade',...R});const ord=s.s.orders.at(-1);const {ui}=fixture(s);
  let h=ui.floorsHtml();assert.match(h,/Building 12 · 1 completed floor</);assert.match(h,/F2 · 0% · reinforcement/);assert.doesNotMatch(h,/F2 not built yet/);assert.match(h,/Plan next floor · after F2 handover/);assert.doesNotMatch(h,/data-a="verticalReview"/);
  while(ord.vertical.phase<2){s.s.t++;tickVertical(s,ord);}for(let i=0;i<50;i++){s.s.t++;tickVertical(s,ord);}assert.equal(s.objs('shell')[0].floors,2,'structure raised the shell');
  h=ui.floorsHtml();assert.match(h,/1 completed floor</);assert.match(h,new RegExp(`F2 · ${Math.floor(ord.prog*100)}% · fit-out`));assert.doesNotMatch(h,/data-v="1">F2<\/button>/,'not offered as a completed floor');assert.match(h,/under construction/);
  assert.equal(ui.floorState(s.objs('shell')[0]).done,1);assert.equal(s.verticalPlan(SH).ok,false,'another vertical order stays blocked');
  ui.floorsOpen=true;ui.floorsKey=null;const box=ui.$('modal');box.querySelector=q=>q==='.modal.floors'?{}:null;ui.refreshFloors();const first=box.innerHTML;for(let i=0;i<600;i++){s.s.t++;tickVertical(s,ord);}ui.refreshFloors();assert.notEqual(box.innerHTML,first,'chooser updates live without reload');});
await test('E. cancellation is kept apart from navigation and routine actions, with an itemised confirmation',()=>{
  const s=makeMaple(3);s.s.cash=1e6;const R=s.verticalPlan(SH);s.dispatch({type:'verticalUpgrade',...R});const ord=s.s.orders.at(-1);while(ord.vertical.phase<1){s.s.t++;tickVertical(s,ord);}for(let i=0;i<100;i++){s.s.t++;tickVertical(s,ord);}
  const {ui,boxes}=fixture(s);ui.sel=SH;const h=ui.inspector(),rail=h.indexOf('class="dock-actions"')>=0?h.slice(h.indexOf('class="dock-actions"'),h.indexOf('class="body"')):'';
  assert.doesNotMatch(rail,/cancelOrder/,'cancel is not in the routine action rail');assert.match(h,/class="danger-zone"><h3>Cancel construction<\/h3>/);assert.match(h,/Cancel construction… \(refund/);assert.match(h,/Plan next floor · after F2 handover/);
  ui.confirmCancelOrder(ord.id);const m=boxes.modal.innerHTML;for(const re of [/Original package charge<\/span><b class="">\$17,810/,/Completed: Reinforcement \(retained\)<\/span><b class="">\$396/,/Work in progress: Structure/,/Unbuilt work/,/Non-refundable share of unbuilt work \(40%\)/,/Exact refund<\/span><b class="good">\$10,371/,/Non-refundable in total<\/span><b class="">\$7,439/,/Cash after cancelling/,/Paid reinforcement \(396\) is kept with the building; the next F2 quote omits it/,/data-qa="cc-keep"/,/data-qa="cc-confirm"/])assert.match(m,re);
  assert.ok(m.indexOf('cc-keep')<m.indexOf('cc-confirm'),'safe action first');
  const v=readFileSync('js/ui.js','utf8');assert.match(v,/data-qa="vr-close-review">Close review</);assert.match(v,/data-qa="vp-discard">Discard preview</);assert.doesNotMatch(v,/data-a="verticalCancel">Cancel</);});
await test('F. expansion review is accessible: stable labels, automation selectors, Escape, no keyboard bypass of the pause',()=>{
  const s=makeMaple(3);s.s.cash=1e6;const {ui,boxes}=fixture(s);ui.syncFloorUi=()=>{};ui.spendingHtml=()=>'';ui.showVertical(SH);const h=boxes.modal.innerHTML;
  for(const qa of ['vr-close','vr-close-review','vr-preview','vr-confirm','vr-opt-fitout','vr-opt-stairs'])assert.match(h,new RegExp(`data-qa="${qa}"`));
  assert.match(h,/aria-label="Close review"/);assert.match(h,/role="dialog" aria-modal="true" aria-labelledby="vr-title"/);assert.match(h,/Paused while you review/);assert.doesNotMatch(h,/<select/,'no native select needed in the review');
  assert.match(h,/data-vertical-option="stairs"[^>]*disabled/);assert.match(h,/Not available: this building has no stairwell/);assert.match(h,/Confirm · \$17,810/);
  ui.previewVertical();assert.match(ui.verticalBarHtml(),/data-qa="vp-back"[\s\S]*data-qa="vp-confirm"[\s\S]*data-qa="vp-discard"/);
  const main=readFileSync('js/main.js','utf8');assert.match(main,/e\.key === 'Escape' && !ui\.title && ui\.modalOpen\(\)\) \{ ui\.closeModal\(\); return; \}/);assert.match(main,/const runSpeed = \(v\) => ui\.requestSpeed\(v\);/);assert.match(main,/if \(e\.key === ' '\) \{ e\.preventDefault\(\); ui\.spaceKey\(\); \}/);});
console.log(`${n} candidate-22 regression checks passed`);
