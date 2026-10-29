import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {G,MARKETS,MIN_PER_DAY,ROLES} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {registerGateAccess} from '../../js/gateaccess.js';

const clone=x=>structuredClone(x);
let groups=0;async function test(name,fn){await fn();groups++;console.log('PASS '+name);}

function addSyntheticGate(sim,x,{cond=1,connected=true,linkInside=true}={}){
 const p=sim.s.parcel,primary=sim.objs('gate')[0];
 for(let y=p.y1-1;y<=p.y1+1;y++)for(let xx=x-1;xx<=x+1;xx++)sim.s.ground[sim.idx(xx,y)]=G.ASPHALT;
 if(linkInside&&primary)for(let xx=Math.min(primary.x,x);xx<=Math.max(primary.x,x);xx++)sim.s.ground[sim.idx(xx,p.y1-1)]=G.ASPHALT;
 const gate={id:sim.id(),type:'gate',x,y:p.y1,f:0,cstate:'operating',cond,open:0,unpowered:false};
 sim.s.objects[gate.id]=gate;registerGateAccess(sim.s,gate);
 if(!connected)sim.s.gateAccess.connections[String(gate.id)]={gateId:gate.id,kind:'unconnected',boundary:null,x:gate.x,y:gate.y,outside:null};
 sim.markDirty();sim.rebuild();return gate;
}
function fixture(){const sim=makeMaple();sim.s.speed=0;sim.s.convos=[];return sim;}
function crossingXs(sim,path){const p=sim.s.parcel,W=sim.s.W,out=[];for(let i=1;i<(path||[]).length;i++){const a=path[i-1],b=path[i],ay=Math.floor(a/W),by=Math.floor(b/W);if((ay===p.y1&&by===p.y1+1)||(ay===p.y1+1&&by===p.y1))out.push(b%W);}return out;}

await test('two connected gates select deterministically by compatible approach',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0],g2=addSyntheticGate(sim,34);
 const west=sim.idx(0,p.y1+2),east=sim.idx(sim.s.W-1,p.y1+2);
 assert.equal(sim.selectGateForTrip(west),g1.id);assert.equal(sim.selectGateForTrip(east),g2.id);
 for(let i=0;i<5;i++){assert.equal(sim.selectGateForTrip(west),g1.id);assert.equal(sim.selectGateForTrip(east),g2.id);}
});

await test('three-gate fixture chooses the same nearest compatible gate for the same start',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0],g2=addSyntheticGate(sim,22),g3=addSyntheticGate(sim,36);
 const starts=[[0,g1.id],[22,g2.id],[sim.s.W-1,g3.id]];
 for(const [x,want] of starts)for(let i=0;i<4;i++)assert.equal(sim.selectGateForTrip(sim.idx(x,p.y1+2)),want);
 assert.deepEqual(sim.routeGateIds(),[g1.id,g2.id,g3.id]);
});

await test('failed incomplete and disconnected alternatives are excluded when another gate works',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0],failed=addSyntheticGate(sim,32,{cond:.1}),disc=addSyntheticGate(sim,38,{connected:false}),pending=addSyntheticGate(sim,26);
 pending.cstate='construction';sim.markDirty();sim.rebuild();
 assert.deepEqual(sim.routeGateIds(),[g1.id]);
 assert.equal(sim.selectGateForTrip(sim.idx(sim.s.W-1,p.y1+2)),g1.id);
 assert.ok(!sim.routeGateIds().includes(failed.id));assert.ok(!sim.routeGateIds().includes(disc.id));assert.ok(!sim.routeGateIds().includes(pending.id));
});

await test('one failed gate does not block routing through another connected operating gate',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0],g2=addSyntheticGate(sim,34);
 g1.cond=.1;sim.markDirty();sim.rebuild();assert.deepEqual(sim.routeGateIds(),[g2.id]);
 assert.equal(sim.selectGateForTrip(sim.idx(0,p.y1+2)),g2.id);assert.equal(sim.selectGateForTrip(sim.idx(sim.s.W-1,p.y1+2)),g2.id);
});

await test('trip selection rejects a metadata-connected gate that cannot reach the visit destination',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0],stub=addSyntheticGate(sim,34,{linkInside:false});
 const u=sim.objs('unit').find(x=>x.access==='drive'&&x.lease);assert.ok(u);
 const visit={kind:'access',unit:u.id,tenant:sim.s.leases[u.lease]?.tenant};
 assert.equal(sim.selectGateForTrip(sim.idx(sim.s.W-1,p.y1+2),visit),g1.id);
 assert.ok(sim.routeGateIds().includes(stub.id),'metadata connection remains visible; trip compatibility rejects the stub');
});

await test('selected-gate graph crosses the front boundary only at that gate',()=>{
 const sim=fixture(),p=sim.s.parcel,g1=sim.objs('gate')[0],g2=addSyntheticGate(sim,34);
 for(const g of [g1,g2]){
  const outside=sim.idx(g.x,p.y1+1),inside=sim.idx(g.x,p.y1-1),path=sim.bfs([outside],n=>n===inside,n=>sim.vehNbr(n,g.id));
  assert.ok(path&&path.length>=3);const xs=crossingXs(sim,path);assert.equal(xs.length,1);assert.ok(Math.abs(xs[0]-g.x)<=1);
 }
});

await test('startVisit retains its selected gate and arrival path targets that gate apron',()=>{
 const sim=fixture(),p=sim.s.parcel,g2=addSyntheticGate(sim,34);
 sim.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});
 const ag=sim.s.agents.find(a=>a.kind==='cust'),veh=sim.vehAt(ag?.veh);assert.ok(ag&&veh);assert.equal(ag.gateId,g2.id);
 const last=veh.path.at(-1);assert.equal(last,sim.idx(g2.x,p.y1+1));
});

await test('existing gate service hands a second-gate trip into a path that crosses only its retained gate',()=>{
 const sim=fixture(),p=sim.s.parcel,g2=addSyntheticGate(sim,34);
 const u=sim.objs('unit').find(x=>x.access==='drive'&&x.lease);assert.ok(u);
 sim.startVisit({kind:'access',unit:u.id,tenant:sim.s.leases[u.lease]?.tenant});const ag=sim.s.agents.find(a=>a.kind==='cust');assert.equal(ag.gateId,g2.id);
 for(let i=0;i<120&&ag.st!=='drive';i++)sim.updateCustomer(ag);
 assert.equal(ag.st,'drive');const veh=sim.vehAt(ag.veh),xs=crossingXs(sim,veh.path);assert.equal(xs.length,1);assert.ok(Math.abs(xs[0]-g2.x)<=1);
 assert.equal(sim.gateQueue(g2.id).includes(ag.id),false);assert.equal(sim.gateServing(g2.id),null);
});

await test('valid selected-gate departure uses a real path through the retained gate without direct-goal fallback',()=>{
 const sim=fixture(),p=sim.s.parcel,g2=addSyntheticGate(sim,34);
 sim.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});const ag=sim.s.agents.find(a=>a.kind==='cust'),veh=sim.vehAt(ag.veh);assert.equal(ag.gateId,g2.id);
 veh.x=g2.x+.5;veh.y=p.y1-1+.5;veh.path=null;veh.pi=0;sim.depart(ag);
 assert.ok(veh.path&&veh.path.length>2,'departure must be a routed path, not [goal]');const xs=crossingXs(sim,veh.path);assert.equal(xs.length,1);assert.ok(Math.abs(xs[0]-g2.x)<=1);
});

// Real main.js raw/compressed codecs + prepareLoad path, without browser storage or normal saves.
const main=readFileSync('js/main.js','utf8');
const funcs=main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice('));
const methods=main.slice(main.indexOf('  rawSaveCode('),main.indexOf('  applyLoad('));
const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');

await test('in-flight selected gate survives raw/compressed save reload and deterministic continuation',async()=>{
 const base=fixture(),g2=addSyntheticGate(base,34);base.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});
 const ag0=base.s.agents.find(a=>a.kind==='cust');assert.equal(ag0.gateId,g2.id);const expected=JSON.parse(JSON.stringify(base.s));
 for(const code of [api.rawSaveCode(JSON.stringify(expected)),await api.saveCode(JSON.stringify(expected))]){
  const P=await api.prepareLoad(code);assert.ok(P.ok,P.msg);const loaded=P.company.props[0].sim,control=new Sim(clone(expected));
  const a=loaded.s.agents.find(x=>x.id===ag0.id);assert.equal(a.gateId,g2.id);assert.deepEqual(loaded.vehAt(a.veh).path,base.vehAt(ag0.veh).path);
  loaded.s.speed=1;control.s.speed=1;for(let i=0;i<120;i++){loaded.step();control.step();loaded.events.length=0;control.events.length=0;}
  assert.deepEqual(loaded.s,control.s);
 }
});

await test('ordinary one-gate game keeps primary selection and routed crossing behavior',()=>{
 const sim=fixture(),p=sim.s.parcel,g=sim.objs('gate')[0];assert.deepEqual(sim.routeGateIds(),[g.id]);
 for(const x of [0,sim.s.W-1])assert.equal(sim.selectGateForTrip(sim.idx(x,p.y1+2)),g.id);
 sim.startVisit({kind:'shopper',size:'5x5',climate:false,keen:.6});const ag=sim.s.agents.find(a=>a.kind==='cust');assert.equal(ag.gateId,g.id);
});

console.log(`${groups} gate Stage 3A route-selection groups passed`);
