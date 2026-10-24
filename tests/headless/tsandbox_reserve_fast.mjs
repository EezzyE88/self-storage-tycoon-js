// Production Sandbox build-review/controller/clock paths; no browser or device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Sim} from '../../js/sim.js';
import {makeSandbox} from '../../js/scenarios.js';
import {UI} from '../../js/ui.js';
import {ReserveWait,sandboxReserveQuote} from '../../js/reservewait.js';
const source=fs.readFileSync('js/main.js','utf8');
const batch=source.slice(source.indexOf('const BG_EVENTS ='),source.indexOf('let last = performance.now()'));
const args={tool:'du5x10',a:{x:10,y:2},b:{x:10,y:2},rotation:2,f:0,climate:false,flip:false,rush:false};
function el(){return {innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}};}
function fixture(){
 const sim=makeSandbox({start:'starter',cash:60000});
 // Use ordinary Owner assignment for the starter's existing work, then choose a low-cash checkpoint.
 for(const task of sim.s.tasks)assert.ok(sim.dispatch({type:'ownerTask',task:task.id,forceOwner:true}).ok);
 sim.s.cash=1300;sim.ensure();
 const ui=Object.create(UI.prototype),boxes={};
 const game={sim,ui,acc:0,syncTier(){},drain(){sim.events.length=0;},note(){},audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){},setFocus(){},lookAt(){}}};
 ui.g=game;ui.title=false;ui.root={classList:el().classList,querySelectorAll:()=>[]};ui.$=k=>boxes[k]||=el();ui.sfx=()=>{};ui.toast=()=>{};
 ui.syncFeedbackProperty=()=>{};ui.spendingHtml=()=>'';ui.buildSheet=()=>'';
 ui.renderFeed=()=>{sim.syncRequestHandling();if(sim.s.convos.some(c=>!c.staffHandling))ui.pauseForPopup('convo');else ui.resumePopup('convo');};
 ui.setView=v=>{game.rend.view=v;};ui.frameOutline=()=>{};
 const tick=vm.runInNewContext(batch+';stepTicks',{game});
 const click=a=>ui.onClick({target:{closest:()=>({dataset:{a}})}});
 const preview=(a=args)=>{ui.pickTool(a.tool);ui.buildRotation=a.rotation??null;ui.flip=!!a.flip;ui.climate=!!a.climate;ui.rush=!!a.rush;ui.planArgs=structuredClone({a:a.a,b:a.b,axis:a.axis,dir:a.dir});game.rend.view=a.f||'ext';ui.replan();};
 const start=()=>{preview();click('sandboxReserveStart');assert.ok(ui.reserveWait?.active);return ui.reserveWait;};
 return {sim,ui,game,boxes,click,preview,start,tick,burst:()=>ui.reserveWait.advance(sim,()=>tick(1),()=>0)};
}
{
 const f=fixture(),before=structuredClone(f.sim.s),q=sandboxReserveQuote(f.sim,args);
 assert.ok(q?.position.available<0);assert.equal(f.sim.s.mkt.lostLog.length,0,'Sandbox does not require Comeback demand history');
 assert.deepEqual(f.sim.s,before,'quoting is read-only');f.preview();
 assert.match(f.boxes.abar.innerHTML,/data-a="sandboxReserveStart"/);assert.match(f.ui.yardInfillHtml(),/Choose a placement in Build/);
 const orders=f.sim.s.orders.length,cash=f.sim.s.cash;f.click('sandboxReserveStart');
 assert.ok(f.ui.reserveWait.active);assert.deepEqual(f.ui.reserveWait.active.args,f.ui.reserveOffers.values().next().value.args);
 assert.equal(f.ui.tool,null);assert.equal(f.sim.s.speed,4);assert.equal(f.ui.popupBlocks.size,0);assert.equal(f.sim.s.cash,cash);assert.equal(f.sim.s.orders.length,orders);
 assert.match(f.boxes.tut.innerHTML,/Stop waiting/);
 console.log('PASS native Sandbox quote, visible build-review action, actual click arming and reachable Stop; no purchase');
}
{
 const f=fixture();f.start();const base=new Sim(structuredClone(f.sim.s)),t=f.sim.s.t;
 const n=f.burst();assert.ok(n>0&&n<=240);assert.equal(f.sim.s.t,t+n);
 for(let i=0;i<n;i++){base.syncRequestHandling();base.step();base.syncRequestHandling();base.events.length=0;}
 base.s.speed=f.sim.s.speed;assert.deepEqual(f.sim.s,base.s,'complete ordinary-minute state/RNG/economics parity');
 console.log('PASS Sandbox burst bound and complete ordinary simulation parity at equal time');
}
{
 const f=fixture();f.start();const step=f.sim.step.bind(f.sim);let n=0;
 f.sim.step=()=>{step();if(++n===3)f.sim.convo({key:'sandbox-wait-owner',text:'Owner decision',actions:[{label:'Noted'}]});};
 assert.equal(f.burst(),3);assert.equal(f.sim.s.speed,0);assert.ok(f.ui.reserveWait.pending);const started=f.ui.reserveWait.pending.started;
 assert.equal(f.ui.resumeReserveWait(),false);assert.equal(f.sim.dispatch({type:'convo',id:f.sim.s.convos[0].id,i:0}).ok,true);f.ui.renderFeed();
 assert.equal(f.sim.s.speed,0);assert.equal(f.burst(),0);assert.equal(f.ui.resumeReserveWait(),true);assert.equal(f.ui.reserveWait.active.started,started);
 assert.match(f.ui.sandboxReserveHtml(),/Stop waiting/);
 console.log('PASS owner decision interrupts exact minute; resolving stays paused; explicit Resume preserves original deadline');
}
{
 const f=fixture();f.start();f.ui.requestSpeed(0);const before=structuredClone(f.sim.s);assert.equal(f.ui.reserveWait.active,null);assert.equal(f.ui.reserveWait.pending,null);assert.equal(f.burst(),0);assert.deepEqual(f.sim.s,before);
 console.log('PASS manual Pause cancels Sandbox waiting without further simulation');
}
{
 const f=fixture();f.start();const original=structuredClone(f.ui.reserveWait.active.args),step=f.sim.step.bind(f.sim),orders=f.sim.s.orders.length;let n=0;
 f.sim.step=()=>{step();if(++n===2)f.sim.money(-sandboxReserveQuote(f.sim,original).position.available+1,'other','Disposable target receipt');};
 assert.equal(f.burst(),2);assert.equal(f.sim.s.speed,0);assert.deepEqual(f.ui.reserveResult,original);assert.equal(f.sim.s.orders.length,orders);
 assert.match(f.ui.sandboxReserveHtml(),/Preview investment/);assert.equal(f.ui.previewYardOpportunity(null,f.ui.reserveResult),true);
 assert.equal(f.ui.plan.args.rotation,original.rotation);assert.deepEqual(f.ui.plan.creates,sandboxReserveQuote(f.sim,original).plan.creates);
 assert.equal(f.sim.s.orders.length,orders);assert.equal(f.sim.s.speed,0);
 f.click('confirm');assert.equal(f.sim.s.orders.length,orders+1);assert.equal(f.sim.s.speed,0);
 console.log('PASS funded target pauses without buying; original rotated geometry restored; actual Confirm alone purchases and stays paused');
}
{
 for(const kind of ['free','business']){
  const f=fixture();if(kind==='free')f.sim.s.sb.unlimited=true;else f.sim.s.cash=100000;
  f.preview();assert.doesNotMatch(f.boxes.abar.innerHTML,/data-a="sandboxReserveStart"/);
 }
 const f=fixture();for(const change of [a=>({...a,tool:'demolish'}),a=>({...a,a:{x:-1,y:-1},b:{x:-1,y:-1}})])assert.equal(sandboxReserveQuote(f.sim,change(args)),null);
 f.sim.s.lesson={id:'anything'};assert.equal(sandboxReserveQuote(f.sim,args),null);delete f.sim.s.lesson;
 f.sim.s.scenario={status:'active'};assert.equal(sandboxReserveQuote(f.sim,args),null);
 console.log('PASS funded, unlimited Free Build, invalid, demolition, lesson and scenario contexts cannot arm inappropriate Sandbox waits');
}
{
 const f=fixture();f.preview();f.ui.pauseForPopup('modal');const before=structuredClone(f.sim.s);
 assert.equal(f.ui.startSandboxReserveWait(),false);assert.deepEqual(f.sim.s,before);assert.ok(f.ui.tool);
 f.ui.resumePopup('modal');f.sim.convo({key:'blocked-start',text:'Owner decision',actions:[{label:'Noted'}]});assert.equal(f.ui.startSandboxReserveWait(),false);assert.equal(f.sim.s.speed,0);
 console.log('PASS unrelated modal and outstanding owner decision block arming without dismissing or advancing');
}
{
 const f=fixture();f.start();f.ui.pauseForPopup('panel');f.ui.resumePopup('panel');assert.ok(f.ui.reserveWait.pending);assert.equal(f.sim.s.speed,0);
 const quote=f.sim.plan.bind(f.sim);f.sim.plan=a=>{const p=quote(a);p.cost+=1;return p;};
 assert.equal(f.ui.resumeReserveWait(),false);assert.equal(f.sim.s.speed,0);assert.match(f.ui.reserveWait.review(f.sim).reason,/quote changed/);
 f.sim.plan=quote;f.ui.reserveWait.pending.started=f.sim.s.t-7*1440;assert.equal(f.ui.resumeReserveWait(),false);assert.equal(f.sim.s.speed,0);
 console.log('PASS nested review stays paused; changed quote and original seven-day deadline block Resume');
}
{
 const f=fixture();f.sim.s.coTier=2;const rushed={...args,rush:true};
 const q=sandboxReserveQuote(f.sim,rushed),plain=sandboxReserveQuote(f.sim,args);assert.equal(q.plan.cost,Math.round(plain.plan.cost*1.25));
 const before=f.sim.s.cash;assert.ok(f.sim.dispatch({type:'build',...rushed}).ok);assert.equal(before-f.sim.s.cash,q.plan.cost);
 const g=fixture();g.start();assert.ok(g.ui.reserveWait.matches(args));assert.equal(g.ui.reserveWait.matches({...args,rotation:0}),false);assert.equal(g.ui.reserveWait.matches({...args,dir:[1,0]}),false);
 console.log('PASS Rush quote matches actual purchase charge; orientation is part of retained investment identity');
}
{
 const f=fixture();f.start();const saveMethod=source.slice(source.indexOf('  saveJSON() {'),source.indexOf('  rawSaveCode('));
 const serializer=vm.runInNewContext('({'+saveMethod+'})');Object.assign(serializer,f.game);serializer.rend=f.game.rend;
 const parsed=JSON.parse(serializer.saveJSON()),expected=JSON.parse(JSON.stringify(f.sim.s));delete parsed.uiView;assert.deepEqual(parsed,expected);
 const loaded=new Sim(parsed);loaded.s.speed=0;const controller=new ReserveWait();assert.equal(controller.active,null);assert.equal(controller.pending,null);
 assert.equal(loaded.s.cash,f.sim.s.cash);assert.equal(loaded.s.t,f.sim.s.t);assert.deepEqual(loaded.s.sb,f.sim.s.sb);
 console.log('PASS production save serializer stores ordinary Sandbox state only; fresh session has no armed wait');
}
console.log('Sandbox fast reserve: 10 groups passed; rendered browser and physical Safari NOT TESTED');
