// Reject historical construction saves and resume current-build saves at every expansion phase.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Sim} from '../../js/sim.js';
import {makeMaple as makeCurrentMaple} from '../../js/maple.js';
import {tickVertical} from '../../js/vertical.js';
import {validateNumbering} from '../../js/unitnumbering.js';
import {readFileSync} from 'node:fs';
import {fmtTime} from '../../js/sim.js';
import {MARKETS,MIN_PER_DAY,ROLES} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
const source=readFileSync('js/main.js','utf8');
const funcs=source.slice(source.indexOf('function validState('),source.indexOf('function makeMapleSeedPrice('));
const methods=source.slice(source.indexOf('  rawSaveCode('),source.indexOf('  applyLoad('));
const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');
const root=process.argv[2];if(!root)throw Error('Pass the unchanged 9700d9d parent checkout');
const {makeMaple}=await import(pathToFileURL(resolve(root,'js/maple.js')));
const oldVertical=await import(pathToFileURL(resolve(root,'js/vertical.js')));
const clone=s=>JSON.parse(JSON.stringify(s));
function startExpansion(factory) {
 const sim = factory(9711);
 sim.s.cash = 1000000;
 sim.s.open = false;
 const quote = sim.verticalPlan(sim.objs('shell')[0].id);
 assert.ok(sim.dispatch({type:'verticalUpgrade', ...quote}).ok);
 return sim;
}
function tick(sim,o,fn){sim.s.t++;fn(sim,o);sim.ensure();for(const el of sim.objs('elevator'))sim.updateElevator(el);}
const legacy = startExpansion(makeMaple);
const legacyOrder = legacy.s.orders.at(-1), rejected = new Set();
for (let i = 0; i < 50000 && legacyOrder.st === 'construction'; i++) {
 const phase = legacyOrder.vertical.phase;
 if (!rejected.has(phase)) {
  const result = await api.prepareLoad(await api.saveCode(JSON.stringify(legacy.s)));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'save-generation');
  rejected.add(phase);
 }
 tick(legacy, legacyOrder, oldVertical.tickVertical);
}
assert.deepEqual([...rejected], [0,1,2,3,4]);

const current = startExpansion(makeCurrentMaple);
const ord = current.s.orders.at(-1), seen = new Set();
for(let i=0;i<50000&&ord.st==='construction';i++){
 if(!seen.has(ord.vertical.phase)){
  seen.add(ord.vertical.phase);const state=clone(current.s);
  const prep=await api.prepareLoad(await api.saveCode(JSON.stringify(state)));assert.ok(prep.ok,prep.msg);
  const sim=prep.company.props[0].sim,loaded=sim.s.orders.at(-1);
  assert.equal(sim.s.cash,state.cash);assert.equal(sim.s.rngS,state.rngS);assert.equal(sim.s.t,state.t);assert.deepEqual(sim.s.leases,state.leases);
  assert.deepEqual(Object.keys(sim.s.objects),Object.keys(state.objects));
  // Ordinary construction on the same floor cannot consume the pending order's reserved numbers.
  const reserved=loaded.vertical.creates.filter(o=>o.type==='unit').map(o=>o.unitNumber).filter(Number.isInteger);
  if(reserved.length)assert.ok(sim.s.unitNumbering.next[1]>Math.max(...reserved));
  for(let j=0;j<50000&&loaded.st==='construction';j++)tick(sim,loaded,tickVertical);
  assert.equal(loaded.st,'done');assert.equal(sim.s.cash,state.cash);assert.ok(validateNumbering(sim.s));
  for(const id of loaded.vertical.ids){const o=sim.s.objects[id];if(o?.type==='unit')assert.ok(o.num>=2001&&o.num<=2999);}
  const resave=await api.prepareLoad(await api.saveCode(JSON.stringify(sim.s)));assert.ok(resave.ok);const again=resave.company.props[0].sim;assert.deepEqual(again.s.unitNumbering,sim.s.unitNumbering);
  console.log('PASS reload current expansion phase',state.orders.at(-1).vertical.phase,'then complete without recharging or changing existing IDs/leases');
 }
 tick(current,ord,tickVertical);
}
assert.deepEqual([...seen],[0,1,2,3,4]);
