// Real production methods with explicit threshold/capital fixtures; no device acceptance implied.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeScenario,makeSandbox,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {installTutorial,lessonTick,lessonAllowed,lessonById} from '../../js/tutorial.js';
import {careerEligibility,portfolioCareer} from '../../js/career.js';
import {UI} from '../../js/ui.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
const main=readFileSync('js/main.js','utf8');
const ctx=vm.createContext({portfolioCareer,Sim,fmtTime,makeScenario,makeSandbox,makeMaple,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,installTutorial,localsave,savearchive,Audio:class{},performance,console,BUILD:{name:'career37-test'},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+'function makeMapleSeedPrice(day){return 95000+(day%7)*1500;}globalThis.game=game;',ctx);
const g=ctx.game;g.attach=function(sim){this.sim=sim;installTutorial(sim)};g.ui={title:false,setMeta(){},renderFeed(){},toast(){}};g.drain=()=>{};
vm.runInContext(main.slice(main.indexOf('const BG_EVENTS'),main.indexOf('let last = performance.now'))+'globalThis.stepTicks=stepTicks;',ctx);

const sm=makeMaple(9101);sm.s.tut={on:false,done:true};sm.s.t=19*60;sm.s.speed=0;sm.dispatch({type:'hire',role:'clerk'});
const tn=Object.values(sm.s.tenants)[0],L=sm.s.leases[tn.lease],u=sm.s.objects[L.unit];tn.leaving=true;sm.s.policies.retention=true;
sm.schedule({kind:'moveout',tenant:tn.id,unit:u.id},sm.s.t+2*1440);sm.moveoutConvo(tn,L,u,true);sm.syncRequestHandling();
g.company={props:[{name:'Queued retention test',sim:sm}],active:0,feed:[]};g.sim=sm;
const rent=L.rent,cash=sm.s.cash,t=sm.s.t,id=tn.id;
for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()])for(let k=0;k<3;k++){
 const p=await g.prepareLoad(code);assert.ok(p.ok,p.msg);g.applyLoad(p);g.sim.syncRequestHandling();
 assert.equal(g.sim.s.speed,0);assert.equal(g.sim.s.t,t);assert.equal(g.sim.s.cash,cash);assert.equal(g.sim.s.convos[0].staffWaiting,true);assert.equal(g.sim.s.tenants[id].retainTried,undefined);
 g.sim.s.t=1440+8*60;g.sim.s.agents.find(a=>a.role==='clerk').st='office';g.sim.rnd=()=>0;
 // Explicitly exercise the response at staffed hours; this direct method call is not a claim that paused time runs.
 g.sim.convoTick();assert.equal(g.sim.s.tenants[id].retainTried,true);assert.equal(g.sim.s.leases[g.sim.s.tenants[id].lease].rent,Math.round(rent*.9));assert.equal(g.sim.s.convos.length,0);assert.equal(g.sim.s.cash,cash);assert.equal(g.sim.s.speed,0);
}
console.log('PASS production raw/compressed load preserves queued retention, policy, cash, time and manual Pause; response resumes exactly once when explicitly exercised with coverage');
