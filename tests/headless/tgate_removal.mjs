import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,modeLabel,sandboxName} from '../../js/scenarios.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {G,TOOLS,MARKETS,MIN_PER_DAY,ROLES} from '../../js/data.js';
import {UI} from '../../js/ui.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const clone=structuredClone, snap=sim=>JSON.stringify(sim.s), full=sim=>JSON.stringify({s:sim.s,events:sim.events});
let emptyRemovedState;
let groups=0;async function test(name,fn){await fn();console.log('PASS '+name);groups++;}
const args=o=>({tool:'demolish',targetId:o.id,a:{x:o.x,y:o.y},b:{x:o.x,y:o.y},f:0});
function fixture(connected=true){
 const sim=makeMaple();sim.s.speed=0;sim.s.convos=[];sim.s.cash=60000;
 const p=sim.s.parcel,x=34;
 for(let xx=connected?p.x0:x-1;xx<=(connected?p.x1:x+1);xx++)sim.s.ground[sim.idx(xx,p.y1-1)]=G.ASPHALT;
 sim.markDirty();sim.rebuild();
 const r=sim.dispatch({type:'build',tool:'gate',a:{x,y:p.y1},b:{x,y:p.y1},f:0});assert.ok(r.ok,r.msg);
 sim.completeOrder(sim.s.orders.find(o=>o.id===r.order));sim.ensure();sim.events=[];
 return {sim,g1:sim.objs('gate')[0],g2:sim.objs('gate')[1]};
}
function quote(f,gate=f.g2){return f.sim.plan(args(gate));}
function confirm(f,q,gate=f.g2){return f.sim.dispatch({type:'build',...args(gate),quoteStamp:q.operation.stamp});}
await test('redundant gate review is pure, exact and works at all speeds',()=>{
 for(const speed of [0,1,2,4]){const f=fixture();f.sim.s.speed=speed;const before=full(f.sim);for(let i=0;i<3;i++){const q=quote(f);assert.equal(q.status,'valid',q.reasons.join(';'));assert.equal(q.cost,100);assert.equal(q.operation.cashAfter,f.sim.s.cash-100);assert.match(q.operation.effects.join(' '),/paving stays.*No salvage/);}assert.equal(full(f.sim),before);}
});
await test('either redundant gate removes once, cleans access state, closes crossing and retains paving',()=>{
 for(const which of ['g1','g2']){const f=fixture(),g=f[which],q=quote(f,g),before=f.sim.s.cash,ledger=f.sim.s.ledger.length,ground=clone(f.sim.s.ground);assert.equal(q.status,'valid',q.reasons.join(';'));
 const r=confirm(f,q,g);assert.ok(r.ok,r.msg);assert.equal(f.sim.s.cash,before-100);assert.equal(f.sim.s.ledger.length,ledger+1);assert.equal(f.sim.s.speed,0);assert.equal(f.sim.s.objects[g.id],undefined);assert.ok(!f.sim.s.gateAccess.gateIds.includes(g.id));for(const k of ['connections','queues','serving'])assert.ok(!(String(g.id) in f.sim.s.gateAccess[k]));assert.deepEqual(f.sim.s.ground,ground);
 assert.ok(!f.sim.vehNbr(f.sim.idx(g.x,g.y+1)).includes(f.sim.idx(g.x,g.y)),'removed crossing closed');
 const after=snap(f.sim);assert.equal(confirm(f,q,g).ok,false);assert.equal(snap(f.sim),after);assert.equal(f.sim.openingIssues().length,0);
 }
});
await test('last operating/obligated access, disconnected and failed alternatives are blocked',()=>{
 const cases=[f=>{delete f.sim.s.objects[f.g2.id];f.sim.s.gateAccess.gateIds=[f.g1.id];},f=>{f.g1.cond=.1;},f=>{f.sim.s.powerBase=0;}];
 for(const change of cases){const f=fixture();change(f);f.sim.markDirty();f.sim.rebuild();const target=f.sim.s.objects[f.g2.id]?f.g2:f.g1,before=snap(f.sim),q=quote(f,target);assert.equal(q.status,'invalid');assert.equal(confirm(f,q,target).ok,false);assert.equal(snap(f.sim),before);}
 const f=fixture(false),q=quote(f,f.g1);assert.equal(q.status,'invalid');assert.match(q.operation.prerequisites.join(' '),/office|Unit|access/);
});
await test('all target-gate trip stages, orphan queues, service and scheduled references block',()=>{
 for(const state of ['arrive','gateq','gateroute','drive','atunit','back','leave']){const f=fixture();f.sim.s.agents.push({id:99999,kind:'cust',gateId:f.g2.id,st:state,veh:null});const before=snap(f.sim),q=quote(f);assert.equal(q.status,'invalid',state);assert.equal(confirm(f,q).ok,false);assert.equal(snap(f.sim),before);}
 for(const mutate of [f=>f.sim.gateQueue(f.g2.id).push(99999),f=>f.sim.s.gateAccess.serving[f.g2.id]=99999,f=>f.sim.s.tasks.push({id:998,obj:f.g2.id,type:'repair_keypad'}),f=>f.sim.s.visits.push({id:998,kind:'prospect',gateId:f.g2.id})]){const f=fixture();mutate(f);assert.equal(quote(f).status,'invalid');}
});
await test('other-gate traffic is retained, nearby crossing traffic blocks, no reroute or teleport',()=>{
 const f=fixture();f.sim.startVisit({kind:'prospect',size:'5x5',keen:.6});const agent=f.sim.s.agents.filter(a=>a.kind==='cust').at(-1);agent.gateId=f.g1.id;const vehicle=f.sim.vehAt(agent.veh);vehicle.path=null;vehicle.x=0;vehicle.y=f.sim.s.parcel.y1+2;vehicle.moving=false;
 const before=clone({a:agent,v:vehicle}),q=quote(f);assert.equal(q.status,'valid',q.reasons.join(';'));assert.ok(confirm(f,q).ok);assert.deepEqual(agent,before.a);assert.deepEqual(vehicle,before.v);
 const n=fixture();n.sim.s.vehicles.push({id:999,x:n.g2.x+.5,y:n.g2.y+1,moving:true,path:null});assert.equal(quote(n).status,'invalid');
});
await test('empty closed last-gate redesign is allowed; obligations and scheduled visits block',()=>{
 const sim=makeSandbox({start:'empty',cash:60000});const p=sim.s.parcel;for(let x=10;x<=12;x++)sim.s.ground[sim.idx(x,p.y1-1)]=G.ASPHALT;sim.markDirty();sim.rebuild();const r=sim.dispatch({type:'build',tool:'gate',a:{x:11,y:p.y1},b:{x:11,y:p.y1},f:0});assert.ok(r.ok);sim.completeOrder(sim.s.orders.find(o=>o.id===r.order));sim.ensure();const gate=sim.objs('gate')[0],f={sim,g2:gate};
 for(const change of [()=>{sim.s.visits=[{id:999,kind:'prospect'}];},()=>{sim.s.visits=[];sim.s.leases[999]={id:999,unit:998};}]){change();assert.equal(quote(f).status,'invalid');}
 sim.s.visits=[];sim.s.leases={};const q=quote(f);assert.equal(q.status,'valid',q.reasons.join(';'));assert.match(q.operation.effects.join(' '),/before reopening/);assert.ok(confirm(f,q).ok);assert.equal(sim.objs('gate').length,0);assert.equal(sim.s.open,false);assert.match(sim.openingIssues().join(' '),/gate.*street/);assert.equal(sim.dispatch({type:'open'}).ok,false);emptyRemovedState=clone(sim.s);
});
await test('construction cancellation and insufficient funds retain existing contracts',()=>{
 const f=fixture();f.g2.cstate='construction';f.sim.markDirty();f.sim.rebuild();let q=quote(f);assert.equal(q.status,'invalid');assert.match(q.operation.prerequisites.join(' '),/Cancel/);
 const n=fixture();n.sim.s.cash=99;q=quote(n);const before=snap(n.sim);assert.equal(confirm(n,q).ok,false);assert.equal(snap(n.sim),before);
});
await test('Free Build quote discloses established subsidy and retains the $100 charge',()=>{
 const f=fixture();f.sim.s.sb={unlimited:true,subsidy:0};f.sim.s.cash=25;const q=quote(f);assert.equal(q.cost,100);assert.equal(q.operation.cashAfter,0);const before=f.sim.s.ledger.length;assert.ok(confirm(f,q).ok);assert.equal(f.sim.s.cash,0);assert.equal(f.sim.s.ledger[before].amt,-100);assert.equal(f.sim.s.ledger[before+1].amt,75);assert.equal(f.sim.s.ledger[before+1].cat,'subsidy');assert.equal(f.sim.s.speed,0);
});
await test('stale funds, traffic, power, occupancy, topology, identity and property reject with no charge',()=>{
 for(const mutate of [f=>{f.sim.s.cash--;},f=>{f.sim.s.agents.push({id:9999,kind:'cust',st:'arrive',gateId:f.g2.id});},f=>{f.g1.cond=.1;},f=>{f.sim.s.powerBase=0;},f=>{f.sim.objs('unit')[0].commercial='reserved';},f=>{f.sim.s.ground[f.sim.idx(33,f.g2.y-1)]=G.GRASS;},f=>{f.g2.x--;},f=>{f.sim.s.open=false;}]){const f=fixture(),q=quote(f);mutate(f);const before=snap(f.sim);assert.equal(confirm(f,q).ok,false);assert.equal(snap(f.sim),before);}
 const f=fixture(),q=quote(f),other=new Sim(clone(f.sim.s)),before=snap(other);const r=other.dispatch({type:'build',...args(f.g2),quoteStamp:q.operation.stamp});assert.equal(r.ok,false);assert.equal(snap(other),before);
});
await test('new and legacy save roundtrips retain gates, removal, Pause and deterministic continuation',async()=>{
 const main=readFileSync('js/main.js','utf8'),funcs=main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice(')),methods=main.slice(main.indexOf('  rawSaveCode('),main.indexOf('  applyLoad('));const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');
 const f=fixture();assert.ok(confirm(f,quote(f)).ok);
 for(const expected of [clone(f.sim.s),emptyRemovedState]) {
 for(const code of [api.rawSaveCode(JSON.stringify(expected)),await api.saveCode(JSON.stringify(expected))]){const loaded=await api.prepareLoad(code);assert.ok(loaded.ok,loaded.msg);const sim=loaded.company.props[0].sim;assert.equal(sim.s.speed,0);assert.deepEqual(sim.s.gateAccess.gateIds,expected.gateAccess.gateIds);assert.ok(!sim.s.objects[f.g2.id]);assert.equal(sim.s.open,expected.open);const control=new Sim(clone(expected));for(let i=0;i<30;i++){sim.step();control.step();sim.events=[];control.events=[];}assert.deepEqual(sim.s,control.s);}
 }
 const old=clone(makeMaple().s);delete old.gateAccess;old.gateQ=[];old.speed=0;const cash=old.cash,ids=Object.values(old.objects).filter(o=>o.type==='gate').map(o=>o.id),sim=new Sim(old);assert.deepEqual(sim.s.gateAccess.gateIds,ids);assert.equal(sim.s.cash,cash);assert.equal(sim.s.speed,0);
});
await test('production fence geometry fills removed crossing and keeps surviving gate gap',()=>{
 const source=readFileSync('js/render.js','utf8'),start=source.indexOf('  buildFence() {'),end=source.indexOf('  setView(',start),build=source.slice(start,end).replace('buildFence()', 'function buildFence()');
 function gaps(sim){const spans=[];class Mesh{constructor(geo){this.geo=geo;this.scale={set:(...v)=>this.size=v};this.position={set:(...v)=>this.pos=v};this.rotation={};}}
 const ctx=vm.createContext({THREE:{Mesh}});vm.runInContext(build,ctx);ctx.buildFence.call({sim,geo:{plane:'plane',box:'box'},mat:{},box(){},add(m){if(m.geo==='plane'&&m.pos[2]===sim.s.parcel.y1+1)spans.push([m.pos[0]-m.size[0]/2,m.pos[0]+m.size[0]/2]);}});return spans;}
 const f=fixture(),covers=(spans,x)=>spans.some(([lo,hi])=>x>lo&&x<hi);assert.equal(covers(gaps(f.sim),f.g2.x),false);assert.ok(confirm(f,quote(f)).ok);assert.equal(covers(gaps(f.sim),f.g2.x),true);assert.equal(covers(gaps(f.sim),f.g1.x),false);
});
await test('inspector exposes direct review; cancel, manual Pause, duplicate Confirm and property switch are safe',()=>{
 const f=fixture(),ui=Object.create(UI.prototype),modal={innerHTML:''};ui.g={sim:f.sim,rend:{view:'ext'}};ui.title=false;ui.sel=f.g2.id;ui.$=()=>modal;ui.toast=()=>{};ui.renderTut=()=>{};ui.select=()=>{};
 ui.root={querySelectorAll:()=>[]};ui.sheetTall=false;ui.taskActions=()=>'';assert.match(ui.inspector(),/dock-actions[\s\S]*data-a="gateRemove"/);
 ui.showGateRemoval(f.g2.id);assert.match(modal.innerHTML,/Confirm removal/);assert.ok(ui.gateRemovalReview);const before=snap(f.sim);ui.closeModal();assert.equal(snap(f.sim),before);assert.equal(ui.gateRemovalReview,null);
 f.sim.s.speed=4;ui.showGateRemoval(f.g2.id);assert.equal(f.sim.s.speed,0);ui.notePause(0);ui.confirmGateRemoval();assert.equal(f.sim.s.speed,0);const done=snap(f.sim);ui.confirmGateRemoval();assert.equal(snap(f.sim),done);
 const n=fixture();ui.g.sim=n.sim;ui.showGateRemoval(n.g2.id);ui.g.sim=fixture().sim;const other=snap(ui.sim);ui.confirmGateRemoval();assert.equal(snap(ui.sim),other);
});
console.log(`${groups} focused gate-removal groups passed; native/disposable UI, physical-iPhone verification pending`);
