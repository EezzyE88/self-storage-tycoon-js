import { recovered } from './project-fixture.mjs';
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

const sm=recovered();
assert.ok(sm.dispatch({type:'build',tool:'du5x5',a:{x:13,y:4},b:{x:13,y:4},axis:'y',f:0}).ok);
assert.ok(sm.dispatch({type:'build',...PROJECTS.small.args,projectKey:'small'}).ok);
assert.equal(sm.s.yardLoop.groups.length,2,'overlapping construction groups both survive production saves');
g.company={props:[{name:'Project test',sim:sm}],active:0,feed:[]};g.sim=sm;
async function roundTrip(label) {
 const project=structuredClone(g.sim.s.propertyProjects),watch=structuredClone(g.sim.s.yardLoop),cash=g.sim.s.cash;
 for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]) for(let k=0;k<3;k++){
  const p=await g.prepareLoad(code);assert.ok(p.ok,p.msg);g.applyLoad(p);
  assert.deepEqual(JSON.parse(JSON.stringify(g.sim.s.propertyProjects)),project);assert.equal(g.sim.s.cash,cash);
  assert.deepEqual(JSON.parse(JSON.stringify(g.sim.s.yardLoop)),watch);
  g.sim.poll();assert.equal(g.sim.events.filter(e=>['project_complete','project_first_lease','yard_filled'].includes(e.type)).length,0);
 }
 console.log('PASS production raw/compressed save-code retention: '+label);
}
await roundTrip('construction');
for(let i=0;i<500;i++)g.sim.step();
g.sim.dispatch({type:'commission',all:true});g.sim.events=[];
await roundTrip('commissioned');
const hist=g.sim.s.propertyProjects.history[0];g.sim.signLease(g.sim.s.objects[hist.ids[0]],{size:'5x10',climate:false});g.sim.events=[];
await roundTrip('first lease acknowledged');
assert.ok(g.sim.dispatch({type:'build',...PROJECTS.cover.args,projectKey:'cover'}).ok);
for(let i=0;i<600;i++)g.sim.step();g.sim.events=[];
await roundTrip('both completed projects');
const legacy=structuredClone(g.sim.s);delete legacy.propertyProjects;
const old=g.rawSaveCode(JSON.stringify(legacy)),loaded=await g.prepareLoad(old);assert.ok(loaded.ok,loaded.msg);g.applyLoad(loaded);assert.equal(g.sim.s.propertyProjects,undefined);
const malformed=structuredClone(g.sim.s);malformed.propertyProjects={v:1,active:{key:'unknown'},history:[]};const bad=await g.prepareLoad(g.rawSaveCode(JSON.stringify(malformed)));assert.ok(bad.ok,bad.msg);g.applyLoad(bad);assert.equal(g.sim.s.propertyProjects,undefined);
console.log('PASS legacy and malformed optional metadata load without changing company');
