import assert from 'node:assert/strict';
import { makeMaple, makePublicMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { G } from '../../js/data.js';
import { accessState, pocket, publicBay } from '../../js/mapleaccess.js';

const build = (tool,x,y,x1=x,y1=y) => ({type:'build',tool,f:0,a:{x,y},b:{x:x1,y:y1}});
const snapshot = sim => JSON.stringify(sim.s);
function complete(sim,a) {
  const result=sim.dispatch(a); assert.ok(result.ok,result.msg);
  sim.completeOrder(sim.s.orders.find(o=>o.id===result.order)); sim.ensure();
}
function refused(sim,a,reason) {
  const before=snapshot(sim), q=sim.plan(a);
  assert.equal(q.status,'invalid');assert.match(q.reasons.join(' '),reason);
  assert.equal(sim.dispatch(a).ok,false);
  assert.equal(snapshot(sim),before,'cash, orders, clock, leases and entire saved state must be unchanged');
}
function controlled(seed) {
  const sim=makePublicMaple(seed);
  sim.s.visits=[]; sim.s.t=510; sim.s.policies.ownerChores=false;
  return sim;
}
function check(name,fn) { fn();console.log('PASS '+name); }
check('Approved door landing, four-cell public driveway and staff rear landing reject preview and commit before debit',()=>{
  const sim=makePublicMaple();
  refused(sim,build('power',8,21),/office entrance/);
  refused(sim,build('walk',12,29,15,29),/driveable/);
  refused(sim,build('power',5,19),/staff route/);
});
check('Positive alternate, normal cost, pending-order/stale preview, and identical committed behavior after native reload',()=>{
  let sim=makePublicMaple();
  const lastSide=build('walk',13,29,15,29);
  assert.equal(sim.plan(lastSide).status,'valid');
  const oneColumn=build('walk',12,29), before=sim.s.cash;
  const order=sim.dispatch(oneColumn);
  assert.ok(order.ok);assert.equal(sim.s.cash,before-25);assert.equal(sim.s.speed,0);
  refused(sim,lastSide,/driveable/);
  sim=new Sim(JSON.parse(snapshot(sim)));
  refused(sim,lastSide,/driveable/);
  sim.completeOrder(sim.s.orders.find(o=>o.id===order.order));sim.ensure();
  assert.ok(accessState(sim).parking);assert.equal(sim.s.ground[sim.idx(12,29)],G.CONCRETE);
  const a=build('power',10,20);
  assert.equal(sim.plan(a).status,'valid');complete(sim,a);
  assert.ok(accessState(sim).pedestrian && accessState(sim).parking && accessState(sim).staff);
  assert.equal(sim.s.cash,before-6525);
});
check('Baseline and mirror keep existing navigation; new layout preserves starting comparison controls',()=>{
  const base=makeMaple(), sim=makePublicMaple();
  assert.equal(makeMaple(undefined,{mirror:true}).s.layout,undefined);assert.equal(base.s.layout,undefined);
  assert.equal(sim.s.cash,26000);assert.deepEqual(sim.s.leases,base.s.leases);assert.deepEqual(sim.s.tenants,base.s.tenants);
  assert.equal(sim.objs('unit').length,23);assert.equal(Object.keys(sim.s.leases).length,22);
  assert.equal(sim.objs('gate').length,1);assert.equal(sim.s.staff.length,1);
  assert.deepEqual(sim.objs('unit').filter(u=>u.blocked).map(u=>u.num),[]);assert.deepEqual(sim.openingIssues(),[]);
});
function publicRoundTrip(sim) {
  const s=sim.s;
  sim.startVisit({kind:'prospect',size:'5x10',keen:true});
  const customer=s.agents.find(a=>a.publicVisit);assert.ok(customer);
  const id=customer.id, states=new Set();let restored=false;
  for(let tick=0;tick<650;tick++){
    const a=sim.s.agents.find(a=>a.id===id);
    if(!a) break;
    const car=sim.vehAt(a.veh); states.add(a.st);
    assert.equal(a.gateId,null);assert.equal(a.exp.gate,0);
    assert.ok(!sim.gateQueue().includes(id) && sim.gateServing()!==id);
    const inPublic=(x,y)=>y>=30 || pocket(x,y);
    assert.ok(inPublic(Math.floor(car.x),Math.floor(car.y)));
    if(!a.hidden)assert.ok(pocket(Math.floor(a.x),Math.floor(a.y)));
    for(const n of car.path||[]) assert.ok(inPublic(n%sim.s.W,Math.floor(n/sim.s.W)));
    if(!restored && a.st==='toOffice'){
      const path=structuredClone(a.path);assert.ok(path.some(n=>Math.floor(n/sim.s.W)===20),'parking-head walk');
      sim=new Sim(JSON.parse(snapshot(sim))); const loaded=sim.s.agents.find(x=>x.id===id);
      assert.deepEqual(loaded.path,path);assert.equal(loaded.gateId,null);assert.equal(sim.s.speed,0);restored=true;
    }
    sim.step();
  }
  assert.ok(restored);assert.deepEqual([...states],['drive','toOffice','office','back','leave']);
  assert.ok(!sim.s.agents.some(a=>a.id===id));return sim;
}
check('Shopper stays public throughout the no-vacancy trip, including a failed yard gate and an in-progress reload',()=>{
  const sim=controlled();sim.objs('gate')[0].cond=.1;
  const final=publicRoundTrip(sim);assert.equal(Object.keys(final.s.leases).length,22);
});
check('Successful leasing visit also stays public; a later move-in has separate tenant and trip identity',()=>{
  const sim=controlled(23);sim.s.objects[sim.s.unitRoles.mapleTurnover].commercial='ready';
  const final=publicRoundTrip(sim);
  assert.equal(Object.keys(final.s.leases).length,23);
  assert.ok(final.s.visits.some(v=>v.kind==='movein') || final.s.agents.some(a=>a.vt==='movein' && !a.publicVisit));
});
check('Three bays reserve three different public destinations; fourth prospect stays pending without a yard fallback',()=>{
  const sim=controlled();
  for(let i=0;i<4;i++)sim.startVisit({kind:'prospect',size:'5x10',probe:i});
  assert.equal(sim.s.agents.filter(a=>a.publicVisit).length,3);
  assert.equal(new Set(sim.s.vehicles.map(v=>publicBay(v.dest%sim.s.W,Math.floor(v.dest/sim.s.W)))).size,3);
  assert.equal(sim.s.visits.filter(v=>v.probe===3).length,1);assert.deepEqual(sim.gateQueue(),[]);
});
check('Owner leaves and returns through rear landing after actual make-ready work',()=>{
  const sim=controlled(), a=sim.s.agents[0],t=sim.s.tasks.find(t=>t.type==='makeready');
  const started=sim.dispatch({type:'ownerTask',task:t.id,forceOwner:true});assert.ok(started.ok,started.msg);
  const seen=new Set();
  for(let i=0;i<500;i++){
    seen.add(a.st);if(!a.hidden)assert.ok(!pocket(Math.floor(a.x),Math.floor(a.y)));
    if(seen.has('work') && a.st==='office')break;
    sim.step();
  }
  assert.ok(seen.has('work') && seen.has('home'));assert.equal(a.st,'office');assert.equal(a.x,5.5);assert.equal(a.y,19.5);
  assert.equal(sim.s.objects[t.obj].commercial,'ready');
});
check('Authorized tenant crosses IN, uses unit, returns through OUT; next arrival remains scheduled upstream',()=>{
  const sim=controlled(), t=Object.values(sim.s.tenants)[0],unit=sim.s.leases[t.lease].unit;
  const visit={kind:'access',unit,tenant:t.id};sim.startVisit(visit);sim.startVisit({...visit,marker:2});
  assert.equal(sim.s.visits.filter(v=>v.marker===2).length,1);assert.equal(sim.s.vehicles.length,1);
  const a=sim.s.agents.at(-1), id=a.id, car=sim.vehAt(a.veh), crossings=[], states=new Set();
  let prev=Math.floor(car.y);
  for(let i=0;i<800 && sim.s.agents.some(x=>x.id===id);i++){
    sim.step();const y=Math.floor(car.y), x=Math.floor(car.x);
    if(prev===24&&y===23){assert.ok(x>=21&&x<24);crossings.push('IN');}
    if(prev===23&&y===24){assert.ok(x>=18&&x<21);crossings.push('OUT');}
    prev=y;states.add(a.st);
  }
  assert.deepEqual(crossings,['IN','OUT']);assert.ok(states.has('gateq')&&states.has('atunit'));assert.ok(!sim.s.agents.includes(a));
});
check('Last gate protected; operable alternate permits one $100 removal, closes only its crossing and preserves public access',()=>{
  const sim=makePublicMaple(),gate=sim.objs('gate')[0];
  const remove={...build('demolish',gate.x,gate.y),targetId:gate.id};
  refused(sim,remove,/access|lease/i);
  complete(sim,build('aisle',31,17,33,29));complete(sim,build('gate',32,29));
  const alt=sim.objs('gate').find(g=>g.id!==gate.id),other={...build('demolish',alt.x,alt.y),targetId:alt.id};
  assert.equal(sim.plan(other).status,'valid','recessed compound qualifies as a working alternative');
  const q=sim.plan(remove);assert.equal(q.status,'valid',q.reasons.join(' '));assert.equal(q.cost,100);
  const before=sim.s.cash,confirm={...remove,quoteStamp:q.operation.stamp};
  assert.ok(sim.dispatch(confirm).ok);assert.equal(sim.s.cash,before-100);assert.equal(sim.dispatch(confirm).ok,false);
  assert.ok(accessState(sim).parking);assert.equal(sim.s.gateAccess.connections[gate.id],undefined);
  assert.ok(!sim.vehNbr(sim.idx(22,24)).includes(sim.idx(22,23)));assert.deepEqual(sim.openingIssues(),[]);
});
check('Secured staff path may be rerouted before the original path is built over',()=>{
  const sim=makePublicMaple(), cut=build('power',6,19);
  refused(sim,cut,/staff route/);
  complete(sim,build('walk',5,18,7,18));
  assert.ok(accessState(sim).staff);assert.equal(sim.plan(cut).status,'valid');
  complete(sim,cut);assert.ok(accessState(sim).staff);
});
check('Failed gate never strands an unadmitted vehicle inside the yard',()=>{
  const sim=controlled(), gate=sim.objs('gate')[0];gate.cond=.05;
  // No staffed desk available to buzz this vehicle through.
  sim.s.staff=[]; sim.s.agents=[];
  const t=Object.values(sim.s.tenants)[0];sim.startVisit({kind:'access',tenant:t.id,unit:sim.s.leases[t.lease].unit});
  const a=sim.s.agents.at(-1),car=sim.vehAt(a.veh);
  let reached=false;
  for(let i=0;i<500 && sim.s.agents.includes(a);i++){
    sim.step();
    if(a.st==='gateq')reached=true;
    assert.ok(car.y>=24);
  }
  assert.ok(reached);assert.ok(!sim.s.agents.includes(a));
});
check('Scheduled traffic progresses while arrivals, parked loading and departures overlap',()=>{
  for (const seed of [undefined, 23, 29]) {
    const sim=makePublicMaple(seed), s=sim.s, crossedIn=new Set(), crossedOut=new Set(), departed=new Set();
    let overlap=false;
    for(let tick=0;tick<16000;tick++){
      const yard=s.agents.filter(a=>a.veh&&!a.publicVisit);
      overlap ||= yard.some(a=>a.st==='leave') && yard.some(a=>sim.vehAt(a.veh).parked!=null)
        && yard.some(a=>['arrive','gateq','drive'].includes(a.st));
      const positions=yard.map(a=>[a,sim.vehAt(a.veh),Math.floor(sim.vehAt(a.veh).y)]);
      sim.step();sim.events.length=0;
      for(const [a,v,beforeY] of positions){
        const x=Math.floor(v.x), y=Math.floor(v.y);
        if(beforeY===24&&y===23){assert.ok(x>=21&&x<24);crossedIn.add(a.id);}
        if(beforeY===23&&y===24){assert.ok(x>=18&&x<21);crossedOut.add(a.id);}
        if(!s.agents.includes(a))departed.add(a.id);
      }
      const occupied=new Set();
      for(const v of s.vehicles){
        const x=Math.floor(v.x), y=Math.floor(v.y);
        if(x<18||x>=24||y<14||y>=30)continue;
        const cell=sim.idx(x,y);
        assert.ok(!occupied.has(cell),'two vehicles in one gate or junction cell');
        occupied.add(cell);
      }
    }
    assert.ok(overlap);
    assert.ok(crossedIn.size>=10 && crossedOut.size>=10 && departed.size>=10);
    for(const id of crossedIn)assert.ok(crossedOut.has(id)||s.agents.some(a=>a.id===id&&s.t-a.t0<400),'admitted vehicle stranded in yard');
  }
});
