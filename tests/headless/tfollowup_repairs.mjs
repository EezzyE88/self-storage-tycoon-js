// Candidate 22 follow-up repairs 2 and 3 (repair 1, save recovery, is tsave_recovery.mjs).
// 2: an elevator committed while its hallways are only ordered must not complete the lesson step; the step waits for
//    finished hallways with a live route to time controls and never resumes time itself.
// 3: information-only ledger rows must not move the legacy finance migration's history-completeness boundary.
import assert from 'node:assert/strict';
globalThis.window={localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
const {UI}=await import('../../js/ui.js');
const {stepState}=await import('../../js/tutorial.js');
const {makeMaple}=await import('../../js/maple.js');
const {Sim,dayOf}=await import('../../js/sim.js');
const {MIN_PER_DAY}=await import('../../js/data.js');
const {verticalLayout,verticalDone,shaftHallState,verticalCheck}=await import('../../js/blueprint.js');
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
function el(){const c=new Set();return{dataset:{},innerHTML:'',textContent:'',hidden:false,firstChild:null,classList:{toggle:(k,on)=>on?c.add(k):c.delete(k),contains:k=>c.has(k),add:k=>c.add(k),remove:k=>c.delete(k)},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[]};}
function uiFor(sim){const ui=Object.create(UI.prototype),boxes={};
  ui.g={sim,audio:{unlock(){},play(){}},rend:{view:'ext',overlay:null,setView(v){this.view=v;},setOverlay(k){this.overlay=k;},setPreview(){},setSelection(){},setFocus(){},lookAt(){},rotate(){},pan(){},previewG:{children:[]}},localsave:{ok:true,getKept:()=>null,get:()=>({})},savearchive:{list:()=>[],wouldDrop:()=>[]}};
  ui.title=false;ui.sfx=()=>{};ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.$=id=>boxes[id]||(boxes[id]=el());ui.root={querySelectorAll:()=>[],querySelector:()=>null,classList:el().classList};
  ui.renderTut=()=>{};ui.renderFeed=()=>{};ui.syncFloorUi=()=>{};return ui;}
function upLesson(){const s=makeMaple(20260929);s.s.tut={on:false,done:true,flags:{}};s.s.lesson={id:'up',idMark:s.s.nextId,built:[],flags:{},entered:true};s.s.cash=1e6;s.s.open=false;return s;}
const build=(s,k)=>{const r=s.dispatch({type:'build',...verticalLayout(s).plans[k]});assert.ok(r.ok,k+': '+r.msg);return r;};
const settle=s=>{for(let i=0;i<20000&&s.s.orders.some(o=>o.st==='construction');i++){s.s.t++;s.step();s.events.length=0;}};
const current=s=>{const st=stepState(s,{});return st.b.steps[st.cur];};
// Aisle and shell built; F1/F2 hallways, entrance and loading only ordered.
function ordered(){const s=upLesson();build(s,'aisle');build(s,'shell2');settle(s);for(const k of ['hall','doorWide','loading','hall2'])build(s,k);assert.deepEqual(shaftHallState(s),['ordered','ordered']);return s;}

await test('2. early elevator commitment is still allowed and charged once, but does not complete the elevator step',()=>{
  const s=ordered();assert.equal(s.plan(verticalLayout(s).plans.elevator).status,'incomplete','quote reports incomplete, as before');
  assert.equal(current(s).blueprint,'elevator');const cash=s.s.cash;const r=build(s,'elevator');assert.match(r.msg,/Elevator committed/);assert.equal(cash-s.s.cash,9500,'elevator price unchanged');
  assert.equal(verticalDone(s,'elevator'),false,'ordered hallways are not finished hallways');assert.equal(current(s).blueprint,'elevator','lesson stays on the elevator step');
  assert.match(verticalCheck(s),/Next: Elevator beside both halls/);});

await test('2. after commitment the step waits with a usable route to time controls and never resumes a manual Pause',()=>{
  const s=ordered();build(s,'elevator');s.s.speed=0;const ui=uiFor(s);ui.speedBefore=undefined;const step=current(s);
  let r=ui.resolveStep(step);assert.equal(r.redirect,'wait');assert.match(r.t,/Elevator committed: let the F1 hallway finish/);assert.match(r.d,/ordered but still under construction/);assert.equal(r.sel,'#speed [data-v="4"]');assert.equal(s.s.speed,0,'guidance never resumes time');
  ui.pauseForPopup('panel');ui.sheetTall=true;ui.$('sheet').firstChild={};r=ui.resolveStep(step);assert.equal(r.redirect,'back','expanded panel: Back to map first');ui.sheetTall=false;ui.resumePopup('panel');assert.equal(s.s.speed,0,'manual Pause survives panel closure');
  ui.tool='hall';ui.pauseForPopup('review');r=ui.resolveStep(step);assert.equal(r.redirect,'tool','placement review: Stop building first');ui.tool=null;ui.resumePopup('review');
  ui.pauseForPopup('convo');r=ui.resolveStep(step);assert.equal(r.redirect,'requests');ui.resumePopup('convo');assert.equal(s.s.speed,0);
  // The player runs time; once both hallways are finished the step completes and the lesson moves on.
  s.s.speed=4;for(let i=0;i<20000&&shaftHallState(s).some(x=>x!=='built');i++){s.s.t++;s.step();s.events.length=0;}
  assert.deepEqual(shaftHallState(s),['built','built']);assert.equal(verticalDone(s,'elevator'),true);assert.equal(current(s).t,'Light both hallways');
  settle(s);assert.equal(s.objs('elevator')[0].cstate,'operating','the early-committed elevator works once its hallways finish');});

await test('2. one hallway finished, the other ordered: still waiting, naming the unfinished floor',()=>{
  const s=ordered();build(s,'elevator');const l=verticalLayout(s),e=s.objs('elevator').find(o=>o.x>=l.sh.x&&o.x<l.sh.x+l.sh.w);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const i=s.idx(e.x+dx,e.y+dy);if(s.s.hall[0][i]===2)s.s.hall[0][i]=1;}
  assert.deepEqual(shaftHallState(s),['built','ordered']);assert.equal(verticalDone(s,'elevator'),false);
  const r=uiFor(s).resolveStep(current(s));assert.equal(r.redirect,'wait');assert.match(r.t,/let the F2 hallway finish/);});

await test('2. committed elevator with no hallway beside it on a floor: build that hallway, not wait',()=>{
  const s=ordered();build(s,'elevator');const e=s.objs('elevator').at(-1);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])s.s.hall[1][s.idx(e.x+dx,e.y+dy)]=0;
  assert.equal(current(s).blueprint,'hall2','the incomplete F2 hallway step comes first again');const elevStep=stepState(s,{}).b.steps.find(x=>x.blueprint==='elevator');
  const r=uiFor(s).resolveStep(elevStep);assert.equal(r.redirect,'prereq');assert.match(r.t,/Build the F2 hallway beside the elevator/);assert.equal(verticalDone(s,'elevator'),false);});

await test('2. the usual order (hallways finished first, then the elevator) completes the step as before',()=>{
  const s=ordered();settle(s);assert.deepEqual(shaftHallState(s),['built','built']);assert.equal(current(s).blueprint,'elevator');assert.equal(uiFor(s).resolveStep(current(s)).redirect,undefined,'place the elevator');
  build(s,'elevator');assert.equal(verticalDone(s,'elevator'),true);assert.equal(current(s).t,'Light both hallways');});

// ---------- 3. legacy finance migration and information-only rows
const base=makeMaple(3),D=MIN_PER_DAY;
function migrate(rows){const st=JSON.parse(JSON.stringify(base.s));delete st.finance;st.t=10*D;st.ledger=rows;const m=new Sim(st);const f=m.s.finance;
  return {from:f.cashCompleteFrom,net:Math.round(f.cashDays.reduce((a,d)=>a+d.incoming-d.outgoing,0)*100)/100,info:f.cashDays.some(d=>'info' in d.categories),complete:f.cashDays.filter(d=>d.complete).map(d=>d.day)};}
const cash=k=>Array.from({length:k},(_,i)=>({t:2*D+i*7,amt:10,cat:'rent'}));
const info=t=>({t,amt:0,cat:'info',info:true,note:'Information only'});
await test('3. 249 cash rows stay complete from day 1 with a leading or trailing information row',()=>{
  const plain=migrate(cash(249));assert.equal(plain.from,1);
  for(const rows of [[info(0),...cash(249)],[...cash(249),info(9*D)],[info(0),...cash(249),info(9*D)]]){const m=migrate(rows);assert.equal(m.from,1,'info rows do not trigger truncation');assert.equal(m.net,plain.net);assert.equal(m.info,false,'no info cash category');assert.deepEqual(m.complete,plain.complete);}});
await test('3. 250 cash rows keep the established truncated-history boundary, with or without information rows',()=>{
  const plain=migrate(cash(250));assert.equal(plain.from,4,'genuinely truncated: complete from the day after the first cash row');
  for(const rows of [[info(0),...cash(250)],[...cash(250),info(9*D)],[info(1*D),...cash(250)]]){const m=migrate(rows);assert.equal(m.from,4,'first CASH row decides, not a preceding info row');assert.equal(m.net,plain.net);}});
await test('3. a ledger with no information rows migrates exactly as before (genuine legacy saves)',()=>{
  // The pre-repair rule, applied to ledgers without info rows: truncated at 250+ rows, complete from the day after the first.
  for(const k of [0,1,120,249,250,400]){const rows=cash(k),m=migrate(rows);assert.equal(m.from,k>=250?dayOf(rows[0].t)+1:1,`${k} rows`);assert.equal(m.net,k*10);}
  // Mixed signs and categories, as an old save would carry.
  const rows=[...cash(260)];rows[5]={t:rows[5].t,amt:-42.5,cat:'payroll'};assert.equal(migrate(rows).net,259*10-42.5);});

console.log(n+' follow-up repair checks passed');
