import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI} from '../../js/ui.js';
import {Sim} from '../../js/sim.js';
import {UNIT_STATUS,unitStatus} from '../../js/status.js';
const fixture=JSON.parse(Buffer.from(readFileSync(process.argv[2],'utf8').trim().slice(5),'base64').toString());
const sim=new Sim(fixture.props[0].s);sim.ensure();
const ui=Object.create(UI.prototype);ui.g={sim};ui.sel=85;
let n=0;const test=(name,f)=>{f();n++;console.log('PASS '+name);};
test('actual P02 blocked and eligible units have distinct compact readiness labels without state mutation',()=>{
 const before=JSON.stringify(sim.s);
 assert.equal(sim.s.objects[85].cstate,'built');assert.ok(sim.s.objects[85].missing.length);
 assert.match(ui.dockSummary('Unit',''),/Built · not ready/);assert.doesNotMatch(ui.dockSummary('Unit',''),/>Opening</);
 ui.sel=86;assert.equal(sim.s.objects[86].cstate,'ready');assert.match(ui.dockSummary('Unit',''),/Opening automatically/);
 assert.equal(JSON.stringify(sim.s),before);
});
test('each missing prerequisite uses the existing built-not-ready terminology',()=>{
 const original=structuredClone(sim.s.objects[85]);ui.sel=85;
 for(const missing of ['Door needs drive-aisle frontage connected to the gate','Hallway lighting','No power','HVAC capacity exceeded','Freight service test']) {
  Object.assign(sim.s.objects[85],{cstate:'built',missing:[missing]});const before=JSON.stringify(sim.s);
  assert.match(ui.dockSummary('Unit',''),/Built · not ready/);assert.equal(JSON.stringify(sim.s),before);
 }
 Object.assign(sim.s.objects[85],original);
});
test('construction and every operating status keep their existing labels',()=>{
 const original=structuredClone(sim.s.objects[85]);ui.sel=85;
 for(const state of [{cstate:'construction',blocked:false},{cstate:'operating',commercial:'ready',blocked:false},{cstate:'operating',commercial:'occupied',blocked:false},{cstate:'operating',commercial:'reserved',blocked:false},{cstate:'operating',commercial:'unready',blocked:false},{cstate:'operating',blocked:true,accessHold:null},{cstate:'operating',blocked:true,accessHold:123}]) {
  Object.assign(sim.s.objects[85],state);const o=sim.s.objects[85],label=UNIT_STATUS[unitStatus(o)].label,before=JSON.stringify(sim.s);
  assert.ok(ui.dockSummary('Unit','').includes(label),label);assert.equal(JSON.stringify(sim.s),before);
 }
 Object.assign(sim.s.objects[85],original);
});
test('real advancing-time opening still distinguishes the blocked target and updates the eligible summary',()=>{
 ui.sel=85;sim.s.speed=1;sim.step();assert.equal(sim.s.objects[85].cstate,'built');assert.match(ui.dockSummary('Unit',''),/Built · not ready/);
 ui.sel=86;assert.equal(sim.s.objects[86].cstate,'operating');assert.match(ui.dockSummary('Unit',''),/Available/);
});
test('non-unit selection and absent selection keep their normal compact summaries',()=>{
 ui.sel=sim.objs('office')[0].id;assert.match(ui.dockSummary('Office','Covered'),/Covered/);ui.sel=null;assert.match(ui.dockSummary('Property',''),/Property/);
});
console.log(`${n} compact unit-status groups passed; no rendered-browser claim`);
