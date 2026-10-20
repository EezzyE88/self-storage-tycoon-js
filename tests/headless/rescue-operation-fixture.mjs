import assert from 'node:assert/strict';
import {makeScenario} from '../../js/scenarios.js';
export function rescued(){const sm=makeScenario('comeback',4401);for(let i=0;sm.s.scenario.status!=='won'&&i<4*1440;i++){if(i%30===0)for(const t of sm.s.tasks)if(!t.assigned)sm.dispatch({type:'ownerTask',task:t.id,forceOwner:true});sm.step();sm.events=[];}assert.equal(sm.s.scenario.status,'won');sm.dispatch({type:'comebackAck'});sm.s.speed=0;return sm;}
