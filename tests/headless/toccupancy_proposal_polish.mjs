// Production showcase/event and UI paths with DOM/graphics stubs. No device QA implied.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';
import {rescued} from './rescue-operation-fixture.mjs';
import {recovered} from './project-fixture.mjs';
import {yardInventory,yardChoices} from '../../js/yardloop.js';
import {FLOOR_H} from '../../js/data.js';
import {bannerTop} from '../../js/bannerplace.js';

const showcase=readFileSync(new URL('../../js/showcase.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../css/game.css',import.meta.url),'utf8');
function el() {
  const classes=new Set();
  return {innerHTML:'',textContent:'',hidden:false,style:{},children:[],
    classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){on?classes.add(k):classes.delete(k)}},
    appendChild(e){this.children.push(e)},prepend(){},after(){},addEventListener(){},
    querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({height:100,top:0,bottom:100}),
    firstElementChild:{getBoundingClientRect:()=>({height:100})}};
}
function fixture(sim) {
  const boxes={},timeouts=new Map(),sounds=[],bursts=[];let timer=0;
  const get=id=>boxes[id]||=el();
  const ui=Object.create(UI.prototype),game={sim,audio:{play:s=>sounds.push(s)},
    rend:{pan(){},azimuth:0,center:{x:0,z:0},scene:{remove(){}},disposeTree(){}},
    attach(s){this.sim=s},metaName:()=> 'Test yard'};
  game.ui=ui;ui.g=game;ui.title=false;ui.tapMap=()=>{};ui.onEvent=()=>{};ui.modalOpen=()=>false;ui.do=a=>game.sim.dispatch(a);
  const ctx=vm.createContext({console,performance,innerWidth:393,innerHeight:852,
    document:{body:el(),createElement:el,getElementById:get,querySelectorAll:()=>[]},
    matchMedia:()=>({matches:true}),yardInventory,FLOOR_H,bannerTop,
    PostFX:class{},WorldFX:class{burst(...args){bursts.push(args)}},
    setTimeout(f){const id=++timer;timeouts.set(id,f);return id},clearTimeout:id=>timeouts.delete(id),setInterval:()=>++timer,clearInterval(){}});
  // Evaluate the entire production installer; replace browser-only imports with the explicit stubs above.
  vm.runInContext(showcase.replace(/^import .*;$/gm,'').replace('export function installShowcase','function installShowcase').replace(/export \{ IC as SHOW_ICONS \};/, '')+'\nglobalThis.install=installShowcase;',ctx);
  ctx.install(game);
  return {game,ui,boxes,sounds,bursts,finishBanner(){
    for(let i=0;timeouts.size&&i<10;i++){const [id,f]=timeouts.entries().next().value;timeouts.delete(id);f()}
    assert.equal(timeouts.size,0,`banner timers drain: ${JSON.stringify({requests:game.sim.s.convos.map(c=>({text:c.text,actions:c.actions})),lesson:game.sim.s.lesson})}`);
  }};
}
function drain(sim,f) {const events=sim.events.splice(0);for(const e of events)if(['lease','movedin','moveout'].includes(e.type))f.ui.onEvent(e);}
function ready(sim){return sim.objs('unit').filter(u=>u.cstate==='operating'&&u.commercial==='ready'&&!u.lease&&!u.blocked)}
function answerRequests(sim){for(const c of [...sim.s.convos]){const i=c.actions.findIndex(a=>(!a.action||a.action.op==='noted')&&!sim.requestActionDisabled(a));if(i>=0)assert.ok(sim.dispatch({type:'convo',id:c.id,i}).ok)}}
function sandboxVacancy(){
  const sm=makeSandbox({kind:'business',start:'starter'});sm.ensure();
  const task=sm.s.tasks.find(t=>t.type==='makeready');assert.ok(sm.dispatch({type:'ownerTask',task:task.id}).ok);
  for(let i=0;!ready(sm).length&&i<600;i++)sm.step();assert.ok(ready(sm).length);return sm;
}

for(const kind of ['comeback','sandbox'])for(const speed of [0,1,2,4]) {
  const sm=kind==='comeback'?rescued():sandboxVacancy();sm.ensure();answerRequests(sm);sm.events=[];sm.s.speed=speed;
  const f=fixture(sm),prices=structuredClone(sm.s.market.ask),earned=structuredClone(sm.s.scenario?.earned);
  const units=ready(sm);assert.ok(units.length);
  for(const u of units)sm.signLease(u,{size:u.size});drain(sm,f);
  const inv=yardInventory(sm);assert.equal(inv.occupied+inv.reserved,inv.total);assert.ok(inv.reserved>0);
  assert.equal(f.bursts.length,0,'full reservation cannot celebrate physical occupancy');assert.equal(sm.s.speed,speed,'reservation introduces no new pause');
  assert.equal(f.ui.coachLabel(`All ${inv.total} operating units are leased.`),'Fully leased · Move-ins pending');
  // Natural move-in schedules and customer paths reach the production movedin event.
  for(let i=0;yardInventory(sm).occupied<inv.total&&i<3*1440;i++){
    sm.step();answerRequests(sm);drain(sm,f);
    if(yardInventory(sm).occupied<inv.total)assert.equal(f.bursts.length,0,'partial move-ins cannot celebrate full occupancy');
  }
  assert.equal(yardInventory(sm).occupied,inv.total,'all physical move-ins complete');
  assert.equal(f.bursts.length,1,'one occupancy acknowledgment');
  assert.ok(f.boxes.celebrate.innerHTML.includes('Fully occupied'));
  assert.ok(f.boxes.celebrate.innerHTML.includes(`${inv.total}/${inv.total} units occupied`));
  assert.equal(f.ui.coachLabel(`All ${inv.total} operating units are leased.`),'Fully leased · Review growth');
  assert.equal(sm.s.speed,0,'ordinary celebration pause is retained');
  const before=structuredClone(sm.s);f.ui.onEvent({type:'movedin',unit:units[0].id});assert.equal(f.bursts.length,1);assert.deepEqual(sm.s,before,'repeat event is read-only');
  if(speed===4){f.ui.notePause(0);f.ui.do({type:'speed',v:0})} // manual Pause during celebration must win
  f.finishBanner();assert.equal(sm.s.speed,speed===4?0:speed);
  const loaded=new Sim(structuredClone(sm.s)),loadBefore=JSON.stringify(loaded.s);f.game.attach(loaded);f.ui.onEvent({type:'movedin',unit:units[0].id});
  assert.equal(f.bursts.length,1,'loaded full property does not replay');assert.equal(JSON.stringify(loaded.s),loadBefore);
  assert.deepEqual(sm.s.market.ask,prices);assert.deepEqual(sm.s.scenario?.earned,earned);
  console.log(`PASS ${kind} ${speed}x: full reservations, natural move-ins, once-only banner, exact speed/manual Pause, attach/load, preserved rents/goals`);
}
{
  const empty=makeSandbox({kind:'business',start:'empty'}),f=fixture(empty);f.ui.onEvent({type:'movedin',unit:0});assert.equal(f.bursts.length,0);
  console.log('PASS empty property never celebrates full occupancy');
}
{
  // Controlled budget/demand fixture makes both quoted reserve states reachable without changing production economics.
  const sm=recovered(),ui=Object.create(UI.prototype);ui.g={sim:sm};ui.cmdBtn=()=>'';
  sm.s.mkt.lostLog.push(...Array.from({length:2},()=>({d:sm.day-1,r:'noSize',sz:'5x5',climate:false})));
  for(const cash of [100,100000]) {
    sm.s.cash=cash;sm.ensure();const before=JSON.stringify(sm.s),choices=yardChoices(sm);assert.ok(choices.length);
    const html=ui.yardLoopHtml(),cards=[...html.matchAll(/<article class="item yard-opportunity">([\s\S]*?)<\/article>/g)];assert.equal(cards.length,choices.length);
    for(let i=0;i<cards.length;i++){
      const card=cards[i][1],c=choices[i];
      for(const label of ['observed Days','Build:','Added operating costs:','Asking rent:','After build, bills &amp; reserve:'])assert.ok(card.includes(label));
      assert.ok(card.includes(`data-a="yardOpportunity" data-v="${c.size}"`));
      assert.equal(card.includes('Keeping cash is sensible.'),c.position.available<0);
      assert.equal(card.includes('data-a="reserveStart"'),c.position.available<0);
      assert.equal((card.match(/<small/g)||[]).length,c.position.available<0?7:5);
    }
    assert.equal(JSON.stringify(sm.s),before,'rendering and quoting leave state/RNG unchanged');
  }
  assert.match(css,/\.yard-opportunity \.grow \{[^}]*display:flex;[^}]*flex-direction:column;[^}]*gap:8px;/);
  assert.match(css,/\.yard-opportunity \.grow > small \{[^}]*display:block;[^}]*line-height:1\.45;[^}]*overflow-wrap:anywhere;/);
  assert.match(css,/\.yard-opportunity \.btn \{[^}]*max-width:100%;[^}]*white-space:normal;/);
  console.log('PASS separated proposal fields, honest negative/positive buffer, original preview action, read-only render and wrapping layout contract');
}
