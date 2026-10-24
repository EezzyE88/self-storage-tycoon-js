// Exact original tfix setup, factored for deterministic readiness and a separate observation.
import {makeMaple} from '../../js/maple.js';
export function convertedFixture(){
 const sim=makeMaple(),s=sim.s;s.tut={on:false,beat:99,flags:{},done:true};s.mode='sandbox';s.open=true;s.creative=true;
 const hvac=sim.dispatch({type:'build',tool:'hvac',a:{x:14,y:8},b:{x:14,y:8},f:0});s.creative=false;
 for(let i=0;i<1440*2;i++){sim.step();sim.events.length=0;}
 const u=sim.objs('unit').find(x=>x.access==='interior'&&x.lease);if(!u)throw Error('Original leased interior fixture unavailable');
 sim.endLease(s.leases[u.lease],'moveout');const option=sim.renovateOptions(u).find(o=>o.kind==='climate');if(!option?.ok)throw Error('Original conversion prerequisite unavailable');
 const cash=s.cash,id=u.id,num=u.num,asking=sim.askFor(u),r=sim.dispatch({type:'renovate',unit:u.id,kind:'climate'});
 return {sim,s,u,hvac,option,cash,id,num,asking,r};
}
export function operatorMinute(sim,i){
 if(i%30===0)for(const task of sim.s.tasks.filter(t=>!t.assigned))sim.dispatch({type:'ownerTask',task:task.id});
 sim.step();sim.events.length=0;
}
