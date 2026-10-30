import {runHistorical} from './historical_gate_contract.mjs';
await runHistorical('tgate_stage2a','a30d1465ca1d501cb7f54f3687d0db836081feae');
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,MIN_PER_DAY,ROLES} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {gateStatus} from '../../js/gateaccess.js';

const clone=x=>structuredClone(x);
let groups=0;async function test(name,fn){await fn();groups++;console.log('PASS '+name);}
function withTrip({staleQueue=false,staleServing=false}={}){
 const sim=makeMaple();sim.s.speed=0;sim.s.convos=[];
 sim.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});
 const ag=sim.s.agents.find(a=>a.kind==='cust'), gate=sim.objs('gate')[0];assert.ok(ag&&gate);
 ag.st='gateq';delete ag.gateId;
 const s=clone(sim.s);delete s.gateAccess;s.gateQ=[ag.id,...(staleQueue?[999999]:[])];
 const g=s.objects[gate.id];g.serving=staleServing?999998:ag.id;
 return {s,agentId:ag.id,gateId:gate.id};
}
function migrated(f){return new Sim(clone(f.s));}

await test('legacy single gate migrates to stable collection and saved front-street connection metadata',()=>{
 const f=withTrip(),sim=migrated(f),A=sim.s.gateAccess;
 assert.equal(A.v,1);assert.deepEqual(A.gateIds,[f.gateId]);assert.equal(A.connections[f.gateId].kind,'front-street');assert.equal(A.connections[f.gateId].gateId,f.gateId);
 assert.equal(Object.hasOwn(sim.s,'gateQ'),false);assert.equal(Object.hasOwn(sim.s.objects[f.gateId],'serving'),false);
});

await test('legacy queue, serving and trip ownership migrate once without duplicate or stale IDs',()=>{
 const f=withTrip({staleQueue:true}),sim=migrated(f),A=sim.s.gateAccess;
 assert.deepEqual(A.queues[f.gateId],[f.agentId]);assert.equal(A.serving[f.gateId],f.agentId);assert.equal(sim.s.agents.find(a=>a.id===f.agentId).gateId,f.gateId);
 assert.equal(new Set(A.queues[f.gateId]).size,A.queues[f.gateId].length);assert.ok(A.migration.issues.some(x=>x.code==='stale-queue-agent'&&x.agentId===999999));
 const again=new Sim(clone(sim.s));assert.deepEqual(again.s.gateAccess,A);assert.equal(Object.hasOwn(again.s,'gateQ'),false);
});

await test('stale serving ownership is rejected and recorded rather than attached to a missing agent',()=>{
 const f=withTrip({staleServing:true}),sim=migrated(f),A=sim.s.gateAccess;
 assert.equal(A.serving[f.gateId],null);assert.ok(A.migration.issues.some(x=>x.code==='stale-serving-agent'&&x.agentId===999998));
});

await test('gate state classifies pending, failed and operating without changing one-gate routing',()=>{
 const sim=makeMaple(),g=sim.objs('gate')[0];assert.equal(gateStatus(sim.s,g),'operating');
 g.cstate='construction';assert.equal(gateStatus(sim.s,g),'pending');g.cstate='operating';g.cond=.1;assert.equal(gateStatus(sim.s,g),'failed');g.cond=1;g.unpowered=true;assert.equal(gateStatus(sim.s,g),'failed');delete g.unpowered;assert.equal(gateStatus(sim.s,g),'operating');
});

await test('current second-gate preview permits placement without registration',()=>{
 const sim=makeMaple(),g=sim.objs('gate')[0],p=sim.s.parcel;
 const before=JSON.stringify(sim.s);const R=sim.plan({tool:'gate',a:{x:g.x+4,y:p.y1},b:{x:g.x+4,y:p.y1},f:0});assert.notEqual(R.status,'invalid');assert.equal(JSON.stringify(sim.s),before,'preview leaves complete state unchanged');assert.deepEqual(sim.s.gateAccess.gateIds,[g.id]);
});

// Real main.js raw/compressed codecs + prepareLoad path, without touching browser storage.
const main=readFileSync('js/main.js','utf8');
const funcs=main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice('));
const methods=main.slice(main.indexOf('  rawSaveCode('),main.indexOf('  applyLoad('));
const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');

await test('legacy raw and compressed saves migrate through real prepareLoad and preserve cash, clock, RNG and Pause',async()=>{
 for(const compressed of [false,true]){
  const f=withTrip({staleQueue:true}),before=clone(f.s),json=JSON.stringify(f.s),code=compressed?await api.saveCode(json):api.rawSaveCode(json),P=await api.prepareLoad(code);assert.ok(P.ok,P.msg);
  const sim=P.company.props[0].sim;assert.equal(sim.s.cash,before.cash);assert.equal(sim.s.t,before.t);assert.equal(sim.s.rngS,before.rngS);assert.equal(sim.s.speed,0);assert.deepEqual(sim.s.gateAccess.gateIds,[f.gateId]);assert.deepEqual(sim.gateQueue(f.gateId),[f.agentId]);
 }
});

await test('new-format raw and compressed save reload retains authoritative gate state exactly',async()=>{
 const f=withTrip({staleQueue:true}),base=migrated(f),expected=clone(base.s.gateAccess);
 for(const code of [api.rawSaveCode(JSON.stringify(base.s)),await api.saveCode(JSON.stringify(base.s))]){
  const P=await api.prepareLoad(code);assert.ok(P.ok,P.msg);const sim=P.company.props[0].sim;assert.deepEqual(sim.s.gateAccess,expected);assert.equal(Object.hasOwn(sim.s,'gateQ'),false);assert.equal(Object.hasOwn(sim.s.objects[f.gateId],'serving'),false);
 }
});

await test('legacy migration and new-format continuation are deterministic with one queue owner and no duplicate trip',()=>{
 const f=withTrip(),legacy=migrated(f),saved=new Sim(clone(legacy.s));legacy.s.speed=1;saved.s.speed=1;
 for(let i=0;i<180;i++){legacy.step();saved.step();legacy.events.length=0;saved.events.length=0;}
 assert.deepEqual(legacy.s,saved.s);const A=legacy.s.gateAccess;for(const id of A.gateIds){const q=A.queues[id];assert.equal(q.length,new Set(q).size);const serving=A.serving[id];if(serving!=null)assert.ok(q.includes(serving));}
 const tripIds=legacy.s.agents.filter(a=>a.kind==='cust'&&a.gateId!=null).map(a=>a.id);assert.equal(tripIds.length,new Set(tripIds).size);
});

console.log(`${groups} gate Stage 2A migration/state-integrity groups passed`);
