import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {makeScenario,makeSandbox} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {installTutorial} from '../../js/tutorial.js';
const base=process.env.SST_BASELINE_36;if(!base)throw new Error('SST_BASELINE_36 must be an immutable Candidate 36 export');
const old=await import(pathToFileURL(base+'/js/scenarios.js'));const oldMaple=await import(pathToFileURL(base+'/js/maple.js'));const oldTutorial=await import(pathToFileURL(base+'/js/tutorial.js'));
let ticks=0;for(const kind of ['maple','business','turnaround','vertical','climate']){const pair=kind==='maple'?[oldMaple.makeMaple(91),makeMaple(91)]:kind==='business'?[old.makeSandbox({start:'starter'}),makeSandbox({start:'starter'})]:[old.makeScenario(kind),makeScenario(kind)];oldTutorial.installTutorial(pair[0]);installTutorial(pair[1]);for(let i=0;i<10080;i++){for(const sm of pair)sm.step();assert.deepEqual(pair[1].events,pair[0].events,kind+' events '+i);for(const sm of pair)sm.events.length=0;if(i%60===0||i===10079)assert.deepEqual(pair[1].s,pair[0].s,kind+' full state '+i);ticks++;}console.log('PASS Candidate36 exact state/event/RNG parity: '+kind+' 10080 ticks');}
const pair=[old.makeScenario('comeback'),makeScenario('comeback')];for(const sm of pair)sm.dispatch({type:'hire',role:'porter'});
function requests(sm){for(const c of [...sm.s.convos]){const i=c.actions.findIndex(a=>!sm.requestActionDisabled(a)&&!a.action);if(i>=0)sm.dispatch({type:'convo',id:c.id,i});}}
let first=null,finished=false;const args={tool:'du5x10',a:{x:10,y:3},b:{x:10,y:3},f:0,rot:0};
for(let i=0;i<90*1440;i++){
 for(const sm of pair){requests(sm);if(sm.s.scenario.status==='active'&&i%5===0){const tk=sm.s.tasks.find(t=>!t.assigned&&sm.s.scenario.targets.some(x=>x.ids.includes(t.obj)));if(tk)sm.dispatch({type:'delegateTask',task:tk.id});}if(sm.s.scenario.status==='won'&&!sm.s.scenario.acknowledged){sm.dispatch({type:'comebackAck'});sm.dispatch({type:'policy',key:'ownerChores',v:true});}if(i%60===0){for(const tk of sm.s.tasks.filter(t=>!t.assigned)){if(tk.type==='repair')sm.dispatch({type:'ownerTask',task:tk.id});else sm.dispatch({type:'delegateTask',task:tk.id});}}}
 if(i%60===0&&!first){const views=pair.map(sm=>sm.growthReadiness(sm.plan(args)));assert.deepEqual(views[1],views[0]);const readiness=views[1];if(readiness.justified){first={day:pair[1].day,cash:pair[1].s.cash,cost:pair[1].plan(args).cost,range:readiness.investment.range};for(const sm of pair)assert.ok(sm.dispatch({type:'build',...args}).ok);}}
 for(const sm of pair){if(first&&sm.objs('unit').some(u=>u.cstate==='ready'))sm.dispatch({type:'commission',all:true});sm.step();}
 assert.deepEqual(pair[1].events,pair[0].events,'Comeback events '+i);for(const sm of pair)sm.events.length=0;if(i%60===0)assert.deepEqual(pair[1].s,pair[0].s,'Comeback full core state '+i);ticks++;
 if(first&&pair[1].objs('unit').length===24&&pair[1].objs('unit').every(u=>u.cstate==='operating')){finished=true;break;}
}
assert.ok(first);assert.ok(finished);assert.ok(pair[1].s.milestones.first_expansion);assert.equal(pair[1].s.loan.bal,0);assert.equal(pair[1].s.debt.length,0);assert.equal(pair[1].s.opts,undefined);assert.deepEqual(pair[1].s,pair[0].s);
console.log('PASS organic rescue → justified investment → commissioning; no loans, cash injection or coefficients changed: '+JSON.stringify(first));console.log('PASS '+ticks+' paired ticks; full state hourly and every event compared, no field exclusions. Comeback core run deliberately omits tutorial callbacks; generic lessons tested separately.');
