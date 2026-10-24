import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {ReserveWait} from '../../js/reservewait.js';
import {yardChoices,yardQuote} from '../../js/yardloop.js';
import {TICKS_PER_SEC_1X} from '../../js/data.js';
import {recovered} from './project-fixture.mjs';
const seed=recovered({settleDecisions:true}).s;
const main=fs.readFileSync('js/main.js','utf8');
const batch=main.slice(main.indexOf('const BG_EVENTS ='),main.indexOf('let last = performance.now()'));
const start=main.indexOf('  const s = game.sim.s;',main.indexOf('function tick(now)'));
const frameBody=main.slice(start,main.indexOf('  if (!game.ui.title) { // autosave',start));
function fixture(){
 const sim=new Sim(structuredClone(seed));sim.s.cash=1100;sim.ensure();
 const ui=Object.create(UI.prototype),game={sim,ui,acc:0,syncTier(){},drain(){sim.events.length=0;},note(){},audio:{unlock(){}}};
 ui.g=game;ui.title=false;ui.renderTut=()=>{};ui.toast=()=>{};ui.modalOpen=()=>false;
 ui.renderFeed=()=>{sim.syncRequestHandling();if(sim.s.convos.some(c=>!c.staffHandling))ui.pauseForPopup('convo');else ui.resumePopup('convo');};
 const stops=[];const wait=ui.reserveWait=new ReserveWait((reason,a)=>{ui.notePause(0);game.acc=0;stops.push({reason,ready:!!a.ready});});
 const tick=vm.runInNewContext(batch+';stepTicks',{game});
 const quote=yardChoices(sim)[0];assert.ok(quote?.position.available<0);assert.ok(wait.start(sim,quote).ok);
 return {sim,ui,game,wait,quote,stops,tick,burst:clock=>wait.advance(sim,()=>tick(1),clock)};
}
{
 const f=fixture(),base=new Sim(structuredClone(f.sim.s)),t=f.sim.s.t;
 const n=f.burst(()=>0);assert.equal(n,240);assert.equal(f.sim.s.t,t+240);
 for(let i=0;i<n;i++){base.syncRequestHandling();base.step();base.syncRequestHandling();base.events.length=0;}
 assert.deepEqual(f.sim.s,base.s,'fast wait preserves complete ordinary simulation state at equal time');
 assert.deepEqual(f.sim.events,base.events);
 console.log('PASS 240-minute cap and full-state/RNG/economics parity with ordinary simulation');
}
{
 const f=fixture();let calls=0;const t=f.sim.s.t;
 assert.equal(f.burst(()=>calls++),6);assert.equal(f.sim.s.t,t+6);
 console.log('PASS six-millisecond cooperative budget returns control between bounded bursts');
}
{
 const f=fixture(),step=f.sim.step.bind(f.sim),t=f.sim.s.t;let n=0;
 f.sim.step=()=>{step();if(++n===3)f.sim.convo({key:'fast-owner',text:'Owner decision',actions:[{label:'Noted'}]});};
 assert.equal(f.burst(()=>0),3);assert.equal(f.sim.s.t,t+3);assert.equal(f.sim.s.speed,0);assert.ok(f.wait.pending);
 assert.equal(f.burst(()=>0),0);assert.ok(f.sim.dispatch({type:'convo',id:f.sim.s.convos[0].id,i:0}).ok);f.ui.renderFeed();
 assert.equal(f.sim.s.speed,0);assert.equal(f.burst(()=>0),0);
 console.log('PASS owner decision stops at its exact minute; answering never resumes automatically');
}
{
 const f=fixture(),step=f.sim.step.bind(f.sim),orders=f.sim.s.orders.length,units=f.sim.objs('unit').length;let n=0;
 f.sim.step=()=>{step();if(++n===2)f.sim.money(-yardQuote(f.sim,f.quote.args).position.available+1,'other','Disposable test funding');};
 assert.equal(f.burst(()=>0),2);assert.equal(f.sim.s.speed,0);assert.equal(f.wait.active,null);assert.equal(f.stops.at(-1).ready,true);
 assert.equal(f.sim.s.orders.length,orders);assert.equal(f.sim.objs('unit').length,units);assert.equal(f.burst(()=>0),0);
 console.log('PASS reserve completion pauses immediately without constructing or purchasing');
}
{
 const f=fixture();f.burst(()=>0);f.ui.requestSpeed(0);const state=JSON.stringify(f.sim.s);
 assert.equal(f.wait.active,null);assert.equal(f.wait.pending,null);assert.equal(f.burst(()=>0),0);assert.equal(JSON.stringify(f.sim.s),state);
 const other=new Sim(structuredClone(seed));assert.equal(f.wait.advance(other,()=>assert.fail('wrong property'),()=>0),0);
 console.log('PASS real manual Pause cancels fast waiting and cannot advance paused or another property');
}
{
 const f=fixture(),other=new Sim(structuredClone(seed));other.convo({key:'other-owner',text:'Decision',actions:[{label:'Noted'}]});
 f.game.company={props:[{sim:f.sim},{sim:other}]};const before=f.sim.s.t,otherBefore=other.s.t;
 assert.equal(f.burst(()=>0),0);assert.equal(f.sim.s.t,before);assert.equal(other.s.t,otherBefore);assert.equal(f.sim.s.speed,0);
 console.log('PASS existing owner decision on another property prevents any advance');
}
{
 const f=fixture(),other=new Sim(structuredClone(seed)),step=other.step.bind(other);let n=0;
 f.game.company={props:[{sim:f.sim},{sim:other}]};other.step=()=>{step();if(++n===2)other.convo({key:'new-other-owner',text:'Decision',actions:[{label:'Noted'}]});};
 assert.equal(f.burst(()=>0),2);assert.equal(f.sim.s.speed,0);assert.ok(f.wait.pending);
 console.log('PASS new owner decision on another property interrupts the same simulation minute');
}
{
 const f=fixture(),advance=f.wait.advance.bind(f.wait);f.wait.advance=(sim,minute)=>advance(sim,minute,()=>0);
 const t=f.sim.s.t;vm.runInNewContext(frameBody,{game:f.game,document:{hidden:false},dt:1/60,TICKS_PER_SEC_1X,stepTicks:f.tick});assert.equal(f.sim.s.t,t+240);
 f.wait.stop('done');f.ui.requestSpeed(4);const normal=f.sim.s.t;f.game.acc=0;
 vm.runInNewContext(frameBody,{game:f.game,document:{hidden:false},dt:1/60,TICKS_PER_SEC_1X,stepTicks:f.tick});assert.equal(f.sim.s.t,normal+4);
 f.ui.requestSpeed(0);const paused=JSON.stringify(f.sim.s);vm.runInNewContext(frameBody,{game:f.game,document:{hidden:false},dt:1/60,TICKS_PER_SEC_1X,stepTicks:f.tick});
 // Polling is the existing paused-frame behavior; it must not run clock minutes.
 assert.equal(f.sim.s.t,normal+4);assert.equal(f.sim.s.speed,0);
 console.log('PASS production frame fast-forwards only explicit waiting; ordinary 4x and Pause retain timing');
}
{
 const f=fixture(),started=f.wait.active.started;f.sim.s.t=started+7*1440;
 assert.equal(f.burst(()=>0),0);assert.equal(f.sim.s.speed,0);assert.equal(f.wait.active,null);
 console.log('PASS original seven-day deadline checked before another minute');
}
console.log('Fast reserve prototype: 9 groups passed; CPU simulation only, physical responsiveness NOT TESTED');
