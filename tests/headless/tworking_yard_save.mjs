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

const sm=makeMaple(9101);sm.dispatch({type:'hire',role:'porter'});const task=sm.s.tasks.find(t=>t.type==='makeready');sm.finishTask(task,sm.s.agents.find(a=>a.role==='porter'));sm.s.t=1440+420;sm.financialBatch();sm.s.speed=0;sm.ensure();
g.company={props:[{name:'Reporting test',sim:sm}],active:0,feed:[]};g.sim=sm;
const report=JSON.stringify(sm.s.workReport),cash=sm.s.cash;
for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){for(let k=0;k<3;k++){const p=await g.prepareLoad(code);assert.ok(p.ok,p.msg);g.applyLoad(p);assert.equal(JSON.stringify(g.sim.s.workReport),report);assert.equal(g.sim.s.cash,cash);g.sim.financialBatch();assert.equal(JSON.stringify(g.sim.s.workReport),report);assert.equal(g.sim.s.cash,cash);}}
console.log('PASS production raw/compressed save-code preparation/load repeated three times; report and cash exact, no repeated accrual');
