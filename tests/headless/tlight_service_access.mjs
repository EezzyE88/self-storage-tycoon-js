import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
function fixture(){const sim=makeMaple(4401);sim.s.tut={on:false,done:true};sim.s.cash=100000;sim.ensure();return sim;}
const sim=fixture();
// A legally placed lamp on remote grass, outside the old two-cell maintenance reach.
let light;
for(let y=2;y<sim.s.H-5&&!light;y++)for(let x=2;x<sim.s.W-2;x++){
 const a={tool:'light',a:{x,y},b:{x,y},f:0},p=sim.plan(a);
 if(p.status!=='valid')continue;
 const near=sim.taskCell({type:'repair',obj:sim.objs('light')[0].id});
 let walk=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(sim.inb(x+dx,y+dy)&&sim.D.walk[0][sim.idx(x+dx,y+dy)])walk=true;
 if(walk)continue;
 sim.s.creative=true;assert.ok(sim.dispatch({type:'build',...a}).ok);sim.s.creative=false;
 light=sim.objs('light').find(o=>o.x===x&&o.y===y);break;
}
assert.ok(light,'remote legal light fixture');light.cstate='operating';light.cond=.1;sim.markDirty();sim.ensure();
const task=sim.ensureRepairTask(light),owner=sim.s.staff.find(s=>s.role==='owner');
for(const t of [...sim.s.tasks])if(t!==task)sim.s.tasks.splice(sim.s.tasks.indexOf(t),1);
const before=sim.s.t,cash=sim.s.cash,hours=sim.workRemaining(owner);
const result=sim.dispatch({type:'ownerTask',task:task.id,forceOwner:true});assert.ok(result.ok,result.msg);
assert.equal(sim.s.speed,0);assert.equal(sim.s.t,before);assert.equal(sim.s.cash,cash);assert.ok(sim.workRemaining(owner)<hours);
for(let i=0;i<1440&&sim.s.tasks.includes(task);i++){sim.step();sim.events.length=0;}
assert.ok(!sim.s.tasks.includes(task),'real work completes');assert.ok(light.cond>=.7 && light.quickFix);console.log('PASS legal remote light: Owner assignment, normal booked work, paused dispatch, actual completion');
const copy=new Sim(JSON.parse(JSON.stringify(sim.s)));assert.equal(copy.s.objects[light.id].cond,light.cond);console.log('PASS repaired light retains condition through ordinary state reload');
const other=fixture(),lamp=other.objs('light')[0];lamp.cond=.1;const t=other.ensureRepairTask(lamp);t.unreachable=other.s.t;
const r=other.dispatch({type:'ownerTask',task:t.id});assert.ok(r.ok,r.msg);console.log('PASS old saved unreachable light assignment recovers immediately');
const hired=new Sim(JSON.parse(JSON.stringify(sim.s)));hired.s.speed=0;
assert.ok(hired.dispatch({type:'hire',role:'tech'}).ok);
const target=hired.s.objects[light.id];target.cond=.1;const job=hired.ensureRepairTask(target);job.unreachable=hired.s.t;
const assigned=hired.dispatch({type:'ownerTask',task:job.id});assert.ok(assigned.ok,assigned.msg);
const tech=hired.s.staff.find(s=>s.role==='tech');assert.equal(job.assigned,tech.id,'staff retains first refusal');assert.equal(hired.s.speed,0);
for(let i=0;i<1440&&hired.s.tasks.includes(job);i++){hired.step();hired.events.length=0;}
assert.ok(!hired.s.tasks.includes(job));assert.ok(target.cond>.98,'Tech retains full repair outcome');
console.log('PASS remote light: Tech priority, actual normal work completion and full repair');
const camera={...target,id:hired.s.nextId++,type:'camera'};hired.s.objects[camera.id]=camera;hired.markDirty();hired.ensure();
assert.equal(hired.taskCell({type:'repair',obj:camera.id}),null,'other equipment retains local walk-access requirement');
console.log('PASS maintenance access exception remains light-only');
console.log('ALL PASS: light service access; native simulation only');
