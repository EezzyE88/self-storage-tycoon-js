import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {G,MARKETS,MIN_PER_DAY,ROLES} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {registerGateAccess,enqueueGate,setGateServing,gateQueue,gateServing} from '../../js/gateaccess.js';

const clone=x=>structuredClone(x);
let groups=0; async function test(name,fn){await fn();groups++;console.log('PASS '+name);}
function fixture(){const sim=makeMaple();sim.s.speed=0;sim.s.convos=[];return sim;}
function addGate(sim,x,{cond=1}={}){const p=sim.s.parcel,primary=sim.objs('gate')[0];for(let y=p.y1-1;y<=p.y1+1;y++)for(let xx=x-1;xx<=x+1;xx++)sim.s.ground[sim.idx(xx,y)]=G.ASPHALT;for(let xx=Math.min(primary.x,x);xx<=Math.max(primary.x,x);xx++)sim.s.ground[sim.idx(xx,p.y1-1)]=G.ASPHALT;const g={id:sim.id(),type:'gate',x,y:p.y1,f:0,cstate:'operating',cond,open:0,unpowered:false};sim.s.objects[g.id]=g;registerGateAccess(sim.s,g);sim.markDirty();sim.rebuild();return g;}
function gateqAgent(sim,gate,{kind='shopper'}={}){sim.startVisit({kind,size:'5x5',climate:false,keen:.6});const ag=sim.s.agents.filter(a=>a.kind==='cust').at(-1),v=sim.vehAt(ag.veh);ag.gateId=gate.id;ag.st='gateq';ag.exp.gate=0;ag.gateT=0;ag.gateFail=false;delete ag.gateRerouted;v.x=gate.x+.5;v.y=sim.s.parcel.y1+1.5;v.path=null;v.pi=0;v.moving=false;enqueueGate(sim.s,gate.id,ag.id);return ag;}
function countInQueues(sim,id){return sim.s.gateAccess.gateIds.reduce((n,gid)=>n+gateQueue(sim.s,gid).filter(x=>x===id).length,0);}
function runRoute(sim,ag,limit=300){for(let i=0;i<limit&&ag.st==='gateroute';i++)sim.updateCustomer(ag);assert.notEqual(ag.st,'gateroute','reroute vehicle reaches alternate gate');}

await test('failed Gate A queued customer reassigns exactly once to healthy Gate B',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);a.cond=.1;const ag=gateqAgent(sim,a),veh=sim.vehAt(ag.veh),before={rng:sim.s.rngS,cash:sim.s.cash,t:sim.s.t,speed:sim.s.speed};sim.updateCustomer(ag);assert.equal(ag.gateId,b.id);assert.equal(ag.gateRerouted,true);assert.equal(ag.st,'gateroute');assert.deepEqual(gateQueue(sim.s,a.id),[]);assert.deepEqual(gateQueue(sim.s,b.id),[ag.id]);assert.equal(countInQueues(sim,ag.id),1);assert.deepEqual({rng:sim.s.rngS,cash:sim.s.cash,t:sim.s.t,speed:sim.s.speed},before);const firstPath=[...veh.path];sim.updateCustomer(ag);assert.equal(ag.gateId,b.id);assert.equal(countInQueues(sim,ag.id),1);assert.deepEqual(veh.path,firstPath);runRoute(sim,ag);assert.equal(ag.st,'gateq');});

await test('failed Gate B queued customer reassigns exactly once to healthy Gate A',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);b.cond=.1;const ag=gateqAgent(sim,b);sim.updateCustomer(ag);assert.equal(ag.gateId,a.id);assert.equal(ag.gateRerouted,true);assert.deepEqual(gateQueue(sim.s,b.id),[]);assert.deepEqual(gateQueue(sim.s,a.id),[ag.id]);assert.equal(countInQueues(sim,ag.id),1);runRoute(sim,ag);assert.equal(ag.st,'gateq');});

await test('single failed gate preserves accepted Stage 3B-1 failure lifecycle',()=>{const sim=fixture(),g=sim.objs('gate')[0];g.cond=.1;const ag=gateqAgent(sim,g);sim.updateCustomer(ag);assert.equal(ag.gateId,g.id);assert.equal(ag.gateRerouted,undefined);assert.equal(ag.st,'gateq');assert.equal(gateServing(sim.s,g.id),ag.id);assert.equal(ag.gateFail,true);assert.deepEqual(gateQueue(sim.s,g.id),[ag.id]);});

await test('incompatible healthy alternate does not receive queued customer',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);a.cond=.1;const ag=gateqAgent(sim,a),real=sim.gateCanServeVisit.bind(sim);sim.gateCanServeVisit=(id,v)=>id===b.id?false:real(id,v);sim.updateCustomer(ag);assert.equal(ag.gateId,a.id);assert.equal(ag.gateRerouted,undefined);assert.deepEqual(gateQueue(sim.s,b.id),[]);assert.equal(gateServing(sim.s,a.id),ag.id);});

await test('currently served customer is never migrated from failed gate',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);a.cond=.1;const ag=gateqAgent(sim,a);setGateServing(sim.s,a.id,ag.id);ag.gateT=8;ag.gateFail=true;sim.updateCustomer(ag);assert.equal(ag.gateId,a.id);assert.equal(ag.gateRerouted,undefined);assert.equal(gateServing(sim.s,a.id),ag.id);assert.deepEqual(gateQueue(sim.s,b.id),[]);});

await test('in-property and departure states are rejected by the reassignment operation',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);a.cond=.1;const ag=gateqAgent(sim,a),veh=sim.vehAt(ag.veh);for(const st of ['drive','leave']){ag.st=st;assert.equal(sim.reassignFailedQueuedGate(ag,veh,a),false);assert.equal(ag.gateId,a.id);assert.deepEqual(gateQueue(sim.s,b.id),[]);}ag.st='gateq';});

const main=readFileSync('js/main.js','utf8');const funcs=main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice('));const methods=main.slice(main.indexOf('  rawSaveCode('),main.indexOf('  applyLoad('));const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');
await test('save reload preserves migrated queued ownership and deterministic continuation',async()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);a.cond=.1;const ag=gateqAgent(sim,a);sim.updateCustomer(ag);assert.equal(ag.gateId,b.id);assert.equal(ag.st,'gateroute');const expected=JSON.parse(JSON.stringify(sim.s));for(const code of [api.rawSaveCode(JSON.stringify(expected)),await api.saveCode(JSON.stringify(expected))]){const P=await api.prepareLoad(code);assert.ok(P.ok,P.msg);const loaded=P.company.props[0].sim,la=loaded.s.agents.find(x=>x.id===ag.id);assert.equal(la.gateId,b.id);assert.equal(la.gateRerouted,true);assert.equal(la.st,'gateroute');assert.deepEqual(loaded.s.gateAccess.queues,expected.gateAccess.queues);assert.equal(countInQueues(loaded,ag.id),1);const control=new Sim(clone(expected)),ca=control.s.agents.find(x=>x.id===ag.id);for(let i=0;i<8;i++){loaded.updateCustomer(la);control.updateCustomer(ca);}assert.deepEqual(loaded.s,control.s);}});

await test('migration preserves Pause, time, RNG and cash while avoiding duplicate queue ownership',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);a.cond=.1;const ag=gateqAgent(sim,a),before={speed:sim.s.speed,t:sim.s.t,rngS:sim.s.rngS,cash:sim.s.cash};for(let i=0;i<5;i++){sim.updateCustomer(ag);assert.equal(countInQueues(sim,ag.id),1);}assert.deepEqual({speed:sim.s.speed,t:sim.s.t,rngS:sim.s.rngS,cash:sim.s.cash},before);assert.equal(ag.gateId,b.id);});


await test('Stage 3B-1 independent gate opening remains isolated',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34);setGateServing(sim.s,a.id,101);sim.updateGate();assert.equal(a.open,.25);assert.equal(b.open,0);setGateServing(sim.s,a.id,null);setGateServing(sim.s,b.id,202);sim.updateGate();assert.equal(b.open,.25);assert.ok(Math.abs(a.open-.05)<1e-9);});

await test('Stage 3B-1 healthy two-gate queues and serving remain independent',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34),a1=gateqAgent(sim,a),a2=gateqAgent(sim,b);assert.deepEqual(gateQueue(sim.s,a.id),[a1.id]);assert.deepEqual(gateQueue(sim.s,b.id),[a2.id]);sim.updateCustomer(a1);a1.gateT=1;sim.updateCustomer(a1);assert.equal(gateQueue(sim.s,a.id).includes(a1.id),false);assert.equal(gateQueue(sim.s,b.id).includes(a2.id),true);assert.equal(gateServing(sim.s,b.id),null);sim.updateCustomer(a2);a2.gateT=1;sim.updateCustomer(a2);assert.equal(gateQueue(sim.s,b.id).includes(a2.id),false);});

await test('Stage 3B-1 missing retained gate still never falls back to primary',()=>{const sim=fixture(),a=sim.objs('gate')[0],b=addGate(sim,34),ag=gateqAgent(sim,b);const primaryQ=[...gateQueue(sim.s,a.id)],primaryServing=gateServing(sim.s,a.id);delete sim.s.objects[b.id];sim.markDirty();sim.rebuild();sim.updateCustomer(ag);assert.equal(ag.failed,true);assert.deepEqual(gateQueue(sim.s,a.id),primaryQ);assert.equal(gateServing(sim.s,a.id),primaryServing);});

console.log(`${groups} gate Stage 3B-2A pre-service reroute groups passed`);
