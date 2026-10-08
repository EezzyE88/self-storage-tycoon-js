// Production save export, autosave storage, prepareLoad and Continue's loader under a localStorage double.
// No browser/device acceptance is implied.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {comebackProgress} from '../../js/comeback.js';
const memory=new Map();globalThis.window={localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)}};
const {localsave}=await import('../../js/localsave.js');const {savearchive}=await import('../../js/savearchive.js');
const main=readFileSync('js/main.js','utf8');
const ctx=vm.createContext({Sim,makeScenario,SCENARIOS,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'comeback-save-test'},localsave,savearchive,cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,setTimeout,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
const g=ctx.game;g.ui={title:false,scMin:true};g.rend={view:'ext'};g.attach=function(sim){this.sim=sim;};g.newGame('sc:comeback');assert.equal(g.sim.s.speed,0);assert.equal(g.ui.scMin,false);assert.equal(g.company.props[0].name,'The Comeback Yard');
let n=0;async function roundtrip(label){
 const before=JSON.stringify(g.sim.s),cash=g.sim.s.cash;
 for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){
  const prep=await g.prepareLoad(code);assert.equal(prep.ok,true,label);assert.equal(JSON.stringify(g.sim.s),before,'prepareLoad mutated running property');assert.equal(g.applyLoad(prep),true);assert.equal(JSON.stringify(g.sim.s),before,label+' state');assert.equal(g.sim.s.cash,cash,label+' cash');
 }
 assert.ok(await g.autosave(false));const rec=localsave.get().main;assert.ok(rec);g.sim.s.cash+=7;assert.equal(await g.loadCode(rec.code),true);assert.equal(g.sim.s.cash,cash);assert.equal(JSON.stringify(g.sim.s),before,label+' Continue loader');n++;console.log('PASS '+label+': raw, compressed, autosave and Continue loader preserve state');
}
await roundtrip('before work');
assert.ok(g.sim.dispatch({type:'hire',role:'porter'}).ok);assert.ok(g.sim.dispatch({type:'delegateTask',task:g.sim.s.tasks[0].id}).ok);for(let i=0;i<80;i++)g.sim.step();await roundtrip('active staff job');
for(let i=0;i<6000&&g.sim.s.scenario.status==='active';i++){const t=g.sim.s.tasks.find(t=>!t.assigned&&g.sim.s.scenario.targets.some(x=>x.ids.includes(t.obj)));if(t)g.sim.dispatch({type:'delegateTask',task:t.id});g.sim.step();}
assert.equal(g.sim.s.scenario.status,'won');assert.equal(comebackProgress(g.sim).restored,6);await roundtrip('completed rescue');
assert.ok(g.sim.dispatch({type:'comebackAck'}).ok);await roundtrip('acknowledged rescue');g.sim.poll();assert.equal(g.sim.events.some(e=>e.type==='scenario_end'),false);assert.equal(g.sim.s.scenario.acknowledged,true);
const damaged=JSON.parse(g.saveJSON());damaged.scenario.targets=null;const cash=g.sim.s.cash;assert.ok(await g.loadCode(g.rawSaveCode(JSON.stringify(damaged))));assert.equal(g.sim.s.scenario.status,'unavailable');assert.equal(g.sim.s.cash,cash);assert.ok(g.sim.s.scenario.notice);
console.log(`${n} production save checkpoints passed; malformed progress retains property with notice`);
