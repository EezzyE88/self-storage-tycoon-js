// Cedar Creek (Comeback record v2) through the production save paths: newGame, raw and
// compressed save codes, prepareLoad/applyLoad, autosave and Continue's loader, under a
// localStorage double. Manual Pause is checked at start and after every load.
// No browser/device acceptance is implied.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {comebackProgress} from '../../js/comeback.js';
import {CEDAR_LAYOUT,CEDAR_SITE,CEDAR_TARGETS} from '../../js/cedarcreek.js';
const memory=new Map();globalThis.window={localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)}};
const {localsave}=await import('../../js/localsave.js');const {savearchive}=await import('../../js/savearchive.js');
const main=readFileSync('js/main.js','utf8');
const ctx=vm.createContext({Sim,makeScenario,SCENARIOS,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'cedar-save-test'},localsave,savearchive,cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,setTimeout,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
const g=ctx.game;g.ui={title:false,scMin:true};g.rend={view:'ext'};g.attach=function(sim){this.sim=sim;};
g.newGame('sc:comeback');
assert.equal(g.sim.s.speed,0,'new Cedar game starts paused');assert.equal(g.company.props[0].name,'Cedar Creek Storage Yard');
assert.equal(g.sim.s.layout,CEDAR_LAYOUT);assert.equal(g.sim.s.scenario.v,2);assert.equal(g.sim.s.scenario.site,CEDAR_SITE);
// Existing behavior (not Cedar): the load sanitizer (main.js sanitize) turns ASCII apostrophes in
// saved text into typographic ones, e.g. the shopper line "I'll keep shopping.". Each checkpoint
// first passes the running game through one load so later loads can be compared byte for byte.
let n=0;async function roundtrip(label){
 {const prep=await g.prepareLoad(g.rawSaveCode(g.saveJSON()));assert.equal(prep.ok,true,label+' normalize');assert.equal(g.applyLoad(prep),true);}
 const before=JSON.stringify(g.sim.s),cash=g.sim.s.cash,speed=g.sim.s.speed;
 for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){
  const prep=await g.prepareLoad(code);assert.equal(prep.ok,true,label);assert.equal(JSON.stringify(g.sim.s),before,'prepareLoad mutated running property');
  assert.equal(g.applyLoad(prep),true);assert.equal(JSON.stringify(g.sim.s),before,label+' state');assert.equal(g.sim.s.cash,cash,label+' cash');assert.equal(g.sim.s.speed,speed,label+' pause state');
 }
 assert.ok(await g.autosave(false));const rec=localsave.get().main;assert.ok(rec);g.sim.s.cash+=7;assert.equal(await g.loadCode(rec.code),true);assert.equal(g.sim.s.cash,cash);assert.equal(JSON.stringify(g.sim.s),before,label+' Continue loader');
 assert.equal(g.sim.s.layout,CEDAR_LAYOUT,label+' layout');n++;console.log('PASS '+label+': raw, compressed, autosave and Continue loader preserve state and Pause');
}
await roundtrip('before work (paused)');
const sim=()=>g.sim,s=()=>g.sim.s;
// Both aprons ordered and a Porter on make-ready: the ordinary production commands.
for(const t of CEDAR_TARGETS.filter(t=>t.apron)){const xs=t.apron.map(a=>a[0]);assert.ok(sim().dispatch({type:'build',tool:'aisle',a:{x:Math.min(...xs),y:t.apron[0][1]},b:{x:Math.max(...xs),y:t.apron[0][1]},f:0}).ok);}
assert.ok(sim().dispatch({type:'hire',role:'porter'}).ok);
for(let i=0;i<600;i++){sim().step();sim().events.length=0;}
await roundtrip('active restoration');
for(let i=0;i<60*1440&&s().scenario.status==='active';i++){
 if(sim().mod===540) for(const c of [...s().convos]) if(c.actions?.length) sim().dispatch({type:'convo',id:c.id,i:0});
 sim().step();sim().events.length=0;
}
assert.equal(s().scenario.status,'won','Cedar wins within 60 days with a Porter');const p=comebackProgress(sim());assert.equal(p.restored,6);assert.ok(p.leased>=s().scenario.leaseGoal);
await roundtrip('won');
assert.ok(sim().dispatch({type:'comebackAck'}).ok);await roundtrip('acknowledged win');sim().poll();assert.equal(sim().events.some(e=>e.type==='scenario_end'),false,'no repeated win after load');assert.equal(s().scenario.acknowledged,true);
const stateOf=j=>j&&j.company?j.props[j.active??0].s:j;
// A v2 record whose site does not match is retained with a notice, not silently rebuilt.
const damaged=JSON.parse(g.saveJSON());stateOf(damaged).scenario.targets[0].x=99;const cash=s().cash;assert.ok(await g.loadCode(g.rawSaveCode(JSON.stringify(damaged))));assert.equal(s().scenario.status,'unavailable');assert.equal(s().cash,cash);assert.ok(s().scenario.notice);
// An unknown layout id is refused and the running game is unchanged.
const before=JSON.stringify(s()),bad=JSON.parse(g.saveJSON());stateOf(bad).layout='cedar-creek-office-v9';const prep=await g.prepareLoad(g.rawSaveCode(JSON.stringify(bad)));assert.equal(prep.ok,false);assert.equal(prep.reason,'unknown-layout');assert.equal(JSON.stringify(s()),before);
console.log(`${n} Cedar production save checkpoints passed; mismatched site retains property with notice; unknown layout refused`);
