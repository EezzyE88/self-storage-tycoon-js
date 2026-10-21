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

const sm=makeSandbox({kind:'business',cash:100000,tiers:'all',instant:false});sm.s.speed=0;
for(let rotation=0;rotation<4;rotation++) {
 const x=6+rotation*6,y=8;
 assert.ok(sm.dispatch({type:'build',tool:'du5x10',a:{x,y},b:{x,y},rotation}).ok);
}
assert.ok(sm.dispatch({type:'build',tool:'office',a:{x:10,y:18},b:{x:10,y:18},rotation:3}).ok);
g.company={props:[{name:'Rotated construction test',sim:sm}],active:0,feed:[]};g.sim=sm;
const geometry=sim=>JSON.stringify(Object.values(sim.s.objects).filter(o=>['office','unit'].includes(o.type)).map(o=>({type:o.type,x:o.x,y:o.y,w:o.w,h:o.h,dir:o.dir,door:o.door,cstate:o.cstate})));const expected=geometry(sm),cash=sm.s.cash,t=sm.s.t;
for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()])for(let k=0;k<3;k++){
 const p=await g.prepareLoad(code);assert.ok(p.ok,p.msg);g.applyLoad(p);assert.equal(geometry(g.sim),expected);assert.equal(g.sim.s.cash,cash);assert.equal(g.sim.s.t,t);assert.equal(g.sim.s.speed,0);
}
console.log('PASS production raw/compressed saves preserve all four unit directions and rotated office geometry, pending construction, cash, time and Pause across repeated loads');
