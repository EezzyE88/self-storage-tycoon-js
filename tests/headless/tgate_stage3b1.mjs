import {runHistorical} from './historical_gate_contract.mjs';
await runHistorical('tgate_stage3b1','c98b91673ce855a556c9c790ec86de98bd62a469');
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
function gateqAgent(sim,gate){sim.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});const ag=sim.s.agents.filter(a=>a.kind==='cust').at(-1),v=sim.vehAt(ag.veh);ag.gateId=gate.id;ag.st='gateq';ag.exp.gate=0;ag.gateT=1;ag.gateFail=false;v.x=gate.x+.5;v.y=sim.s.parcel.y1+1.5;v.path=null;v.pi=0;v.moving=false;enqueueGate(sim.s,gate.id,ag.id);return ag;}

await test('each gate opens from only its own serving/sensor lifecycle',()=>{const sim=fixture(),g1=sim.objs('gate')[0],g2=addGate(sim,34);setGateServing(sim.s,g1.id,101);sim.updateGate();assert.equal(g1.open,.25);assert.equal(g2.open,0);setGateServing(sim.s,g1.id,null);setGateServing(sim.s,g2.id,202);sim.updateGate();assert.equal(g2.open,.25);assert.ok(Math.abs(g1.open-.05)<1e-9);});

await test('two gate queues and serving slots are consumed independently',()=>{const sim=fixture(),g1=sim.objs('gate')[0],g2=addGate(sim,34),a1=gateqAgent(sim,g1),a2=gateqAgent(sim,g2);assert.deepEqual(gateQueue(sim.s,g1.id),[a1.id]);assert.deepEqual(gateQueue(sim.s,g2.id),[a2.id]);sim.updateCustomer(a1);a1.gateT=1;sim.updateCustomer(a1);assert.equal(gateQueue(sim.s,g1.id).includes(a1.id),false);assert.equal(gateQueue(sim.s,g2.id).includes(a2.id),true);assert.equal(gateServing(sim.s,g2.id),null);sim.updateCustomer(a2);a2.gateT=1;sim.updateCustomer(a2);assert.equal(gateQueue(sim.s,g2.id).includes(a2.id),false);});

await test('failed retained gate with incompatible alternate cannot consume or stall healthy gate service',()=>{const sim=fixture(),g1=sim.objs('gate')[0],g2=addGate(sim,34);g1.cond=.1;const bad=gateqAgent(sim,g1),good=gateqAgent(sim,g2);const canServe=sim.gateCanServeVisit.bind(sim);sim.gateCanServeVisit=(id,v)=>id===g2.id&&v.kind==='shopper'?false:canServe(id,v);sim.updateCustomer(bad);bad.gateT=1;bad.gateFail=true;sim.updateCustomer(good);good.gateT=1;sim.updateCustomer(good);assert.equal(gateQueue(sim.s,g2.id).includes(good.id),false);assert.equal(gateQueue(sim.s,g1.id).includes(bad.id),true);sim.updateCustomer(bad);assert.equal(bad.gateCalled,true);assert.equal(gateQueue(sim.s,g2.id).length,0);});


await test('missing retained gate never falls back into the primary gate lifecycle',()=>{const sim=fixture(),g1=sim.objs('gate')[0],g2=addGate(sim,34),a=gateqAgent(sim,g2);const primaryQ=[...gateQueue(sim.s,g1.id)],primaryServing=gateServing(sim.s,g1.id);delete sim.s.objects[g2.id];sim.markDirty();sim.rebuild();sim.updateCustomer(a);assert.equal(a.failed,true);assert.deepEqual(gateQueue(sim.s,g1.id),primaryQ);assert.equal(gateServing(sim.s,g1.id),primaryServing);});

const main=readFileSync('js/main.js','utf8');const funcs=main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice('));const methods=main.slice(main.indexOf('  rawSaveCode('),main.indexOf('  applyLoad('));const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');
await test('two in-flight gate owners survive production raw/compressed save reload',async()=>{const sim=fixture(),g1=sim.objs('gate')[0],g2=addGate(sim,34),a1=gateqAgent(sim,g1),a2=gateqAgent(sim,g2);setGateServing(sim.s,g1.id,a1.id);a1.gateT=7;setGateServing(sim.s,g2.id,a2.id);a2.gateT=11;const expected=JSON.parse(JSON.stringify(sim.s));for(const code of [api.rawSaveCode(JSON.stringify(expected)),await api.saveCode(JSON.stringify(expected))]){const P=await api.prepareLoad(code);assert.ok(P.ok,P.msg);const loaded=P.company.props[0].sim;assert.deepEqual(loaded.s.gateAccess.queues,expected.gateAccess.queues);assert.deepEqual(loaded.s.gateAccess.serving,expected.gateAccess.serving);for(const a of [a1,a2])assert.equal(loaded.s.agents.find(x=>x.id===a.id).gateId,a.gateId);const control=new Sim(clone(expected));loaded.updateGate();control.updateGate();assert.deepEqual(loaded.s,control.s);}});

await test('ordinary one-gate gateq service keeps existing primary lifecycle',()=>{const sim=fixture(),g=sim.objs('gate')[0],a=gateqAgent(sim,g);sim.updateCustomer(a);a.gateT=1;sim.updateCustomer(a);assert.equal(gateQueue(sim.s,g.id).includes(a.id),false);assert.equal(gateServing(sim.s,g.id),null);});

console.log(`${groups} gate Stage 3B-1 lifecycle-isolation groups passed`);
