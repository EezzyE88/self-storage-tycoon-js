// Scenario goal rules survive save/reload. The loader strips '<' from saved text, which used to flip
// Go Vertical's "Average elevator wait under 10 min" into "at least 10 min" after any reload.
// Production saveJSON/prepareLoad run in a vm, as in tcandidate22.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};

function harness(sim){
  const main=readFileSync('js/main.js','utf8');
  const context=vm.createContext({Sim,SCENARIOS,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:false},savearchive:{},cloud:{ok:false},
    CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);
  const g=context.game;g.sim=sim;g.company={props:[{name:sim.s.scenario?.name||'Lot',sim}],active:0,feed:[]};return g;
}
const elev=s=>s.scenario.goals.find(x=>x.k==='elevWait');
const reload=async g=>{const p=await g.prepareLoad(await g.saveCode());assert.equal(p.ok,true);return p.company.props[p.company.active].sim;};

await test('Go Vertical keeps "under 10 min" through save and reload, and the goal still judges the same way',async()=>{
  const sim=makeScenario('vertical',4401);assert.equal(elev(sim.s).cmp,'<');
  let loaded=await reload(harness(sim));
  for(let i=0;i<3;i++){assert.equal(elev(loaded.s).cmp,'<');loaded=await reload(harness(loaded));}
  const g=elev(loaded.s);loaded.metric=k=>k==='elevWait'?4:0;assert.equal(loaded.goalMet(g),true,'a 4-minute wait meets "under 10"');
  loaded.metric=k=>k==='elevWait'?14:0;assert.equal(loaded.goalMet(g),false,'a 14-minute wait does not');
  assert.equal(loaded.s.scenario.status,'active');assert.equal(JSON.stringify(loaded.s.scenario.goals.map(x=>x.v)),JSON.stringify(SCENARIOS.vertical.goals.map(x=>x.v)));
});
await test('saves already damaged by an earlier reload are repaired on load',async()=>{
  const sim=makeScenario('vertical',7);elev(sim.s).cmp='';const loaded=await reload(harness(sim));assert.equal(elev(loaded.s).cmp,'<');
});
await test('every scenario keeps exactly its defined goal rules; non-scenario saves are untouched',async()=>{
  for(const id of Object.keys(SCENARIOS)){const sim=makeScenario(id,11);if(!sim.s.scenario?.goals)continue;const loaded=await reload(harness(sim));
    assert.equal(JSON.stringify(loaded.s.scenario.goals.map(x=>x.cmp??null)),JSON.stringify(SCENARIOS[id].goals.map(x=>x.cmp??null)),id);}
  const maple=makeMaple(3);const loaded=await reload(harness(maple));assert.equal(loaded.s.scenario,maple.s.scenario);
});
console.log(`${n} scenario rule save checks passed`);
