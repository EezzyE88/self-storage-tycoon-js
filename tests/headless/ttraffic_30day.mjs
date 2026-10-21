// Unattended simulation comparison, not UI/Safari playthrough. Owner dialogs do
// not stop these explicit simulation ticks. The parent checkout is read-only.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const parent=process.argv[2];assert.ok(parent,'Supply a read-only checkout of parent a63d1f5');
const baseline=await import(pathToFileURL(resolve(parent,'js/maple.js'))),candidate=await import('../../js/maple.js');
const baseSim=await import(pathToFileURL(resolve(parent,'js/sim.js'))),newSim=await import('../../js/sim.js');
for(const method of ['genProspects','startVisit','decideLease','endLease','act_cv','financialBatch'])assert.equal(newSim.Sim.prototype[method].toString(),baseSim.Sim.prototype[method].toString(),method+' rules unchanged');
function run(makeMaple,seed){
 const sim=makeMaple(seed),s=sim.s;s.tut={on:false,done:true};s.mode='sandbox';s.speed=1;
 const routine=v=>['access','bigaccess'].includes(v.kind),opening=s.visits.filter(routine).length;
 let rescheduling=false,generated=0,spawned=0,peakRoutine=0,cartUseMinutes=0,thoughts=0,requests=0;
 const scheduled={},arrived={},schedule=sim.schedule.bind(sim),startVisit=sim.startVisit.bind(sim);
 sim.schedule=(v,t)=>{if(!rescheduling){scheduled[v.kind]=(scheduled[v.kind]||0)+1;if(routine(v))generated++;}return schedule(v,t)};
 sim.startVisit=v=>{const id=s.nextId;rescheduling=true;try{startVisit(v)}finally{rescheduling=false}if(s.agents.some(a=>a.id>=id&&a.kind==='cust')){arrived[v.kind]=(arrived[v.kind]||0)+1;if(routine(v))spawned++;}};
 for(let n=0;n<30*1440;n++){
  sim.step();thoughts+=sim.events.filter(e=>e.type==='thought'&&e.kind!=='good').length;requests+=sim.events.filter(e=>e.type==='convo').length;sim.events.length=0;
  cartUseMinutes+=s.carts.filter(c=>c.st==='inuse'||c.user).length;
  peakRoutine=Math.max(peakRoutine,s.agents.filter(a=>a.kind==='cust'&&['access','bigaccess'].includes(a.vt)).length);
 }
 const days=[...s.days,s.today];
 return{seed,opening,generatedRoutine:generated,routineArrivals:spawned,meanDailyRoutine:generated/30,peakActiveRoutine:peakRoutine,scheduled,arrived,endTenants:Object.keys(s.tenants).length,cash:s.cash,negativeThoughtEvents:thoughts,requestEvents:requests,openTasks:s.tasks.length,completedJobs:s.workReport?.completed?.length??null,cartUseMinutes,leaseCount:days.reduce((n,d)=>n+(d.leases||0),0),moveoutCount:days.reduce((n,d)=>n+(d.moveouts||0),0),endingExperience:s.exp};
}
const results=[];
for(const seed of [4242,5150,9101]){const before=run(baseline.makeMaple,seed),after=run(candidate.makeMaple,seed);assert.ok(after.generatedRoutine<before.generatedRoutine*.3,'substantial routine reduction');const r={seed,before,after,reduction:1-after.generatedRoutine/before.generatedRoutine};results.push(r);console.log(JSON.stringify(r));}
console.log('PASS 3 paired 30-day explicit-tick scenarios; shopper/move-in/out/financial/retention-outcome methods unchanged. Reduced traffic changes RNG consumption and operating outcomes; no claim of simulation or profit parity.');
