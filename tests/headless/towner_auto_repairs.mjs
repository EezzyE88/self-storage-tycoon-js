import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {ReserveWait} from '../../js/reservewait.js';
import {UI} from '../../js/ui.js';
import {yardChoices} from '../../js/yardloop.js';
import {recovered} from './project-fixture.mjs';

function fixture(){
 const sim=makeMaple(9210);sim.s.tut={on:false,done:true};sim.s.t=720;
 sim.s.tasks=[];sim.s.officeQ=[];sim.s.convos=[];sim.s.visits=[];
 sim.s.agents=sim.s.agents.filter(a=>a.kind==='staff');
 const owner=sim.s.staff.find(st=>st.role==='owner'),ag=sim.s.agents.find(a=>a.sid===owner.id);
 Object.assign(ag,{st:'office',hidden:true,task:null,queue:[]});
 const obj=sim.objs('light')[0];obj.cond=.4;
 const task=sim.ensureRepairTask(obj);
 return {sim,owner,ag,obj,task};
}
const reason=sim=>new ReserveWait().problem(sim,[]);
{
 const {sim,owner,ag,obj,task}=fixture(),cash=sim.s.cash;
 assert.equal(sim.ownerAutoRepairCovered(task),true);
 assert.equal(sim.ownerMayAutoWork(),true);
 assert.equal(reason(sim),null,'routine eligible Owner repair needs no decision');
 assert.match(sim.taskDelegation(task).message,/Owner chores will handle/);
 // Exercise the real minute scheduler, not a manually dispatched Owner action.
 for(let i=0;i<10;i++)sim.step();
 assert.equal(task.assigned,owner.id);assert.equal(ag.task,task.id);
 assert.equal(sim.workRemaining(owner),6.5);
 const used=owner.workUsed;
 for(let i=0;i<20;i++)sim.step();
 assert.equal(owner.workUsed,used,'repeated scheduler visits do not book the same work twice');
 for(let i=0;i<400&&sim.s.tasks.includes(task);i++)sim.step();
 assert.equal(sim.s.tasks.includes(task),false,'Owner completes the repair through ordinary travel/work');
 assert.equal(obj.cond,.72,'normal business Owner quick-fix quality is unchanged');
 assert.equal(obj.quickFix,true);assert.equal(sim.s.cash,cash,'no repair cash fee or automatic vendor booking');
 console.log('PASS automatic scheduling, real completion, normal hours, one reservation and existing quick-fix quality');
}
for(const staffState of ['available','busy','exhausted','assigned','vendor']){
 const {sim,owner,ag,task}=fixture();sim.dispatch({type:'hire',role:'tech'});
 const tech=sim.s.staff.find(st=>st.role==='tech'),ta=sim.s.agents.find(a=>a.sid===tech.id);
 if(staffState==='busy'){
   const other=sim.ensureRepairTask(sim.objs('camera')[0]);assert.ok(sim.assignStaffFirst(other));
 }
 if(staffState==='exhausted'){sim.syncStaffWork(tech);tech.workUsed=8;}
 if(staffState==='assigned')assert.ok(sim.assignStaffFirst(task));
 if(staffState==='vendor'){task.assigned='vendor';task.vendor=sim.s.t+600;}
 sim.updateStaff(ag);
 if(staffState==='exhausted')assert.equal(task.assigned,owner.id,'Owner fills capacity gap');
 else {
   assert.notEqual(task.assigned,owner.id,'Owner never steals eligible Tech/assigned/vendor work');
   assert.equal(sim.workRemaining(owner),8);
 }
 if(staffState==='available'){sim.updateStaff(ta);assert.equal(task.assigned,tech.id);}
}
{
 const {sim,owner,ag,task}=fixture();sim.syncStaffWork(owner);owner.workUsed=7;
 sim.updateStaff(ag);assert.equal(task.assigned,null);assert.equal(owner.workUsed,7);
 assert.equal(reason(sim),null,'tomorrow capacity is a delay, not missing coverage');
 sim.s.t=1440+480;sim.updateStaff(ag);
 assert.equal(task.assigned,owner.id);assert.equal(sim.workRemaining(owner),6.5,'daily reset enables ordinary reservation');
}
for(const delay of ['offhours','officeQueue','prospect','ownerBusy']){
 const {sim,ag,task}=fixture();
 if(delay==='offhours')sim.s.t=22*60;
 if(delay==='officeQueue')sim.s.officeQ=[999];
 if(delay==='prospect')sim.s.agents.push({id:999,kind:'cust',vt:'prospect'});
 if(delay==='ownerBusy'){
   const other=sim.ensureRepairTask(sim.objs('camera')[0]);
   assert.equal(sim.startTask(ag,other),true);
 }
 const before=structuredClone(sim.s);assert.equal(sim.ownerAutoRepairCovered(task),true);assert.equal(reason(sim),null,delay);
 assert.deepEqual(sim.s,before,'coverage query never mutates state or books hours');
 sim.updateStaff(ag);assert.equal(task.assigned,null,delay);
}
for(const blocked of ['policy','tutorial','agent','office','route','specialist','preventive','oversized']){
 const {sim,ag,task}=fixture();
 if(blocked==='policy')sim.s.policies.ownerChores=false;
 if(blocked==='tutorial')sim.s.tut={on:true,done:false};
 if(blocked==='agent')sim.s.agents=sim.s.agents.filter(a=>a!==ag);
 if(blocked==='office'){sim.objs('office')[0].cstate='construction';sim.markDirty();}
 if(blocked==='route')task.unreachable=sim.s.t;
 if(blocked==='specialist')task.need='repair_complex';
 if(blocked==='preventive')task.type='pm';
 if(blocked==='oversized')task.total=9*60;
 assert.equal(sim.ownerAutoRepairCovered(task),false,blocked);
 assert.ok(reason(sim),blocked+' still requires coverage/review');
 if(!['agent','office'].includes(blocked)){sim.updateStaff(ag);assert.equal(task.assigned,null,blocked);}
}
{
 const {sim,ag,task}=fixture();
 // Route failure discovered by the ordinary scheduler must still interrupt waiting.
 sim.goTo=()=>false;sim.updateStaff(ag);
 assert.equal(task.assigned,null);assert.ok(task.unreachable);assert.match(reason(sim),/access/);
}
{
 const {sim,task}=fixture(),wait=new ReserveWait();
 for(const event of [{type:'fault',sev:'critical'},{type:'access_lost'},{type:'power_shed'}])assert.ok(wait.problem(sim,[event]));
 sim.objs('gate')[0].unpowered=true;assert.match(reason(sim),/Equipment/);
 delete sim.objs('gate')[0].unpowered;sim.s.convos.push({id:999,text:'Owner decision'});assert.match(reason(sim),/decision/);
 sim.s.convos=[];task.need='repair_complex';assert.equal(sim.ownerAutoRepairCovered(task),false);
}
{
 const {sim,owner,ag,task}=fixture();sim.updateStaff(ag);
 const data=JSON.parse(JSON.stringify(sim.s)),loaded=new Sim(data);loaded.ensure();
 const lo=loaded.s.staff.find(st=>st.id===owner.id),la=loaded.s.agents.find(a=>a.sid===owner.id);
 assert.equal(loaded.s.tasks.find(t=>t.id===task.id).assigned,owner.id);
 assert.equal(loaded.workRemaining(lo),6.5);
 loaded.updateStaff(la);assert.equal(loaded.workRemaining(lo),6.5,'load does not rebook active work');
 assert.deepEqual(Object.keys(loaded.s).sort(),Object.keys(sim.s).sort(),'no new save fields');
 const pending=fixture();pending.sim.s.t=22*60;
 const reload=new Sim(JSON.parse(JSON.stringify(pending.sim.s)));reload.ensure();
 assert.equal(reload.ownerAutoRepairCovered(reload.s.tasks[0]),true,'unassigned eligible work retains ordinary eligibility on load');
}
{
 const {sim,ag,task}=fixture();sim.s.speed=0;
 const ui=Object.create(UI.prototype);ui.g={sim,acc:0,rend:{setSelection(){}}};ui.title=false;ui.toast=()=>{};ui.sfx=()=>{};
 ui.renderFeed=()=>{};ui.renderTut=()=>{};ui.renderSheet=()=>{};
 ui.pauseForPopup('panel');ui.resumePopup('panel');assert.equal(sim.s.speed,0);
 const source=fs.readFileSync('js/main.js','utf8'),batch=source.slice(source.indexOf('function stepTicks(n)'),source.indexOf('let last = performance.now()'));
 const tick=vm.runInNewContext(batch+';stepTicks',{game:{sim,ui,syncTier(){},drain(){}}});
 const before=structuredClone(sim.s);tick(240);assert.deepEqual(sim.s,before,'paused production batch neither assigns nor advances work');
 assert.equal(task.assigned,null);assert.equal(ag.task,null);
}
const main=fs.readFileSync('js/main.js','utf8');
const batch=main.slice(main.indexOf('function stepTicks(n)'),main.indexOf('let last = performance.now()'));
const recoveredSeed=recovered({settleDecisions:true}).s;
for(const loss of ['policy','agent','office','critical']){
 const sim=new Sim(structuredClone(recoveredSeed));sim.s.cash=1100;sim.s.policies.ownerChores=true;
 sim.s.t=Math.floor(sim.s.t/1440)*1440+22*60; // Off-hours: no immediate Owner assignment.
 const ui=Object.create(UI.prototype),stops=[];
 const game={sim,ui,acc:0,syncTier(){},drain(){sim.events.length=0;}};
 Object.assign(ui,{g:game,title:false,toast(){},renderTut(){},renderFeed(){sim.syncRequestHandling();}});
 const wait=ui.reserveWait=new ReserveWait((reason,a)=>{ui.notePause(0);game.acc=0;stops.push({reason,t:sim.s.t});});
 const tick=vm.runInNewContext(batch+';stepTicks',{game});
 assert.equal(wait.start(sim,yardChoices(sim)[0]).ok,true);
 const original=wait.active,started=original.started,owner=sim.s.staff.find(st=>st.role==='owner');
 const ag=sim.s.agents.find(a=>a.sid===owner.id),office=sim.objs('office')[0];
 const light=sim.objs('light')[0];light.cond=.4;const task=sim.ensureRepairTask(light);
 const baseline=new Sim(structuredClone(sim.s));
 tick(10);for(let i=0;i<10;i++){baseline.syncRequestHandling();baseline.step();baseline.syncRequestHandling();baseline.events.length=0;}
 assert.ok(wait.active,'Owner-covered off-hours work does not interrupt reserve waiting');
 assert.equal(task.assigned,null,'temporary off-hours waiting is real');
 assert.deepEqual(sim.s,baseline.s,'reserve waiting has whole-state parity with ordinary simulation');
 if(loss==='policy')sim.s.policies.ownerChores=false;
 if(loss==='agent')sim.s.agents=sim.s.agents.filter(a=>a!==ag);
 if(loss==='office'){office.cstate='construction';sim.markDirty();}
 if(loss==='critical'){
   const step=sim.step.bind(sim);let n=0;sim.step=()=>{step();if(++n===2)sim.events.push({type:'fault',sev:'critical'});};
 }
 const before=sim.s.t;tick(240);
 assert.equal(sim.s.t,before+(loss==='critical'?2:1),'first minute check detects coverage loss; critical event stops in its minute');
 assert.equal(sim.s.speed,0);assert.equal(wait.pending,original);assert.equal(original.started,started);
 if(loss==='policy')sim.s.policies.ownerChores=true;
 if(loss==='agent')sim.s.agents.push(ag);
 if(loss==='office'){office.cstate='operating';sim.markDirty();}
 assert.equal(wait.resume(sim).ok,true,'explicit Resume after coverage repair');
 assert.equal(wait.active.started,started,'repair review never extends the deadline');wait.stop('Test end');
}
console.log('PASS staff priority, temporary delays, daily reset, disabled/missing coverage, specialist/PM limits, critical interruptions, save/load and paused production clock');
