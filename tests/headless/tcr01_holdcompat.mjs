// CR-01 immediate offer: saves written by the withdrawn scarce-unit hold build (20aef61) load safely.
// Fixture: a real 20aef61 save code captured mid-hold in the rendered check (Day 50, 1320 game minutes left).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Sim} from '../../js/sim.js';
const raw=JSON.parse(readFileSync(new URL('./fixtures/cr01_hold_build_midHold_20aef61.json',import.meta.url),'utf8'));
const prop=()=>structuredClone(raw.props[raw.active].s);
const t=(name,fn)=>{fn();console.log('PASS '+name);};
const step=(sim,n)=>{for(let i=0;i<n;i++){sim.step();sim.events.length=0;}};
const prospects=s=>s.today?.prospects??0;
t('real hold-build save: hold becomes one pending request; no lease, money, RNG, ID or card at load',()=>{
 const s=prop(),h=structuredClone(s.cr01.hold);assert.ok(h&&h.until>s.t);
 const cash=s.cash,rng=s.rngS,ids=s.nextId,leases=Object.keys(s.leases).length,tenants=Object.keys(s.tenants).length,accounts=Object.keys(s.customerAccounts).length,held=s.lost.ownerHeld,p=prospects(s);
 const sim=new Sim(s);
 assert.equal(Object.hasOwn(s.cr01,'hold'),false);
 assert.deepEqual(s.cr01.pending,{id:h.requestId,accountId:h.accountId,prospect:{size:h.prospect.size,climate:!!h.prospect.climate,ad:h.prospect.ad??null,kind:h.prospect.kind}});
 assert.equal(s.cash,cash);assert.equal(s.rngS,rng);assert.equal(s.nextId,ids);assert.equal(prospects(s),p);
 assert.equal(Object.keys(s.leases).length,leases);assert.equal(Object.keys(s.tenants).length,tenants);assert.equal(Object.keys(s.customerAccounts).length,accounts);
 assert.equal(s.lost.ownerHeld,held,'historical competing count kept, not re-counted');
 assert.equal(s.convos.some(c=>c.key==='cr01'),false,'card is not created during load');
 assert.equal(s.customerAccounts[h.accountId].events.at(-1).kind,'hold_reopened');
 const again=new Sim(structuredClone(s));assert.deepEqual(again.s,s,'second load changes nothing');
});
t('reopened request shows the immediate Offer / Wait card once time runs, and Offer converts at most once',()=>{
 const sim=new Sim(prop()),s=sim.s,acct=s.customerAccounts[s.cr01.pending.accountId],prior=acct.leaseIds.length;
 step(sim,5);const cards=s.convos.filter(c=>c.key==='cr01');assert.equal(cards.length,1);
 assert.deepEqual(cards[0].actions.map(a=>[a.label,a.action.decision]),[['Offer a suitable unit','check'],['Wait / not now','wait']]);
 step(sim,10);assert.equal(s.convos.filter(c=>c.key==='cr01').length,1,'no duplicate card');
 const p=prospects(s),cash=s.cash;const rnd=sim.rnd;sim.rnd=()=>0;const r=sim.dispatch({type:'convo',id:cards[0].id,i:0});sim.rnd=rnd;
 assert.equal(r.ok,true,r.msg);assert.equal(s.cr01.pending,null);assert.equal(prospects(s),p+1,'the held shopper is counted exactly once');
 assert.equal(acct.leaseIds.length,prior+1);const L=s.leases[acct.leaseIds.at(-1)];assert.equal(s.cash,cash+L.rent);
 assert.notEqual(L.tenant,s.leases[acct.leaseIds[0]].tenant);assert.equal(s.tenants[L.tenant].accountId,acct.id);
 step(sim,30);assert.equal(acct.leaseIds.length,prior+1,'no second conversion');assert.equal(s.cr01.pending,null);
});
t('Wait on the reopened request: no lease or money, one deferred loss',()=>{
 const sim=new Sim(prop()),s=sim.s;step(sim,5);const c=s.convos.find(x=>x.key==='cr01'),cash=s.cash,leases=Object.keys(s.leases).length,d=s.lost.ownerDeferred||0,p=prospects(s);
 assert.equal(sim.dispatch({type:'convo',id:c.id,i:1}).ok,true);
 assert.equal(s.cash,cash);assert.equal(Object.keys(s.leases).length,leases);assert.equal(s.lost.ownerDeferred,d+1);assert.equal(prospects(s),p+1);
});
t('hold plus a second pending request: hold released without a rental or count, pending request kept',()=>{
 const s=prop(),h=s.cr01.hold,other=Object.values(s.customerAccounts).find(a=>a.id!==h.accountId&&a.leaseIds.length);
 s.cr01.pending={id:'return-1-'+other.id,accountId:other.id,prospect:{size:'10x10',climate:false,ad:null,kind:'online'},scarceUnitId:null};
 const pend=structuredClone(s.cr01.pending);delete pend.scarceUnitId;const p=prospects(s),cash=s.cash;
 new Sim(s);assert.equal(Object.hasOwn(s.cr01,'hold'),false);assert.deepEqual(s.cr01.pending,pend);
 assert.equal(prospects(s),p);assert.equal(s.cash,cash);assert.equal(s.customerAccounts[h.accountId].events.at(-1).kind,'hold_released');
});
t('hold-type request card from the hold build is rewritten to the immediate choice and works',()=>{
 const s=prop(),h=s.cr01.hold;delete s.cr01.hold;const acct=s.customerAccounts[h.accountId];
 s.cr01.pending={id:h.requestId,accountId:acct.id,prospect:{...h.prospect},scarceUnitId:h.unitId};
 s.convos.push({id:999999,t:s.t,ttl:4320,key:'cr01',who:acct.name,sev:'attention',text:'I already rent here.',def:1,actions:[{label:'Hold unit for 24h',action:{type:'cr01Reply',requestId:h.requestId,decision:'hold'}},{label:'Keep unit available',action:{type:'cr01Reply',requestId:h.requestId,decision:'wait'}}]});
 const sim=new Sim(s);const c=s.convos.find(x=>x.key==='cr01');
 assert.equal(Object.hasOwn(s.cr01.pending,'scarceUnitId'),false);
 assert.deepEqual(c.actions.map(a=>[a.label,a.action.decision]),[['Offer a suitable unit','check'],['Wait / not now','wait']]);
 const rnd=sim.rnd;sim.rnd=()=>0;const r=sim.dispatch({type:'convo',id:c.id,i:0});sim.rnd=rnd;assert.equal(r.ok,true,r.msg);assert.equal(s.cr01.pending,null);
});
t('reopened request for a customer with no active rental is closed, not shown',()=>{
 const s=prop(),h=s.cr01.hold,acct=s.customerAccounts[h.accountId];
 const sim=new Sim(s);for(const id of [...acct.leaseIds])sim.endLease(s.leases[id],'moveout');
 const p=prospects(s);step(sim,5);assert.equal(s.cr01.pending,null);assert.equal(s.convos.some(c=>c.key==='cr01'),false);assert.equal(prospects(s),p);
});
t('ordinary saves without a hold are untouched by the compatibility step',()=>{
 const s=prop();delete s.cr01.hold;const before=JSON.stringify(s);const sim=new Sim(s);assert.equal(JSON.stringify(sim.s),before);
});
console.log('CR-01 hold-save compatibility checks complete');
