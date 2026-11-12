// Bounded scarce-inventory hold: one original prospect, no bonus traffic or finance rules.
import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {returningAccount} from '../../js/customeraccounts.js';
import {UI} from '../../js/ui.js';
const test = (name,fn)=>{fn();console.log('PASS '+name)};
function fixture(seed=12) {
  const sim=makeMaple(seed),s=sim.s;
  s.tut={on:false,done:true,flags:{}};s.mode='sandbox';s.t=48*1440;s.convos=[];
  const u=sim.objs('unit').find(x=>x.id===s.unitRoles.mapleTurnover);
  Object.assign(u,{commercial:'ready',cstate:'operating',blocked:false});
  assert.equal(sim.objs('unit').filter(x=>x.commercial==='ready'&&x.size===u.size&&x.env===u.env).length,1);
  let got=false;
  for(let i=0;i<200;i++){s.t=48*1440+10+i;if(returningAccount(s,{size:u.size,climate:false})&&sim.offerReturningCustomer({kind:'online',size:u.size,climate:false})){got=true;break;}}
  assert.ok(got,'valid scheduled online shopper selected from existing demand');
  const pending=s.cr01.pending; assert.equal(pending.scarceUnitId,u.id);
  const account=s.customerAccounts[pending.accountId],c=s.convos.find(x=>x.key==='cr01');
  assert.equal(c.actions[0].action.decision,'hold');
  return {sim,s,u,account,c,pending};
}
function hold(f){const {sim,s,c}=f,r=sim.dispatch({type:'convo',id:c.id,i:0});assert.equal(r.ok,true,r.msg);assert.equal(s.cr01.pending,null);assert.equal(s.cr01.hold.unitId,f.u.id);return s.cr01.hold;}
test('scarce request only: one real eligible unit; no hold fee, bonus prospect or RNG draw',()=>{
 const f=fixture(),{s}=f,cash=s.cash,rng=s.rngS,pcount=s.today.prospects;
 const h=hold(f);assert.equal(h.until-s.t,1440);assert.equal(s.cash,cash);assert.equal(s.rngS,rng);assert.equal(s.today.prospects,pcount);
 assert.equal(f.u.commercial,'ready');assert.equal(f.u.lease,null);
});
test('competing ordinary shopper is actually blocked, not reported as guaranteed lost signing',()=>{
 const f=fixture(),{sim,s,u}=f;const h=hold(f);const prev=Object.keys(s.leases).length;
 const result=sim.decideLease({kind:'online',size:u.size,climate:false},null);
 assert.equal(result,null);assert.equal(h.competingRequests,1);assert.equal(s.lost.ownerHeld,1);
 assert.equal(s.today.prospects,1);assert.equal(s.today.lost,1);assert.equal(Object.keys(s.leases).length,prev);
 assert.equal(f.account.events.at(-1).kind,'competing_demand');
});
test('owner may cancel exactly once; unit returns to ordinary shoppers without money change',()=>{
 const f=fixture(),{sim,s,u}=f,h=hold(f),cash=s.cash;
 const ui=Object.create(UI.prototype);ui.g={sim};const html=ui.customerAccountsHtml();assert.match(html,/Cancel hold and reopen unit/);assert.match(html,/cr01CancelHold/);
 const r=sim.dispatch({type:'cr01CancelHold',requestId:h.requestId});assert.equal(r.ok,true,r.msg);assert.equal(s.cr01.hold,null);
 assert.equal(s.cash,cash);assert.equal(s.today.lost,1);
 assert.equal(sim.dispatch({type:'cr01CancelHold',requestId:h.requestId}).ok,false);
 const prior=s.today.prospects;sim.rnd=()=>0;const lease=sim.decideLease({kind:'online',size:u.size,climate:false},null);
 assert.ok(lease);assert.equal(s.today.prospects,prior+1);assert.equal(f.account.events.at(-1).kind,'hold_cancelled');
});
test('save/reload preserves remaining time, manual Pause freezes game clock, exactly one conversion',()=>{
 const f=fixture(),{s,u}=f,h=hold(f),before=s.cash;
 s.t+=120;const loaded=new Sim(structuredClone(s));
 assert.deepEqual(loaded.s.cr01.hold,h);assert.equal(loaded.s.cr01.hold.until-loaded.s.t,1320);
 loaded.s.speed=0;const stamp=loaded.s.t; // UI does not call step when speed 0
 assert.equal(loaded.s.t,stamp);assert.equal(loaded.s.cr01.hold.until-stamp,1320);
 loaded.s.t=loaded.s.cr01.hold.until-1;
 const originalRnd=loaded.rnd.bind(loaded);loaded.rnd=()=>0;
 loaded.step();loaded.rnd=originalRnd;
 assert.equal(loaded.s.cr01.hold,null);
 assert.equal(loaded.s.today.prospects,1);
 assert.equal(loaded.s.customerAccounts[f.account.id].leaseIds.length,f.account.leaseIds.length+1);
 assert.ok(loaded.s.cash>before);
 const after=loaded.s.cash;loaded.cr01HoldTick();assert.equal(loaded.s.cash,after,'no second roll after resolution');
 const back=new Sim(structuredClone(loaded.s));assert.equal(back.s.cr01.hold,null);assert.equal(back.s.cash,after);
});
test('unsuccessful held conversion clears hold with no rent or duplicate prospect',()=>{
 const f=fixture(),{sim,s,u}=f;hold(f);const cash=s.cash,leases=Object.keys(s.leases).length;
 s.t=s.cr01.hold.until;sim.rnd=()=>0.999999;
 sim.cr01HoldTick();assert.equal(s.cr01.hold,null);assert.equal(s.cash,cash);assert.equal(Object.keys(s.leases).length,leases);
 assert.equal(s.today.prospects,1);assert.equal(s.today.lost,1);assert.equal(f.account.events.at(-1).kind,'hold_unfilled');
});
test('expired hold on no-longer-ready unit is idempotent; existing independent leases retained',()=>{
 const f=fixture(),{sim,s,u}=f;hold(f);const prior=[...f.account.leaseIds],cash=s.cash;
 u.commercial='unready';s.t=s.cr01.hold.until;sim.cr01HoldTick();
 assert.equal(s.cr01.hold,null);assert.equal(s.cash,cash);assert.deepEqual(f.account.leaseIds,prior);
 assert.equal(s.today.prospects,1);assert.equal(s.today.lost,1);sim.cr01HoldTick();assert.equal(s.today.prospects,1);
});
console.log('CR-01 scarce inventory hold checks complete');
