import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {ReserveWait} from '../../js/reservewait.js';
import {yardChoices,yardQuote} from '../../js/yardloop.js';
import {recovered} from './project-fixture.mjs';

const seed=recovered({settleDecisions:true}).s;
const fresh=()=>{const sim=new Sim(structuredClone(seed));sim.s.cash=1100;sim.ensure();return sim;};
const main=fs.readFileSync('js/main.js','utf8');
const batch=main.slice(main.indexOf('function stepTicks(n)'),main.indexOf('let last = performance.now()'));
function fixture(sim=fresh()){
 const ui=Object.create(UI.prototype),boxes={},stops=[];
 const game={sim,ui,acc:0,rend:{setFocus(){},setSelection(){}},syncTier(){},drain(){sim.events.length=0;},audio:{unlock(){}}};
 ui.g=game;ui.title=false;ui.scMin=true;ui.toast=()=>{};ui.sfx=()=>{};ui.renderTut=()=>{};
 ui.$=k=>boxes[k]||=( {innerHTML:'',firstChild:null,querySelector:()=>null} );
 ui.spendingHtml=()=>'';ui.cmdBtn=()=>'';ui.root={querySelectorAll:()=>[]};
 ui.renderSheet=()=>{if(ui.tab)ui.pauseForPopup('panel');else ui.resumePopup('panel');};
 ui.renderFeed=()=>{sim.syncRequestHandling();if(sim.s.convos.some(c=>!c.staffHandling))ui.pauseForPopup('convo');else ui.resumePopup('convo');};
 const wait=ui.reserveWait=new ReserveWait((reason,a)=>{ui.notePause(0);game.acc=0;stops.push({reason,t:sim.s.t,retained:!!wait.pending});});
 const tick=vm.runInNewContext(batch+';stepTicks',{game});
 const quote=yardChoices(sim)[0];assert.ok(quote?.position.available<0);
 assert.equal(wait.start(sim,quote).ok,true);
 return {sim,ui,wait,tick,quote,boxes,stops};
}
function show(f){UI.prototype.renderComeback.call(f.ui,true);return f.boxes.tut.innerHTML;}

{
 const f=fixture(),original=f.wait.active,started=original.started;
 f.tick(3);
 // Real UI navigation suspends the same intent. Further navigation/inspection does not erase it.
 f.ui.setTab('operate',true);assert.equal(f.sim.s.speed,0);assert.equal(f.wait.active,null);assert.equal(f.wait.pending,original);
 f.ui.select(null);f.ui.setTab(null);assert.equal(f.sim.s.speed,0);assert.equal(f.wait.pending,original);
 const before=structuredClone(f.sim.s),html=show(f);
 assert.ok(html.includes('data-a="reserveResume"'));assert.ok(html.includes('Resume waiting'));
 assert.ok(html.includes('Original limit: Day '));
 assert.ok(html.includes('data-a="reserveStop"'));assert.ok(html.includes('End wait'));
 assert.deepEqual(f.sim.s,before,'rendering a retained wait is read-only');
 f.ui.onClick({target:{closest:()=>({dataset:{a:'reserveResume'}})}});assert.equal(f.sim.s.speed,4);assert.equal(f.wait.active,original);
 assert.equal(f.wait.active.started,started);assert.deepEqual(f.wait.active.args,f.quote.args);
 f.tick(2);f.ui.pauseForPopup('celebrate');f.ui.resumePopup('celebrate');
 assert.equal(f.sim.s.speed,0);assert.equal(f.wait.pending,original);
 assert.equal(f.ui.resumeReserveWait(),true);assert.equal(f.wait.active.started,started);
 console.log('PASS actual navigation, inspection and nested review retain the exact target; one-tap UI Resume uses the original start time');
}
{
 const f=fixture(),start=f.sim.s.t,original=f.wait.active,step=f.sim.step.bind(f.sim);let n=0;
 f.sim.step=()=>{step();if(++n===2)f.sim.convo({key:'wait-owner',text:'Owner decision',actions:[{label:'Noted'}]});};
 f.tick(240);assert.equal(f.sim.s.t,start+2);assert.equal(f.sim.s.speed,0);assert.equal(f.wait.pending,original);
 const blocked=f.ui.resumeReserveWait();assert.equal(blocked,false);assert.equal(f.sim.s.speed,0);
 assert.equal(f.sim.dispatch({type:'convo',id:f.sim.s.convos[0].id,i:0}).ok,true);
 f.ui.renderFeed();assert.equal(f.sim.s.speed,0,'answer and dismissal never resume automatically');
 assert.equal(f.ui.resumeReserveWait(),true);assert.equal(f.wait.active,original);
 console.log('PASS new owner decision suspends within the production batch; blocked Resume is inert; resolving it allows explicit Resume');
}
for(const event of ['visibilitychange','blur','pagehide']){
 const f=fixture(),document={hidden:true},game=f.ui.g;game.audio.setBackground=()=>{};game.autosave=()=>{};f.ui.update=()=>{};
 if(event==='visibilitychange'){
   const body=main.slice(main.indexOf("document.addEventListener('visibilitychange', () => {")+"document.addEventListener('visibilitychange', () => {".length,main.indexOf('// iOS can drop')).replace(/\}\);\s*$/,'');
   const ctx=vm.createContext({game,document,cancelMapTap(){},cancelBuildHold(){},ptrs:new Set(),drag:null,pinch:null,last:0,performance:{now:()=>0},diagnostics:{reset(){}},diagnosticMode:null});
   vm.runInContext(body,ctx);document.hidden=false;vm.runInContext(body,ctx);
 }else{
   let handler;vm.runInNewContext(main.split('\n').find(l=>l.startsWith(`window.addEventListener('${event}'`)),{window:{addEventListener:(type,fn)=>handler=fn},game,document});handler();
 }
 assert.equal(game.sim.s.speed,0);assert.equal(f.wait.active,null);assert.ok(f.wait.pending);
 const start=f.wait.pending.started;assert.equal(f.ui.resumeReserveWait(),true);assert.equal(f.wait.active.started,start);
}
for(const manual of ['stop','space',0,1,2,4]){
 const f=fixture();f.wait.interrupt('Review');
 if(manual==='stop')f.ui.onClick({target:{closest:()=>({dataset:{a:'reserveStop'}})}});else if(manual==='space')f.ui.spaceKey();else f.ui.requestSpeed(manual);
 assert.equal(f.wait.active,null);assert.equal(f.wait.pending,null);assert.equal(f.sim.s.speed,typeof manual==='number'?manual:0);
 assert.equal(f.wait.resume(f.sim).ok,false,'manual cancellation has no resumable intent');
}
{
 const f=fixture();f.ui.pauseForPopup('convo');f.ui.requestPanel=true;f.ui.requestSettings=false;f.ui.renderRequestPanel=()=>{};
 f.ui.onClick({target:{closest:()=>({dataset:{a:'requestPause'}})}});
 assert.equal(f.wait.pending,null,'Keep paused after answering is an explicit manual Pause');
 f.ui.resumePopup('convo');assert.equal(f.sim.s.speed,0);assert.equal(f.ui.resumeReserveWait(),false);
}
{
 const f=fixture(),a=f.wait.active;a.started=f.sim.s.t-7*1440+3;
 f.tick(1);f.wait.interrupt('Review');assert.equal(f.wait.start(f.sim,f.quote).ok,true,'same card resumes rather than restarting the deadline');
 assert.equal(f.wait.active.started,a.started);f.tick(240);
 assert.equal(f.sim.s.t-a.started,7*1440);assert.equal(f.sim.s.speed,0);assert.equal(f.wait.pending,null);assert.equal(f.wait.active,null);
 const g=fixture();g.wait.active.started=g.sim.s.t-7*1440+1;g.wait.interrupt('Review');g.sim.s.t++;
 assert.equal(g.wait.resume(g.sim).ok,false);assert.equal(g.sim.s.speed,0);assert.match(g.wait.review(g.sim).reason,/Original seven-day/);
 console.log('PASS explicit speeds, Stop/Pause, background/foreground and the original seven-day deadline across repeated resumes');
}
for(const invalid of ['placement','demand','cost','policy','staff']){
 const f=fixture();f.wait.interrupt('Review');
 if(invalid==='placement'){f.sim.s.ground[f.sim.idx(f.quote.args.a.x,f.quote.args.a.y)]=1;f.sim.markDirty();}
 if(invalid==='demand')f.sim.s.mkt.lostLog=[];
 if(invalid==='cost'){const plan=f.sim.plan.bind(f.sim);f.sim.plan=args=>{const p=plan(args);p.cost++;return p;};}
 if(invalid==='policy'||invalid==='staff'){
   f.sim.dispatch({type:'hire',role:'porter'});
   f.sim.addTask({type:'carts',need:'carts',cart:f.sim.s.carts[0].id,obj:'cart'+f.sim.s.carts[0].id,label:'Recover cart',work:20,phase:1});
   if(invalid==='policy')f.sim.dispatch({type:'policy',key:'porterCarts',v:false});
   else f.sim.s.agents=f.sim.s.agents.filter(a=>a.sid!==f.sim.s.staff.find(st=>st.role==='porter').id);
 }
 const before=structuredClone(f.sim.s);assert.equal(f.wait.resume(f.sim).ok,false,invalid);assert.equal(f.sim.s.speed,0);
 assert.ok(f.wait.pending);assert.deepEqual(f.sim.s,before,'failed Resume is save-read-only');
}
{
 const f=fixture();f.wait.interrupt('Review');const u=f.sim.objs('unit').find(u=>u.size===f.quote.size&&u.env==='std');
 // Explicit vacancy edge fixture: existing serviceable stock displaces an expansion proposal.
 f.sim.endLease(f.sim.s.leases[u.lease],'moveout');u.commercial='ready';
 assert.equal(yardQuote(f.sim,f.quote.args),null);assert.equal(f.wait.resume(f.sim).ok,false);
 assert.match(f.wait.review(f.sim).reason,/Lease the existing 5x10 space first/);
 assert.ok(show(f).includes('Lease the existing 5x10 space first'));
 assert.ok(show(f).includes('Review leasing'));
 assert.ok(!show(f).includes('data-a="reserveResume"'),'blocked proposal offers review, not an inert Resume');
}
{
 const f=fixture();f.wait.interrupt('Review');const args=structuredClone(f.wait.pending.args),orders=f.sim.s.orders.length;
 f.sim.money(-yardQuote(f.sim,args).position.available+1,'other','Fixture funding');
 let preview;f.ui.previewYardOpportunity=(size,spec)=>{preview=spec;f.ui.pauseForPopup('review');};
 assert.equal(f.ui.resumeReserveWait(),false);assert.deepEqual(preview,args);assert.equal(f.sim.s.speed,0);
 f.ui.resumePopup('review');assert.equal(f.sim.s.speed,0);assert.equal(f.wait.pending,null);assert.equal(f.wait.active,null);assert.equal(f.sim.s.orders.length,orders);
}
{
 const f=fixture(),base=new Sim(structuredClone(f.sim.s)),start=f.sim.s.t;
 for(const minutes of [4,7,3]){
   f.tick(minutes);while(base.s.t<f.sim.s.t){base.syncRequestHandling();base.step();base.syncRequestHandling();base.events.length=0;}
   f.wait.interrupt('Review');base.s.speed=0;assert.deepEqual(f.sim.s,base.s,'whole-state parity at each interruption');
   assert.equal(f.wait.resume(f.sim).ok,true);base.s.speed=4;assert.deepEqual(f.sim.s,base.s,'Resume changes only ordinary speed');
 }
 assert.equal(f.wait.active.started,start);assert.equal(new ReserveWait().pending,null,'new/reloaded controller has no saved wait intent');
 f.wait.interrupt('Review');assert.equal(f.wait.resume(fresh()).ok,false);assert.equal(f.wait.pending,null,'property mismatch clears retained intent');
}
{
 const f=fixture();f.wait.interrupt('Review');const args=f.quote.args;
 assert.equal(f.wait.matches({...args,flip:false,climate:false,rush:false}),true,'default flags and object field order preserve the build specification');
 f.ui.plan={...f.sim.plan(args),args};f.ui.renderActionBar=()=>{};
 f.ui.g.rend.setPreview=()=>{};
 const cash=f.sim.s.cash;f.ui.confirmPlan();
 assert.equal(f.sim.s.cash,cash-f.quote.plan.cost,'only ordinary explicit Confirm spends money');
 assert.equal(f.wait.pending,null,'confirming the selected investment ends its retained wait');assert.equal(f.sim.s.speed,0);
}
for(const problem of ['work','decision','financial','proposal']){
 const f=fixture();f.wait.interrupt('Review');let destination;
 if(problem==='work')f.sim.addTask({type:'repair',need:'repair_simple',obj:f.sim.objs('gate')[0].id,label:'Repair gate',work:20});
 if(problem==='decision')f.sim.s.convos.push({id:999,text:'Review request',actions:[]});
 if(problem==='financial')f.sim.s.cash=-1;
 if(problem==='proposal')f.sim.s.mkt.lostLog=[];
 f.ui.showRequests=()=>{destination='decision';};f.ui.showFinances=()=>{destination='financial';};f.ui.jumpSection=label=>{destination=label;};
 f.ui.onClick({target:{closest:()=>({dataset:{a:'reserveReview'}})}});
 assert.equal(destination,{work:'Work queue',decision:'decision',financial:'financial',proposal:'Your next improvement'}[problem]);
 assert.ok(f.wait.pending);assert.equal(f.sim.s.speed,0,'reviewing the cause keeps the selected wait paused');
}
{
 const f=fixture();f.wait.stop('Fixture reset');f.ui.reserveWait=null;f.ui.yardLoopHtml();
 assert.equal(f.ui.startReserveWait([...f.ui.reserveOffers.keys()][0]),true);
 f.ui.pauseForPopup('modal');f.ui.resumePopup('modal');
 assert.ok(show(f).includes('data-a="reserveResume"'),'production callback retains actionable Resume');
 f.ui.requestSpeed(4);const html=show(f);
 assert.ok(html.includes('Last wait'));assert.ok(!html.includes('reserve shortfall'),'ended wait never leaves an old financial figure on the map');
}
const css=fs.readFileSync('css/game.css','utf8');assert.match(css,/\.reserve-wait-bridge\) \{ max-height:none/);assert.match(css,/\.reserve-wait-bridge \.row \{ flex-wrap:wrap/);
console.log('PASS live financial completion, original-spec preview, vacancy explanation, all Resume revalidation, state parity and wrapping controls; physical Safari acceptance pending');
