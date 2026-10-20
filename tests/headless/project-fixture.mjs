import { makeScenario } from '../../js/scenarios.js';
export function recovered() {
  const sm = makeScenario('comeback',4401);
  for(let i=0;i<20*1440;i++){
    if(i%30===0){for(const t of [...sm.s.tasks])if(!t.assigned&&!t.vendor)sm.dispatch({type:'ownerTask',task:t.id,forceOwner:true});for(const c of [...sm.s.convos]){const j=c.actions.findIndex(a=>!sm.requestActionDisabled(a)&&!a.action);if(j>=0)sm.dispatch({type:'convo',id:c.id,i:j});}}
    sm.step();sm.events.length=0;
    if(sm.s.scenario.status==='won'&&!sm.s.scenario.acknowledged)sm.dispatch({type:'comebackAck'});
  }
  sm.s.speed=0; return sm;
}
