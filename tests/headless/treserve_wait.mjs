import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {ReserveWait} from '../../js/reservewait.js';
import {yardChoices,yardQuote} from '../../js/yardloop.js';
import {recovered} from './project-fixture.mjs';
const seed=recovered().s;
function fresh(){const sim=new Sim(structuredClone(seed));sim.s.cash=1100;sim.ensure();return sim;}
function uiFor(sim){const ui=Object.create(UI.prototype);ui.g={sim,acc:0};ui.title=false;ui.toast=()=>{};ui.renderTut=()=>{};ui.sfx=()=>{};ui.renderFeed=()=>{sim.syncRequestHandling();if(sim.s.convos.some(c=>!c.staffHandling))ui.pauseForPopup('convo');};return ui;}
const source=fs.readFileSync('js/main.js','utf8');
const stepSource=source.slice(source.indexOf('function stepTicks(n)'),source.indexOf('let last = performance.now()'));
function harness(sim){const ui=uiFor(sim),stops=[];ui.reserveWait=new ReserveWait((reason,a)=>{ui.notePause(0);ui.g.acc=0;stops.push({reason,t:a.sim.s.t});});const game={sim,ui,syncTier(){},drain(){sim.events.length=0;}};ui.g=game;const tick=vm.runInNewContext(stepSource+';stepTicks',{game});return {ui,wait:ui.reserveWait,stops,tick};}
function arm(sim,h){const q=yardChoices(sim)[0];assert.ok(q&&q.position.available<0);assert.equal(h.wait.start(sim,q).ok,true);return q;}
function fixtureStep(sim,n,fn){const original=sim.step.bind(sim);let i=0;sim.step=()=>{original();if(++i===n)fn();};}
{
 const sim=fresh(),h=harness(sim),before=JSON.stringify(sim.s),q=yardChoices(sim)[0];
 assert.equal(JSON.stringify(sim.s),before,'quotes are save-read-only');arm(sim,h);
 assert.deepEqual(h.wait.active.args,q.args);assert.equal(sim.s.speed,4);
 // Recommendation ranking changes must not replace the tracked footprint.
 sim.s.mkt.lostLog.push(...Array.from({length:30},()=>({d:sim.day,r:'noSize',sz:'10x10',climate:false})));
 assert.ok(yardChoices(sim)[0].size!=='5x10');h.tick(1);assert.deepEqual(h.wait.active.args,q.args);
 assert.equal(h.wait.active.quote.position.available,yardQuote(sim,q.args).position.available);
 h.wait.stop('done');assert.equal(sim.s.speed,0);assert.equal(new ReserveWait().active,null);
 console.log('PASS stable build specification, live quote and ranking independence; no save metadata');
}
{
 const sim=fresh(),baseline=new Sim(structuredClone(sim.s)),h=harness(sim),q=arm(sim,h);baseline.s.speed=4;
 const fund=s=>s.money(-yardQuote(s,q.args).position.available+1,'other','Parity fixture receipt');
 fixtureStep(sim,7,()=>fund(sim));let n=0;fixtureStep(baseline,7,()=>fund(baseline));
 h.tick(240);assert.equal(sim.s.t,seed.t+7,'stops between minutes inside a 240-minute batch');assert.equal(sim.s.speed,0);assert.match(h.stops[0].reason,/Reserve covered/);
 for(;n<7;n++){baseline.step();baseline.syncRequestHandling();baseline.events.length=0;}
 baseline.s.speed=0;assert.deepEqual(sim.s,baseline.s,'entire state parity including money, RNG, leases, pricing, goals and tasks');
 assert.ok(!sim.s.orders.some(o=>o.created>=seed.t));
 console.log('PASS actual production batch stops at first funded minute; full ordinary simulation parity; no automatic purchase');
}
for(const [event,label] of [[{type:'moveout'},'operating'],[{type:'access_lost'},'operating'],[{type:'power_shed'},'operating'],[{type:'fault',sev:'critical'},'Critical']]){
 const sim=fresh(),h=harness(sim);arm(sim,h);fixtureStep(sim,3,()=>sim.events.push(event));h.tick(240);assert.equal(sim.s.t,seed.t+3);assert.equal(sim.s.speed,0);assert.match(h.stops[0].reason,new RegExp(label));
}
{
 const sim=fresh(),h=harness(sim);arm(sim,h);fixtureStep(sim,3,()=>{sim.s.cash=-1;});h.tick(240);assert.equal(sim.s.t,seed.t+3);assert.match(h.stops[0].reason,/obligations/);
}
{
 const sim=fresh(),h=harness(sim);arm(sim,h);fixtureStep(sim,3,()=>sim.s.convos.push({id:999,text:'Owner decision',actions:[]}));h.tick(240);assert.equal(sim.s.t,seed.t+3);h.ui.resumePopup('convo');assert.equal(sim.s.speed,0,'dismissing interruption cannot resume wait');
}
{
 const sim=fresh(),h=harness(sim);arm(sim,h);fixtureStep(sim,3,()=>sim.s.tasks.push({id:999,need:'repair_simple',obj:sim.objs('gate')[0].id,total:1,created:sim.s.t}));h.tick(240);assert.equal(sim.s.t,seed.t+3);assert.match(h.stops[0].reason,/Uncovered/);
}
{
 const sim=fresh();sim.s.t+=14*60;assert.equal(sim.dispatch({type:'hire',role:'porter'}).ok,true);
 const task={id:999,need:'clean',obj:sim.objs('unit')[0].id,total:1,created:sim.s.t};sim.s.tasks.push(task);
 assert.equal(sim.taskDelegation(task).status,'offshift');const h=harness(sim);arm(sim,h);
 // Real employed Porter coverage waits for the next shift; a reserve warning is expected.
 fixtureStep(sim,2,()=>sim.events.push({type:'cash_warn',msg:'Below recommended reserve'}));const start=sim.s.t;h.tick(4);assert.ok(h.wait.active);assert.equal(sim.s.t,start+4);h.wait.stop('done');
}
for(const change of ['demand','quote','geometry']){
 const sim=fresh(),h=harness(sim),q=arm(sim,h);
 fixtureStep(sim,2,()=>{if(change==='demand')sim.s.mkt.lostLog=[];if(change==='geometry'){sim.s.ground[sim.idx(q.args.a.x,q.args.a.y)]=1;sim.markDirty();}if(change==='quote'){const plan=sim.plan.bind(sim);sim.plan=a=>{const p=plan(a);p.cost++;return p;};}});
 h.tick(240);assert.equal(sim.s.t,seed.t+2,change);assert.equal(sim.s.speed,0);
}
{
 const sim=fresh(),h=harness(sim);arm(sim,h);h.wait.active.started=sim.s.t-7*1440+1;h.tick(240);assert.equal(sim.s.t,seed.t+1);assert.match(h.stops[0].reason,/Seven-day/);assert.equal(sim.s.speed,0);
}
for(const v of [0,1,2,4]){const sim=fresh(),h=harness(sim);arm(sim,h);h.ui.requestSpeed(v);assert.equal(h.wait.active,null);assert.equal(sim.s.speed,v);}
for(const kind of ['panel','modal','review','convo','rotate','celebrate']){const sim=fresh(),h=harness(sim);arm(sim,h);h.ui.pauseForPopup(kind);h.ui.resumePopup(kind);assert.equal(h.wait.active,null);assert.equal(sim.s.speed,0);}
{const sim=fresh(),h=harness(sim);arm(sim,h);h.ui.spaceKey();assert.equal(sim.s.speed,0);assert.equal(h.wait.active,null);}
// Execute the actual visibility handler: its ordinary foreground resume must capture zero after cancellation.
{
 const sim=fresh(),h=harness(sim);arm(sim,h);const document={hidden:true};const game=h.ui.g;game.audio={setBackground(){}};game.autosave=()=>{};h.ui.update=()=>{};
 const body=source.slice(source.indexOf("document.addEventListener('visibilitychange', () => {")+"document.addEventListener('visibilitychange', () => {".length,source.indexOf('// iOS can drop')).replace(/\}\);\s*$/,'');
 const context=vm.createContext({game,document,cancelMapTap(){},cancelBuildHold(){},ptrs:new Set(),drag:null,pinch:null,last:0,performance:{now:()=>0},diagnostics:{reset(){}},diagnosticMode:null});
 vm.runInContext(body,context);assert.equal(game.wasSpeed,0);document.hidden=false;vm.runInContext(body,context);assert.equal(sim.s.speed,0);assert.equal(h.wait.active,null);
}
console.log('PASS actionable interruptions, delegated work, quote/demand/placement invalidation, seven-day boundary, explicit speeds, nested pauses and actual background/foreground handler');
// Actual UI arming closes only its proposal panel, retains the chosen footprint and never buys.
{
 const sim=fresh(),ui=uiFor(sim);ui.cmdBtn=()=>'';ui.root={querySelectorAll:()=>[]};ui.g.rend={setSelection(){}};
 ui.renderSheet=()=>{if(ui.tab)ui.pauseForPopup('panel');else ui.resumePopup('panel');};ui.tab='growth';ui.sheetTall=true;ui.renderSheet();
 const html=ui.yardLoopHtml(),key=[...ui.reserveOffers.keys()][0];assert.ok(html.includes('data-a="reserveStart"'));
 const before=sim.s.cash,orders=sim.s.orders.length;assert.equal(ui.startReserveWait(key),true);assert.equal(sim.s.speed,4);assert.equal(ui.popupBlocks.size,0);assert.equal(sim.s.cash,before);
 const args=structuredClone(ui.reserveWait.active.args);sim.money(-yardQuote(sim,args).position.available+1,'other','Fixture funding');ui.reserveWait.check(sim);
 assert.equal(sim.s.speed,0);assert.deepEqual(ui.reserveResult,args);assert.match(ui.reserveNotice,/Reserve covered/);
 assert.equal(sim.s.orders.length,orders);
 // Reload/session reset has no durable controller state. Existing external blocker is respected.
 const other=fresh(),u=uiFor(other);u.reserveOffers=ui.reserveOffers;u.setTab=()=>{};u.select=()=>{};u.pauseForPopup('modal');assert.equal(u.startReserveWait(key),false);assert.equal(other.s.speed,0);
}
{
 const sim=fresh(),h=harness(sim),q=yardChoices(sim)[0];sim.s.cash=100000;
 const before=sim.s.cash;assert.equal(h.wait.start(sim,q).ready,true);assert.equal(h.wait.active,null);assert.equal(sim.s.speed,0);assert.equal(sim.s.cash,before);
 sim.s.cash=1100;const stale=structuredClone(q);stale.plan.cost++;assert.equal(h.wait.start(sim,stale).ok,false);assert.equal(sim.s.speed,0);
}
for(const event of ['blur','pagehide']){
 const sim=fresh(),h=harness(sim);arm(sim,h);h.ui.g.audio={setBackground(){}};h.ui.g.autosave=()=>{};
 const line=source.split('\n').find(l=>l.startsWith(`window.addEventListener('${event}'`));let handler;
 vm.runInNewContext(line,{window:{addEventListener:(type,fn)=>handler=fn},game:h.ui.g,document:{hidden:false}});handler();assert.equal(h.wait.active,null);assert.equal(sim.s.speed,0);
}
console.log('PASS production UI arming, exact-target completion preview, already-funded/stale offers, blockers, blur and pagehide');
{
 const sim=fresh();sim.s.t+=10*60;assert.equal(sim.dispatch({type:'hire',role:'manager'}).ok,true);
 const h=harness(sim);arm(sim,h);const start=sim.s.t;
 fixtureStep(sim,1,()=>sim.convo({key:'wait-staff',who:'Routine request',text:'Noted',auto:0,ttl:120,def:0,actions:[{label:'Noted',action:{type:'cv',op:'noted'}}]}));
 h.tick(2);assert.equal(sim.s.t,start+2);assert.ok(h.wait.active,'real Manager-classified request does not cancel reserve waiting');assert.equal(sim.s.convos[0].staffHandling,'Manager');
 sim.dispatch({type:'fire',id:sim.s.staff.find(s=>s.role==='manager').id});h.tick(240);assert.equal(sim.s.t,start+2,'coverage loss interrupts before another minute');assert.equal(sim.s.speed,0);h.ui.resumePopup('convo');assert.equal(sim.s.speed,0);
}
{
 const sim=fresh(),h=harness(sim);arm(sim,h);const other=fresh();other.s.speed=2;
 const switchSource=source.slice(source.indexOf('  switchProperty(k) {'),source.indexOf('  tierInfo()')).trim().replace(/,$/,'');
 const swap=vm.runInNewContext('({'+switchSource+'})');swap.company={active:0,props:[{sim},{sim:other}]};swap.sim=sim;swap.ui=h.ui;swap.attach=s=>{swap.sim=s;};swap.switchProperty(1);
 assert.equal(h.wait.active,null);assert.equal(sim.s.speed,0);assert.equal(other.s.speed,0,'new property cannot inherit armed 4x');
}
console.log('PASS real staff-classified request continues; loss of coverage pauses before next minute; production property switch cancels before speed transfer');
{
 const sim=fresh(),base=new Sim(structuredClone(sim.s)),h=harness(sim),start=sim.s.t;arm(sim,h);base.s.speed=4;
 while(h.wait.active){
   h.tick(240);
   while(base.s.t<sim.s.t){base.syncRequestHandling();base.step();base.syncRequestHandling();base.events.length=0;}
   base.s.speed=sim.s.speed;assert.deepEqual(sim.s,base.s,'natural wait and ordinary play remain identical at the same clock minute');
 }
 assert.ok(sim.s.t>start);assert.ok(sim.s.t-start<=7*1440);assert.equal(sim.s.speed,0);
 console.log('PASS natural reserve-wait / ordinary-play full-state parity',JSON.stringify({minutes:sim.s.t-start,reason:h.stops[0].reason,cash:sim.s.cash}));
}

// Permanent coverage blockers must not be hidden by the staffing UI's temporary status.
function coverageFixture(hour, need='clean') {
 const sim=fresh();sim.s.t=Math.floor(sim.s.t/1440)*1440+hour*60;
 assert.equal(sim.dispatch({type:'hire',role:'porter'}).ok,true);
 const porter=sim.s.staff.find(st=>st.role==='porter');
 const task=need==='carts'
   ?sim.addTask({type:'carts',need,cart:sim.s.carts[0].id,obj:'cart'+sim.s.carts[0].id,label:'Recover cart',work:20,phase:1})
   :sim.addTask({type:'clean',need,f:0,x:10,y:10,label:'Clean loading area',work:20});
 assert.ok(task);return {sim,porter,task};
}
for(const hour of [7,21])for(const blocker of ['policy','staff','agent','office']){
 const {sim,porter,task}=coverageFixture(hour,blocker==='policy'?'carts':'clean');
 if(blocker==='policy')assert.equal(sim.dispatch({type:'policy',key:'porterCarts',v:false}).ok,true);
 if(blocker==='staff')assert.equal(sim.dispatch({type:'fire',id:porter.id}).ok,true);
 if(blocker==='agent')sim.s.agents=sim.s.agents.filter(a=>a.sid!==porter.id);
 if(blocker==='office'){for(const o of sim.objs('office'))o.cstate='ready';sim.markDirty();sim.ensure();}
 const h=harness(sim),before=structuredClone(sim.s),q=yardChoices(sim)[0];assert.ok(q?.position.available<0);
 const result=h.wait.start(sim,q);assert.equal(result.ok,false,`${blocker} at ${hour}:00`);
 assert.equal(!!h.wait.active,false);assert.equal(sim.s.speed,0);assert.match(h.stops[0].reason,/Uncovered/);
 assert.deepEqual(sim.s,before,'refused wait does not change simulation, pricing, goals or saves');
 if(hour===21&&blocker!=='staff')assert.equal(sim.taskDelegation(task).status,'offshift','regression exercises the formerly masking status');
}
for(const blocker of ['policy','agent','office']){
 const {sim,porter}=coverageFixture(21),h=harness(sim);arm(sim,h);const start=sim.s.t;
 fixtureStep(sim,2,()=>{
   if(blocker==='policy'){
     sim.dispatch({type:'policy',key:'porterCarts',v:false});
     sim.addTask({type:'carts',need:'carts',cart:sim.s.carts[0].id,obj:'cart'+sim.s.carts[0].id,label:'Recover cart',work:20,phase:1});
   }
   if(blocker==='agent')sim.s.agents=sim.s.agents.filter(a=>a.sid!==porter.id);
   if(blocker==='office'){for(const o of sim.objs('office'))o.cstate='ready';sim.markDirty();}
 });
 h.tick(240);assert.equal(sim.s.t,start+2,blocker+' stops within the same batch');
 assert.equal(!!h.wait.active,false);assert.equal(sim.s.speed,0);
 h.ui.pauseForPopup('modal');h.ui.resumePopup('modal');assert.equal(sim.s.speed,0,'closing follow-up review stays paused');
}
for(const status of ['offshift','capacity','busy']){
 const {sim,porter,task}=coverageFixture(status==='offshift'?21:10);
 if(status==='capacity'){porter.workDay=sim.day;porter.workUsed=sim.workCapacity(porter);}
 if(status==='busy')sim.s.agents.find(a=>a.sid===porter.id).st='walk';
 assert.equal(sim.taskDelegation(task).status,status);
 const h=harness(sim),before=structuredClone(sim.s);arm(sim,h);h.wait.check(sim);
 assert.ok(h.wait.active,status+' is a temporary delay with operating coverage');
 h.wait.stop('Test finished');assert.equal(sim.s.speed,0);assert.deepEqual(sim.s,before,'coverage checks do not book work, spend or mutate saved state');
}
{
 const {sim,porter,task}=coverageFixture(10);porter.workDay=sim.day;porter.workUsed=sim.workCapacity(porter);
 for(const o of sim.objs('office'))o.cstate='ready';sim.markDirty();sim.ensure();
 assert.equal(sim.taskDelegation(task).status,'capacity');const h=harness(sim),q=yardChoices(sim)[0];
 assert.equal(h.wait.start(sim,q).ok,false,'an exhausted daily budget cannot hide missing operating office coverage');
 assert.equal(sim.s.speed,0);assert.equal(!!h.wait.active,false);
}
console.log('PASS policy/agent/operating-office blockers at start and mid-batch; real offshift/capacity/busy coverage continues; refused waits and follow-up pauses preserve state');
