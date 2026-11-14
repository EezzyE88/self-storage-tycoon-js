// MG-01: production save envelope (real game saveJSON/saveCode/prepareLoad/applyLoad) with an in-progress claim,
// a featured cadence and a legacy save without MG-01 fields. Native only; no Safari or rendered claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime,newState} from '../../js/sim.js';
import {makeScenario,makeSandbox,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {installTutorial} from '../../js/tutorial.js';
import {portfolioCareer} from '../../js/career.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
import {moveOutCheck} from '../../js/moveout.js';
const main=readFileSync('js/main.js','utf8');
const ctx=vm.createContext({portfolioCareer,Sim,fmtTime,makeScenario,makeSandbox,makeMaple,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,installTutorial,localsave,savearchive,Audio:class{},performance,console,BUILD:{name:'mg01-test'},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+'function makeMapleSeedPrice(day){return 95000+(day%7)*1500;}globalThis.game=game;',ctx);
const g=ctx.game;g.attach=function(sim){this.sim=sim;installTutorial(sim)};g.ui={title:false,setMeta(){},renderFeed(){},toast(){}};g.drain=()=>{};
const sim=makeMaple(17);sim.s.tut={on:false,done:true,flags:{}};sim.s.lesson=null;sim.s.t=40*MIN_PER_DAY+540;sim.s.tasks=[];
const other=makeMaple(18);other.s.tut={on:false,done:true,flags:{}};other.s.lesson=null;other.s.t=40*MIN_PER_DAY+540;other.s.tasks=[];
const L=Object.values(sim.s.leases)[0];sim.endLease(L,'moveout');const t=sim.s.tasks.find(x=>x.obj===L.unit);
assert.equal(t.mg01Featured,true);
const owner=sim.s.staff.find(x=>x.role==='owner'),left=sim.workRemaining(owner);
const r=sim.dispatch({type:'mg01Start',task:t.id});assert.equal(r.ok,true,r.msg);sim.s.speed=0;
g.sim=sim;g.company={props:[{name:'Maple',sim},{name:'Second',sim:other}],active:0,feed:[]};
const cash=sim.s.cash,tt=sim.s.t,cadence=structuredClone(sim.s.mg01);let n=0;
for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){
  const prep=await g.prepareLoad(code);assert.ok(prep.ok,prep.msg);assert.equal(g.applyLoad(prep),true);
  const S=g.sim.s,T=S.tasks.find(x=>x.id===t.id),O=S.staff.find(x=>x.role==='owner');
  assert.equal(T.mg01Claim,undefined);assert.equal(T.assigned,null);assert.equal(T.mg01Featured,true);
  assert.equal(g.sim.workRemaining(O),left);assert.equal(moveOutCheck(g.sim,T).ok,true);
  assert.equal(JSON.stringify(S.mg01),JSON.stringify(cadence));assert.equal(S.cash,cash);assert.equal(S.t,tt);assert.equal(S.speed,0);
  assert.equal(g.company.props[1].sim.s.mg01,undefined,'second property has its own (absent) cadence');
  assert.equal(g.sim.dispatch({type:'mg01Finish',token:r.token}).ok,false,'reloaded game cannot complete the old session');
  const r2=g.sim.dispatch({type:'mg01Start',task:t.id});assert.equal(r2.ok,true);assert.ok(r2.token>r.token,'session tokens never repeat');
  assert.equal(g.sim.dispatch({type:'mg01Finish',token:r2.token}).ok,true);assert.equal(S.objects[L.unit].commercial,'ready');
  const after=await g.prepareLoad(g.rawSaveCode(g.saveJSON()));assert.equal(g.applyLoad(after),true);
  assert.equal(g.sim.s.objects[L.unit].commercial,'ready');assert.ok(!g.sim.s.tasks.some(x=>x.id===t.id));assert.equal(g.sim.s.mg01.done,1);
  assert.equal(g.sim.workRemaining(g.sim.s.staff.find(x=>x.role==='owner')),left-2.5);
  n++;console.log('PASS MG-01 production claim release + single completion '+(code.startsWith('SST1.')?'compressed':'raw'));
  g.sim=sim;g.company={props:[{name:'Maple',sim},{name:'Second',sim:other}],active:0,feed:[]};
}
const legacy=makeMaple(19);legacy.s.speed=0;const json=JSON.stringify(legacy.s);assert.ok(!json.includes('mg01'));
const old=await g.prepareLoad(g.rawSaveCode(json));assert.ok(old.ok,old.msg);assert.equal(g.applyLoad(old),true);
assert.equal(g.sim.s.mg01,undefined);assert.equal(g.sim.s.speed,0);
n++;console.log('PASS MG-01 legacy save without MG-01 fields loads unchanged');
console.log(`${n} MG-01 production save checks passed`);
