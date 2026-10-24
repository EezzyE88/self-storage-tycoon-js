import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||'.');
const {makeMaple}=await import(pathToFileURL(root+'/js/maple.js'));
const {UI}=await import(pathToFileURL(root+'/js/ui.js'));
let failed=0;
function test(label,fn){try{fn();console.log('PASS '+label);}catch(e){failed++;console.error('FAIL '+label+': '+e.message);}}
function fixture(){const sim=makeMaple(4401);sim.s.tut={on:false,done:true};sim.ensure();return sim;}
test('failed owner assignment retains the conversation and refusal reason',()=>{
 const sim=fixture(),lamp=sim.objs('light')[0];lamp.cond=.1;const task=sim.ensureRepairTask(lamp),owner=sim.s.staff.find(s=>s.role==='owner');owner.workDay=sim.day;owner.workUsed=sim.workCapacity(owner);
 sim.convo({key:'light-report',text:'Assign repair',obj:lamp.id,actions:[{label:'Assign repair',action:{type:'ownerTask',task:task.id,forceOwner:true}}]});const c=sim.s.convos.at(-1),time=sim.s.t;
 const r=sim.dispatch({type:'convo',id:c.id,i:0});assert.equal(r.ok,false);assert.match(r.msg,/available|needs/i);assert.ok(sim.s.convos.includes(c));assert.equal(sim.s.t,time);
});
test('successful conversation answer closes once without automatic clock advance',()=>{
 const sim=fixture();sim.convo({key:'okay',text:'Okay',actions:[{label:'Noted'}]});const c=sim.s.convos.at(-1),t=sim.s.t;
 assert.ok(sim.dispatch({type:'convo',id:c.id,i:0}).ok);assert.ok(!sim.s.convos.includes(c));assert.equal(sim.s.speed,0);assert.equal(sim.s.t,t);
});
test('actual ready inventory never reports no units ready',()=>{
 const sim=fixture(),u=sim.objs('unit')[0];u.cstate='operating';u.commercial='ready';u.blocked=false;
 assert.equal(sim.availabilityReport(u.size).availability,'ready');assert.match(sim.availabilityReport(u.size).text,/ready to rent/);assert.doesNotMatch(sim.availabilityReport(u.size).text,/No .* ready/);
});
test('commissioning hint precedes ordinary repair and turnover distractions',()=>{
 const sim=fixture();const u=sim.objs('unit')[0];u.cstate='ready';for(const x of sim.objs('unit'))x.blocked=false;
 const ui=Object.create(UI.prototype);ui.g={sim};const state=JSON.stringify(sim.s),hint=ui.coachHint();assert.match(hint.text,/ready to commission/);assert.equal(hint.act.sel,u.id);assert.equal(JSON.stringify(sim.s),state);
});
console.log(failed?'SOME FAILED':'ALL PASS: year-one report repairs');process.exitCode=failed?1:0;
