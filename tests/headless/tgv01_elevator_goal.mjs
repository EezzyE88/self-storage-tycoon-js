// GV-01: Go Vertical's "Average elevator wait under 10 min" goal must reflect live elevator service.
// Before GV-01 it passed with no riders (avgWait missing -> 0), with a broken or unpowered cab (frozen average) and
// with an average nobody had refreshed for weeks. Covers the two-floor dispatcher and the three-floor sweep-v1 dispatcher,
// the goal card text, and production save/reload. el.avgWait arithmetic and the leasing elevator factor are unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {tickVertical} from '../../js/vertical.js';
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
const clone=s=>new Sim(JSON.parse(JSON.stringify(s.s)));
const goal=sim=>SCENARIOS.vertical.goals.find(g=>g.k==='elevWait');
const note=sim=>sim.elevWaitStatus().note;
function finish(sim,ord){for(let k=0;k<50000&&ord.st==='construction';k++){sim.s.t++;tickVertical(sim,ord);sim.ensure();for(const el of sim.objs('elevator'))sim.updateElevator(el);}assert.equal(ord.st,'done');sim.autoOpenReadyUnits(true);}
function upgrade(sim){const sh=sim.objs('shell')[0],R=sim.verticalPlan(sh.id);assert.ok(R.ok,R.msg);assert.ok(sim.dispatch({type:'verticalUpgrade',...R}).ok);return sim.s.orders.at(-1);}
// Maple with one legacy two-floor freight elevator, then a three-floor copy whose cab runs sweep-v1.
const two=makeMaple();two.s.cash=1000000;two.s.open=false;two.s.opts={...two.s.opts,competition:false};finish(two,upgrade(two));two.ensure();
const three=clone(two);finish(three,upgrade(three));three.ensure();
const cab=sim=>sim.objs('elevator')[0];
function rider(sim,id,f,dest){const el=cab(sim),a={id,kind:'cust',f,x:el.x+.5,y:el.y+.5,st:'toUnit',pi:0,exp:{elev:0,walk:0,door:0},cart:null};sim.s.agents.push(a);sim.joinElevator(a,el,dest);return a;}
function drive(sim,pred,limit=600){for(let i=0;i<limit&&!pred();i++){sim.s.t++;for(const el of sim.objs('elevator'))sim.updateElevator(el);}assert.ok(pred(),'elevator did not board');}
function fresh(sim){const s=clone(sim);s.s.agents=[];const el=cab(s);Object.assign(el,{pos:0,tgt:null,door:0,riders:[],q:el.q.map(()=>[])});delete el.avgWait;delete el.lastBoardT;return s;}
function board(sim,id,dest,wait=0){const a=rider(sim,id,0,dest);sim.s.t+=wait;a.elevT0=sim.s.t-wait;drive(sim,()=>a.inElev);return a;}
const legacyOld=sim=>{const els=sim.objs('elevator').filter(e=>e.cstate==='operating');return els.length?Math.max(...els.map(e=>e.avgWait||0)):99;};

await test('no elevator: unmet and shown as "no elevator"',()=>{const sim=makeScenario('vertical');assert.equal(sim.objs('elevator').length,0);assert.equal(sim.metric('elevWait'),99);assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'no elevator');});
await test('zero riders: a working cab nobody has boarded is unmet (old metric passed at 0)',()=>{for(const base of [two,three]){const sim=fresh(base);assert.equal(legacyOld(sim),0,'reproduces the old false pass');assert.equal(sim.metric('elevWait'),99);assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'no riders yet');}});
await test('legacy two-floor boarding records lastBoardT and leaves avgWait arithmetic unchanged',()=>{const sim=fresh(two);assert.equal(cab(sim).dispatchMode,undefined);const a=board(sim,7001,1,4);const el=cab(sim);assert.equal(el.lastBoardT,sim.s.t);assert.ok(a.elevWaited>=4);assert.equal(el.avgWait,0*0.85+a.elevWaited*0.15,'unchanged EMA');assert.equal(sim.metric('elevWait'),el.avgWait);assert.equal(sim.goalMet(goal(sim)),true);assert.equal(note(sim),null);});
await test('three-floor sweep-v1 boarding records lastBoardT and leaves avgWait arithmetic unchanged',()=>{const sim=fresh(three);assert.equal(cab(sim).dispatchMode,'sweep-v1');const a=board(sim,7101,2,6);const el=cab(sim);assert.equal(el.lastBoardT,sim.s.t);assert.ok(a.elevWaited>=6);assert.equal(el.avgWait,0*.85+a.elevWaited*.15,'unchanged EMA');assert.equal(sim.goalMet(goal(sim)),true);});
await test('broken cab with a good frozen average is unmet; repair restores the goal',()=>{for(const base of [two,three]){const sim=fresh(base);board(sim,7201,1,2);const el=cab(sim);assert.equal(sim.goalMet(goal(sim)),true);el.cond=0.1;sim.markDirty();assert.ok(legacyOld(sim)<10,'reproduces the old false pass');assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'out of service');el.cond=1;sim.markDirty();assert.equal(sim.goalMet(goal(sim)),true);}});
await test('unpowered cab with a good frozen average is unmet',()=>{const sim=fresh(two);board(sim,7301,1,2);const el=cab(sim);el.unpowered=true;assert.ok(legacyOld(sim)<10);assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'out of service');});
await test('closed for floor extension (drain or service test) is unmet',()=>{const sim=fresh(two);board(sim,7401,1,2);const el=cab(sim);el.extensionDrain=true;assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'closed for extension');delete el.extensionDrain;el.serviceTestUntil=sim.s.t+30;assert.equal(sim.goalMet(goal(sim)),false);sim.s.t+=31;assert.equal(sim.goalMet(goal(sim)),true);});
await test('stale average: no boarding for more than 7 days is unmet until someone rides again',()=>{for(const base of [two,three]){const sim=fresh(base);board(sim,7501,1,2);const el=cab(sim);sim.s.t=el.lastBoardT+7*MIN_PER_DAY;assert.equal(sim.goalMet(goal(sim)),true,'exactly 7 days still counts');sim.s.t++;assert.ok(legacyOld(sim)<10,'reproduces the old false pass');assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'no riders this week');el.pos=0;board(sim,7502,1,3);assert.equal(sim.goalMet(goal(sim)),true);}});
await test('a slow cab still fails on its real average',()=>{const sim=fresh(two);const el=cab(sim);board(sim,7601,1,2);el.avgWait=14;assert.equal(sim.metric('elevWait'),14);assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),null);});
await test('two cabs: any broken cab fails; an idle second cab does not block a fresh first cab',()=>{const sim=fresh(two),el=cab(sim);board(sim,7701,1,2);const other={...JSON.parse(JSON.stringify(el)),id:sim.id(),riders:[],q:el.q.map(()=>[])};delete other.lastBoardT;delete other.avgWait;sim.s.objects[other.id]=other;sim.markDirty();sim.ensure();assert.equal(sim.objs('elevator').length,2);assert.equal(sim.goalMet(goal(sim)),true);other.cond=0.1;assert.equal(sim.goalMet(goal(sim)),false);assert.equal(note(sim),'out of service');other.cond=1;other.avgWait=30;other.lastBoardT=sim.s.t;assert.equal(sim.metric('elevWait'),30,'worst fresh cab counts');});
await test('leasing elevator factor still reads el.avgWait exactly as before',()=>{const sim=fresh(two);board(sim,7801,1,4);const el=cab(sim),u=sim.objs('unit').find(u=>u.f===1);const exp=el.cond<0.2?0.55:Math.min(1,Math.max(0.7,1-(el.avgWait||0)/90));assert.equal(sim.elevatorFactor(u),exp);});
await test('goal card text: the UI formatter shows the reason instead of a number',()=>{const ui=readFileSync('js/ui.js','utf8'),src=ui.slice(ui.indexOf('  fmtGoal(g, v) {'),ui.indexOf('  renderScenario(force) {'));
  const ctx=vm.createContext({pct:v=>Math.round(v*100)+'%',money:v=>'$'+v});const fmt=vm.runInContext(`({${src}})`,ctx).fmtGoal;
  const sim=fresh(two),g=goal(sim),me={sim},show=()=>fmt.call(me,g,sim.metric('elevWait'));assert.equal(show(),'no riders yet');board(sim,7901,1,4);assert.equal(show(),cab(sim).avgWait.toFixed(1)+' min');assert.match(show(),/^\d+\.\d min$/);cab(sim).cond=0.1;assert.equal(show(),'out of service');
  const none=makeScenario('vertical');assert.equal(fmt.call({sim:none},g,none.metric('elevWait')),'no elevator');});
// Production saveJSON/prepareLoad in a vm, as in tscenario_rules_save.
function harness(sim){
  const main=readFileSync('js/main.js','utf8');
  const context=vm.createContext({Sim,SCENARIOS,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:false},savearchive:{},cloud:{ok:false},
    CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);
  const g=context.game;g.sim=sim;g.company={props:[{name:sim.s.scenario?.name||'Lot',sim}],active:0,feed:[]};return g;
}
const reload=async sim=>{const p=await harness(sim).prepareLoad(await harness(sim).saveCode());assert.equal(p.ok,true);return p.company.props[p.company.active].sim;};
await test('save and reload keep lastBoardT, avgWait and the goal judgement (fresh, stale, broken, sweep-v1)',async()=>{
  for(const base of [two,three]){const sim=fresh(base);sim.s.scenario={id:'vertical',name:'Go Vertical',goals:SCENARIOS.vertical.goals.map(g=>({...g})),deadline:300,fail:{...SCENARIOS.vertical.fail},status:'active',badDays:0};
    board(sim,8001,1,3);const el=cab(sim);
    for(const setup of [()=>{},()=>{sim.s.t=el.lastBoardT+8*MIN_PER_DAY;},()=>{el.cond=0.1;}]){setup();const L=await reload(sim),le=L.objs('elevator')[0];
      assert.equal(le.lastBoardT,el.lastBoardT);assert.equal(le.avgWait,el.avgWait);assert.equal(le.dispatchMode,el.dispatchMode);assert.equal(L.s.t,sim.s.t);
      assert.deepEqual(L.elevWaitStatus(),sim.elevWaitStatus());assert.equal(L.goalMet(L.s.scenario.goals.find(g=>g.k==='elevWait')),sim.goalMet(goal(sim)));}}
});
console.log(`ALL PASS: ${n} GV-01 elevator goal checks`);
