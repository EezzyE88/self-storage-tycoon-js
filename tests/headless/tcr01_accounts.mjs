// CR-01 minimum journey, isolated from published/accepted source.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Sim } from '../../js/sim.js';
import { makeMaple } from '../../js/maple.js';
import { UI } from '../../js/ui.js';
import { ensureCustomerAccounts, customerHistory, returningAccount } from '../../js/customeraccounts.js';
const t=(name,fn)=>{fn();console.log('PASS '+name);};
const fixture=(seed=12)=>{
 const sim=makeMaple(seed),s=sim.s;
 s.tut={on:false,done:true,flags:{}};
 s.mode='sandbox';
 s.t=48*1440;
 s.convos=[];
 const free=sim.objs('unit').find(u=>u.id===s.unitRoles.mapleTurnover);
 Object.assign(free,{commercial:'ready',cstate:'operating',blocked:false});
 return {sim,s,free};
};
t('legacy migration preserves tenant IDs, leases, cash and RNG; never joins duplicate names',()=>{
 const {sim,s}=fixture();const old=structuredClone(s);delete old.customerAccounts;delete old.cr01;
 for(const tn of Object.values(old.tenants))delete tn.accountId;
 const tx=Object.values(old.tenants).slice(0,2);tx[1].name=tx[0].name;
 const rng=old.rngS,cash=old.cash,ids=old.nextId,leaseCount=Object.keys(old.leases).length;
 const loaded=new Sim(old);
 assert.equal(loaded.s.rngS,rng);assert.equal(old.cash,cash);assert.equal(old.nextId,ids);
 assert.equal(Object.keys(old.leases).length,leaseCount);
 assert.notEqual(tx[0].accountId,tx[1].accountId);
 assert.equal(Object.keys(old.customerAccounts).length,Object.keys(old.tenants).length);
 assert.ok(Object.values(old.customerAccounts).every(a=>a.events.length===0));
});
t('the returning inquiry replaces an existing online shopper and waits for the player',()=>{
 const {sim,s,free}=fixture(23);
 let offered=false;
 for(let i=0;i<200;i++){
  s.t=48*1440+10+i;
  if(returningAccount(s,{size:free.size,climate:false})) {offered=sim.offerReturningCustomer({kind:'online',size:free.size,climate:false});break;}
 }
 assert.equal(offered,true);assert.equal(s.convos.filter(c=>c.key==='cr01').length,1);
 assert.equal(s.cr01.pending?.prospect.size,free.size);
 assert.equal(s.today.prospects,0);assert.equal(s.today.leases,0);
 assert.equal(s.convos[0].auto,undefined);
 assert.equal(s.customerAccounts[s.cr01.pending.accountId].events.at(-1).kind,'request');
});
t('decline is a valid unfilled outcome, without funds or extra tenant, while keeping accounts',()=>{
 const {sim,s,free}=fixture();let found=false;
 for(let i=0;i<200;i++){s.t=48*1440+10+i;if(sim.offerReturningCustomer({kind:'online',size:free.size,climate:false})){found=true;break;}}
 assert.equal(found,true);
 const oldCash=s.cash,oldLeases=Object.keys(s.leases).length,oldRng=s.rngS,account=s.customerAccounts[s.cr01.pending.accountId];
 const cv=s.convos.find(c=>c.key==='cr01');
 assert.equal(sim.dispatch({type:'convo',id:cv.id,i:1}).ok,true);
 assert.equal(s.cr01.pending,null);assert.equal(s.cash,oldCash);assert.equal(s.rngS,oldRng);
 assert.equal(Object.keys(s.leases).length,oldLeases);assert.equal(account.events.at(-1).kind,'deferred');
 assert.equal(s.today.prospects,1);assert.equal(s.today.lost,1);
 assert.equal(s.lost.ownerDeferred,1);assert.equal(s.lost.shopping||0,0);
});
t('acceptance uses normal leasing rules, independent obligations, partial move-out and reload',()=>{
 const {sim,s,free}=fixture();let found=false;
 for(let i=0;i<200;i++){s.t=48*1440+10+i;if(sim.offerReturningCustomer({kind:'online',size:free.size,climate:false})){found=true;break;}}
 assert.equal(found,true);
 const request=s.cr01.pending,account=s.customerAccounts[request.accountId],prior=[...account.leaseIds];
 const oldRents=prior.map(id=>s.leases[id]?.rent),oldCash=s.cash;
 const cv=s.convos.find(c=>c.key==='cr01');
 // Existing price/suitability behavior remains authoritative. A valid low draw may convert.
 const originalRnd=sim.rnd.bind(sim);sim.rnd=()=>0;
 const result=sim.dispatch({type:'convo',id:cv.id,i:0});sim.rnd=originalRnd;
 assert.equal(result.ok,true,result.msg);
 assert.equal(account.leaseIds.length,prior.length+1);
 const second=account.leaseIds.find(id=>!prior.includes(id));const L=s.leases[second];
 assert.equal(L.rent,sim.askFor(free));assert.equal(L.status,'current');
 assert.equal(s.cash,oldCash+L.rent);assert.equal(s.today.prospects,1);
 assert.deepEqual(prior.map(id=>s.leases[id]?.rent),oldRents);
 assert.notEqual(s.leases[prior[0]].tenant,L.tenant);
 assert.equal(s.tenants[L.tenant].accountId,s.tenants[s.leases[prior[0]].tenant].accountId);
 L.status='pastdue';L.balance=L.rent+20;L.fees=20;
 assert.equal(s.leases[prior[0]].status,'current');assert.equal(s.leases[prior[0]].balance,0);
 const saved=structuredClone(s);const reload=new Sim(saved);
 assert.equal(saved.customerAccounts[request.accountId].leaseIds.length,prior.length+1);
 assert.equal(saved.leases[second].balance,L.rent+20);
 reload.endLease(saved.leases[second],'moveout');
 assert.equal(saved.customerAccounts[request.accountId].leaseIds.length,prior.length);
 assert.ok(saved.leases[prior[0]]);assert.ok(saved.tenants[saved.leases[prior[0]].tenant]);
 assert.equal(saved.customerAccounts[request.accountId].events.at(-1).kind,'lease_closed');
 const reloadedAgain=new Sim(structuredClone(saved));
 assert.equal(reloadedAgain.s.customerAccounts[request.accountId].leaseIds.length,prior.length);
 assert.equal(reloadedAgain.s.customerAccounts[request.accountId].events.at(-1).kind,'lease_closed');
});
t('unsuitable demand legitimately fails without changing existing obligations',()=>{
 const {sim,s,free}=fixture();let found=false;
 for(let i=0;i<200;i++){s.t=48*1440+10+i;if(sim.offerReturningCustomer({kind:'online',size:'10x20',climate:true})){found=true;break;}}
 assert.equal(found,true);for(const u of sim.objs('unit')){u.commercial='occupied';}
 const p=s.cr01.pending, account=s.customerAccounts[p.accountId],prior=[...account.leaseIds],cash=s.cash;
 const cv=s.convos.find(c=>c.key==='cr01');const result=sim.dispatch({type:'convo',id:cv.id,i:0});
 assert.equal(result.ok,true);assert.equal(s.cash,cash);assert.deepEqual(account.leaseIds,prior);
 assert.equal(account.events.at(-1).kind,'unfilled');assert.equal(s.today.lost,1);
});
t('history is bounded; 150-account migration and readable default view remain bounded',()=>{
 const {sim,s}=fixture();const proto=Object.values(s.tenants)[0];
 const leaseTemplate=s.leases[proto.lease],unitTemplate=s.objects[leaseTemplate.unit];
 for(let i=0;i<155;i++){
  const id=100000+i,leaseId=200000+i,unitId=300000+i;
  s.tenants[id]={...proto,id,accountId:undefined,name:`Customer ${i}`,lease:leaseId,since:10};
  s.leases[leaseId]={...leaseTemplate,id:leaseId,tenant:id,unit:unitId};
  s.objects[unitId]={...unitTemplate,id:unitId,num:4000+i,name:`Unit ${4000+i}`,lease:leaseId,commercial:'occupied'};
 }
 const start=performance.now();ensureCustomerAccounts(s);const migrationMs=performance.now()-start;
 const account=s.customerAccounts[Object.values(s.tenants)[0].accountId];for(let i=0;i<100;i++)customerHistory(account,i,'info',`Recorded factual event ${i}`);
 assert.equal(account.events.length,24);assert.equal(account.events[0].day,76);
 assert.ok(Object.keys(s.customerAccounts).length>=150);
 assert.ok(Object.values(s.customerAccounts).filter(a=>a.leaseIds.length>0).length>=150);
 const ui=Object.create(UI.prototype);ui.g={sim};
 const uiStart=performance.now();const html=ui.customerAccountsHtml(),uiMs=performance.now()-uiStart;
 assert.match(html,/Customer relationships/);assert.match(html,/Show all/);
 assert.equal((html.match(/class="item customer-account"/g)||[]).length,8);
 ui.accountListAll=true;const all=ui.customerAccountsHtml();
 assert.equal((all.match(/class="item customer-account"/g)||[]).length,Object.keys(s.customerAccounts).length);
 assert.ok(migrationMs<1000 && uiMs<1000,`Migration ${migrationMs.toFixed(2)}ms, UI ${uiMs.toFixed(2)}ms`);
 console.log(`  ${Object.keys(s.customerAccounts).length} accounts: migration ${migrationMs.toFixed(1)}ms, default HTML ${uiMs.toFixed(1)}ms`);
});
console.log('CR-01 focused checks complete');
