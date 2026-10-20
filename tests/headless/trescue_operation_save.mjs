import { rescued } from './rescue-operation-fixture.mjs';
import { rescuePricing } from '../../js/rescueoperations.js';
import { PROJECTS } from '../../js/propertyprojects.js';
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

const sm=rescued();const q=rescuePricing(sm);sm.dispatch({type:'rescuePricing',approach:'lower',expectedAsk:q.ask});
g.company={props:[{name:'Leasing test',sim:sm}],active:0,feed:[]};g.sim=sm;
async function verify(label){const r=JSON.parse(JSON.stringify(g.sim.s.rescueOperation)),cash=g.sim.s.cash,ask=g.sim.s.market.ask['10x10|std'];for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()])for(let i=0;i<3;i++){const p=await g.prepareLoad(code);assert.ok(p.ok,p.msg);g.applyLoad(p);assert.deepEqual(JSON.parse(JSON.stringify(g.sim.s.rescueOperation)),r);assert.equal(g.sim.s.cash,cash);assert.equal(g.sim.s.market.ask['10x10|std'],ask);g.sim.poll();assert.equal(g.sim.events.filter(e=>e.type==='rescue_operation_lease').length,0);}console.log('PASS real raw/compressed save retention: '+label);}
await verify('pricing decision before leasing');
const u=g.sim.s.objects[g.sim.s.rescueOperation.ids[0]];g.sim.signLease(u,{size:'10x10'});g.sim.events=[];await verify('first lease acknowledged');
g.sim.dispatch({type:'setRent',key:'10x10|std',v:180});await verify('later pricing change');
g.sim.dispatch({type:'loan',amt:500});const debt=g.sim.s.loan.bal;await verify('small credit draw');assert.equal(g.sim.s.loan.bal,debt);
const legacy=structuredClone(g.sim.s);delete legacy.rescueOperation;const old=await g.prepareLoad(g.rawSaveCode(JSON.stringify(legacy)));assert.ok(old.ok,old.msg);g.applyLoad(old);assert.equal(g.sim.s.rescueOperation,undefined);
const corrupt=structuredClone(g.sim.s);corrupt.rescueOperation={v:1,ids:[999]};const bad=await g.prepareLoad(g.rawSaveCode(JSON.stringify(corrupt)));assert.ok(bad.ok,bad.msg);g.applyLoad(bad);assert.equal(g.sim.s.rescueOperation,undefined);assert.deepEqual(Array.from(g.sim.s.scenario.earned),[true,true,true]);
console.log('PASS legacy/corrupt optional fields retain company and earned rescue');
