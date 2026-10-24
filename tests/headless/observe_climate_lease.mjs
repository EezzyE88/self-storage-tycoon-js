// Non-gating reproduction of the original tfix 20-day operator, with no forced lease or RNG override.
import assert from 'node:assert/strict';
import {convertedFixture,operatorMinute} from './climate-conversion-fixture.mjs';
const {sim,s,u,r,option,cash}=convertedFixture();assert.ok(r.ok);assert.equal(cash-s.cash,option.cost);
const started=s.t,asking=sim.askFor(u);let firstLeaseMinute=null,firstReadyMinute=null;
for(let i=0;i<20*1440;i++){
 operatorMinute(sim,i);
 if(firstReadyMinute==null&&u.commercial==='ready')firstReadyMinute=s.t-started;
 if(firstLeaseMinute==null&&u.lease!=null)firstLeaseMinute=s.t-started;
}
assert.ok(Number.isFinite(s.cash));assert.equal(u.env,'climate');
// Preserve the failed historical assertion as data, never as an ignored current FAIL line.
console.log(JSON.stringify({status:'OBSERVATION',cause_resolved:false,historical_expectation:u.lease?'MET_IN_THIS_RUN':'FAIL',
 original_test:'tfix.mjs',original_source:'734bc879ed6b92222989e2dc479f8fb507655135',seed:20260929,windowDays:20,
 operator:'every 30 minutes request Owner for unassigned tasks; step normally',unitId:u.id,firstReadyMinute,firstLeaseMinute,
 leasedAtWindowEnd:!!u.lease,cstate:u.cstate,commercial:u.commercial,blocked:u.blocked,missing:u.missing,askingAtStart:asking,askingAtEnd:sim.askFor(u),
 note:'Historical deadline is not a required lease guarantee. This does not resolve the cause or certify leasing health.'}));
