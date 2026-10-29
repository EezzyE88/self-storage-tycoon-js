import assert from 'node:assert/strict';
import { makeSandbox } from '../../js/scenarios.js';
import { SIZES } from '../../js/data.js';

let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
const snap=(s)=>JSON.stringify({state:s.s,events:s.events});
const stateSnap=(s)=>JSON.stringify(s.s);
const args=(o,extra={})=>({tool:'demolish',a:{x:o.x,y:o.y},b:{x:o.x,y:o.y},f:o.f||0,targetId:o.id,...extra});

function fixture(){
  const sim=makeSandbox({kind:'business',start:'starter',cash:75000});
  sim.s.speed=0;sim.s.convos=[];
  const unit=sim.objs('unit').find(u=>!u.lease&&u.commercial!=='reserved'&&!sim.s.agents.some(a=>a.unit===u.id));
  const light=sim.objs('light').find(o=>!o.mount);
  const gate=sim.objs('gate')[0];
  assert.ok(unit&&light&&gate);
  const attachment={id:sim.id(),type:'unitLight',x:unit.x,y:unit.y,f:unit.f||0,cstate:'operating',cond:1,mount:{host:unit.id}};
  sim.s.objects[attachment.id]=attachment;sim.markDirty();sim.rebuild();sim.events.length=0;
  return {sim,unit,light,gate,attachment};
}

test('representative reports are pure and classify unit, fixture, attachment and gate',()=>{
  const f=fixture(),before=snap(f.sim),rng=f.sim.s.rngS;
  const rows=[f.unit,f.light,f.attachment,f.gate].map(o=>f.sim.placeableRemoval(o.id));
  assert.equal(snap(f.sim),before);assert.equal(f.sim.s.rngS,rng);
  assert.equal(rows[0].classification,'allowed with disclosed effects');
  assert.equal(rows[1].classification,'allowed');
  assert.equal(rows[2].classification,'blocked');assert.match(rows[2].prerequisites.join(' '),/hosted-attachment/);
  assert.equal(rows[3].classification,'blocked');assert.match(rows[3].prerequisites.join(' '),/alternate-route/);
});

test('exact target disambiguates overlapping fixture and unit and quotes authoritative money',()=>{
  const f=fixture();
  f.light.x=f.unit.x;f.light.y=f.unit.y;f.light.f=f.unit.f||0;f.sim.markDirty();f.sim.rebuild();
  const ui=f.sim.plan({tool:'demolish',a:{x:f.unit.x,y:f.unit.y},b:{x:f.unit.x,y:f.unit.y},f:f.unit.f||0});
  const exact=f.sim.plan(args(f.unit));
  assert.notEqual(ui.target,f.unit.id,'coordinate priority may select an overlapping fixture');
  assert.equal(exact.target,f.unit.id);assert.equal(exact.operation.target.id,f.unit.id);
  assert.equal(exact.cost,60+SIZES[f.unit.size].sqft*.6);assert.equal(exact.operation.cashAfter,f.sim.s.cash-exact.cost);
  assert.match(exact.operation.effects.join(' '),/vacant unit/);assert.match(exact.operation.effects.join(' '),/attached interior light/);
});

test('repeated preview and abandoning review preserve complete state, events and RNG',()=>{
  const f=fixture(),before=snap(f.sim),rng=f.sim.s.rngS;
  for(let i=0;i<5;i++){const q=f.sim.plan(args(f.unit));assert.equal(q.status,'valid');}
  assert.equal(snap(f.sim),before);assert.equal(f.sim.s.rngS,rng);
});

test('stale target, funds, occupancy, construction, attachment and access state all reject without effects',()=>{
  const cases=[
    (f)=>{delete f.sim.s.objects[f.light.id];},
    (f)=>{f.sim.s.cash-=1;},
    (f)=>{f.unit.lease=999;f.unit.commercial='occupied';},
    (f)=>{f.light.cstate='construction';},
    (f)=>{const id=f.sim.id();f.sim.s.objects[id]={...f.attachment,id};f.sim.markDirty();},
    (f)=>{f.sim.gateQueue(f.gate.id).push(999);},
  ];
  for(const [i,mutate] of cases.entries()){
    const f=fixture(),target=i===0||i===1||i===3?f.light:f.unit,q=f.sim.plan(args(target));assert.equal(q.status,'valid');
    mutate(f);const before=stateSnap(f.sim),rng=f.sim.s.rngS,r=f.sim.dispatch({type:'build',...args(target),quoteStamp:q.operation.stamp});
    assert.equal(r.ok,false);assert.match(r.msg,/review changed/i);assert.equal(stateSnap(f.sim),before,`stale case ${i}`);assert.equal(f.sim.s.rngS,rng);
  }
});

test('confirmation commits one exact charge and delayed duplicate cannot charge again',()=>{
  const f=fixture(),q=f.sim.plan(args(f.light)),cash=f.sim.s.cash,ledger=f.sim.s.ledger.length;
  const action={type:'build',...args(f.light),quoteStamp:q.operation.stamp};
  const first=f.sim.dispatch(action);assert.equal(first.ok,true);assert.equal(f.sim.s.cash,cash-q.cost);assert.equal(f.sim.s.ledger.length,ledger+1);assert.equal(f.sim.s.objects[f.light.id],undefined);
  const after=stateSnap(f.sim),rng=f.sim.s.rngS,second=f.sim.dispatch(action);assert.equal(second.ok,false);assert.equal(stateSnap(f.sim),after);assert.equal(f.sim.s.rngS,rng);
});

test('insufficient cash is revalidated before demolition and never goes negative',()=>{
  const f=fixture();f.sim.s.cash=99;const q=f.sim.plan(args(f.light));assert.equal(q.cost,100);
  const before=stateSnap(f.sim),rng=f.sim.s.rngS,r=f.sim.dispatch({type:'build',...args(f.light),quoteStamp:q.operation.stamp});
  assert.equal(r.ok,false);assert.match(r.msg,/Not enough cash/);assert.equal(stateSnap(f.sim),before);assert.equal(f.sim.s.rngS,rng);
});

console.log(`${groups} placeable Stage 1 contract groups passed`);
