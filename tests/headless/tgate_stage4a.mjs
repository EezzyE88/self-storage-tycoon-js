import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {G,TOOLS,MARKETS,MIN_PER_DAY,ROLES} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {enqueueGate} from '../../js/gateaccess.js';

const clone=x=>structuredClone(x);
const action=(x,y)=>({tool:'gate',a:{x,y},b:{x,y},f:0});
const state=x=>JSON.stringify(x.s);
let groups=0; async function test(name,fn){await fn();groups++;console.log('PASS '+name);}
function fixture(){const sim=makeMaple();sim.s.speed=0;sim.s.convos=[];return sim;}
function prepareSecond(sim,x=34){const p=sim.s.parcel;for(let xx=x-1;xx<=x+1;xx++)sim.s.ground[sim.idx(xx,p.y1-1)]=G.ASPHALT;sim.markDirty();sim.rebuild();return {x,y:p.y1};}
function buildSecond(sim,x=34){const pos=prepareSecond(sim,x),quote=sim.plan(action(pos.x,pos.y));assert.equal(quote.status,'valid');const before=sim.s.cash,r=sim.dispatch({type:'build',...action(pos.x,pos.y)});assert.ok(r.ok,r.msg);const order=sim.s.orders.find(o=>o.id===r.order),gate=sim.s.objects[order.objs.find(id=>sim.s.objects[id]?.type==='gate')];return {pos,quote,before,r,order,gate};}

await test('second gate preview is valid, pure and reuses established gate price/timing',()=>{
 const sim=fixture(),{x,y}=prepareSecond(sim),before=state(sim),rng=sim.s.rngS,cash=sim.s.cash,speed=sim.s.speed;
 for(let i=0;i<4;i++){const q=sim.plan(action(x,y));assert.equal(q.status,'valid');assert.equal(q.cost,TOOLS.gate.cost);assert.equal(q.dur,480);assert.equal(q.count,1);}
 assert.equal(state(sim),before);assert.equal(sim.s.rngS,rng);assert.equal(sim.s.cash,cash);assert.equal(sim.s.speed,speed);
});

await test('frontage, corner, overlap and third-gate rules reject without state changes',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0];
 for(const [x,y,reason] of [[34,p.y1-1,/front fence/i],[p.x0,p.y1,/corner/i],[g1.x,p.y1,/overlaps/i]]){
  const before=state(sim),rng=sim.s.rngS,q=sim.plan(action(x,y));assert.equal(q.status,'invalid');assert.match(q.reasons.join(' '),reason);assert.equal(state(sim),before);assert.equal(sim.s.rngS,rng);
 }
 const built=buildSecond(sim);assert.equal(sim.objs('gate').length,2);
 const before=state(sim),rng=sim.s.rngS,q3=sim.plan(action(24,p.y1));assert.equal(q3.status,'invalid');assert.match(q3.reasons.join(' '),/two entrance gates/i);assert.equal(state(sim),before);assert.equal(sim.s.rngS,rng);
 assert.equal(built.gate.cstate,'construction');
});

await test('confirm charges once, keeps Pause and registers stable second-gate connection through completion',()=>{
 const sim=fixture(),{quote,before,order,gate}=buildSecond(sim);assert.equal(sim.s.cash,before-quote.cost);assert.equal(order.cost,quote.cost);assert.equal(order.dur,480);assert.equal(sim.s.speed,0);
 assert.ok(sim.s.gateAccess.gateIds.includes(gate.id));assert.equal(sim.gateConnection(gate.id).kind,'front-street');assert.equal(sim.gateConnection(gate.id).boundary,'front');
 sim.completeOrder(order);assert.equal(gate.cstate,'operating');assert.equal(sim.s.speed,0);assert.deepEqual(sim.s.gateAccess.gateIds,sim.objs('gate').map(g=>g.id).sort((a,b)=>a-b));
});

await test('player-built second gate participates in established deterministic routing and queued failure reroute',()=>{
 const sim=fixture(),p=sim.s.parcel,{order,gate:g2}=buildSecond(sim);sim.completeOrder(order);const g1=sim.objs('gate').find(g=>g.id!==g2.id);
 assert.equal(sim.selectGateForTrip(sim.idx(0,p.y1+2)),g1.id);assert.equal(sim.selectGateForTrip(sim.idx(sim.s.W-1,p.y1+2)),g2.id);
 const seen=new Set();for(let i=0;i<12;i++){sim.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});seen.add(sim.s.agents.filter(a=>a.kind==='cust').at(-1).gateId);}assert.ok(seen.has(g1.id)&&seen.has(g2.id),'natural generated arrivals use both entrances');
 const ag=sim.s.agents.filter(a=>a.kind==='cust'&&a.gateId===g1.id).at(-1),veh=sim.vehAt(ag.veh);ag.st='gateq';ag.exp.gate=0;ag.gateT=0;ag.gateFail=false;veh.x=g1.x+.5;veh.y=p.y1+1.5;veh.path=null;veh.pi=0;veh.moving=false;enqueueGate(sim.s,g1.id,ag.id);g1.cond=.1;sim.updateCustomer(ag);assert.equal(ag.gateId,g2.id);assert.equal(ag.gateRerouted,true);assert.equal(sim.s.speed,0);
});

const main=readFileSync('js/main.js','utf8');
const funcs=main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice('));
const methods=main.slice(main.indexOf('  rawSaveCode('),main.indexOf('  applyLoad('));
const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');
await test('raw and compressed Save→reload→Continue preserve both gate identities, connections and Pause',async()=>{
 const sim=fixture(),{order,gate:g2}=buildSecond(sim);sim.completeOrder(order);const expected=JSON.parse(JSON.stringify(sim.s));
 for(const code of [api.rawSaveCode(JSON.stringify(expected)),await api.saveCode(JSON.stringify(expected))]){
  const P=await api.prepareLoad(code);assert.ok(P.ok,P.msg);const loaded=P.company.props[0].sim;
  assert.equal(loaded.s.speed,0);assert.deepEqual(loaded.s.gateAccess.gateIds,expected.gateAccess.gateIds);assert.deepEqual(loaded.s.gateAccess.connections,expected.gateAccess.connections);assert.equal(loaded.s.objects[g2.id].type,'gate');assert.equal(loaded.s.objects[g2.id].cstate,'operating');
  const control=new Sim(clone(expected));loaded.s.speed=1;control.s.speed=1;for(let i=0;i<30;i++){loaded.step();control.step();loaded.events.length=0;control.events.length=0;}assert.deepEqual(loaded.s,control.s);
 }
});

console.log(`${groups} gate Stage 4A player-build groups passed`);
