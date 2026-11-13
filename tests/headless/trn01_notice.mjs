// RN-01A–E: focused real Sim source checks; no browser/physical device claim.
import assert from 'node:assert/strict';
import { Sim, newState } from '../../js/sim.js';
import { MIN_PER_DAY } from '../../js/data.js';
import { financialTime } from '../../js/finance.js';
let passes=0;
function test(name,fn){fn();passes++;console.log('PASS '+name)}
const key='10x10|std';
const tm=(day,minute=360)=>(day-1)*MIN_PER_DAY+minute;
function fixture({noticeDay=190,minute=360,nextBill=221,rent=100,ask=180}={}){
 const s=newState({mode:'sandbox'});s.mode='sandbox';s.open=true;s.market.ask[key]=ask;
 s.objects[999]={id:999,type:'unit',size:'10x10',env:'std',num:1010,x:5,y:5,f:0,w:2,h:2,dir:[0,1],access:'drive',cond:1,cstate:'operating'};
 s.leases[22]={id:22,unit:999,tenant:77,rent,start:1,nextBill,status:'current',balance:0,fees:0};
 s.tenants[77]={id:77,name:'Tenant One',lease:22,sat:.8};s.unitNumbering.next[0]=1011;s.t=tm(noticeDay,minute);s.finance.lastDay=noticeDay-1;
 const sim=new Sim(s);sim.rnd=()=>0;return {s,sim,L:s.leases[22],tn:s.tenants[77]};
}
function bill(f,day){f.s.t=financialTime(day);f.s.finance.lastDay=day-1;assert.equal(f.sim.financialBatch(),true);}
const notify=f=>f.sim.act_rentReview({key,pct:0.1});
test('A: 30-day notice does not change rent, satisfaction, cash, or rent roll',()=>{
 const f=fixture(),{s,L,tn,sim}=f;const cash=s.cash, value=s.exp.value,roll=sim.rentRoll();
 assert.ok(notify(f).ok);assert.equal(L.rent,100);assert.equal(tn.sat,.8);assert.equal(s.cash,cash);assert.equal(s.exp.value,value);assert.equal(sim.rentRoll(),roll);
 assert.equal(L.rentNotice.issuedAt,s.t);assert.equal(L.rentNotice.effectiveDay,221);assert.equal(L.rentNotice.expiresDay,281);
 assert.equal(sim.rentReviewCands(key).length,0);assert.equal(notify(f).ok,false);
});
test('A/B: billing day applies exactly once before charging and starts existing impacts then',()=>{
 const f=fixture(),{L,tn,s,sim}=f;notify(f);const before=s.exp.value;
 bill(f,221);assert.equal(L.rent,110);assert.equal(L.prevRent,100);assert.equal(L.nextBill,251);assert.equal(L.incT,s.t);
 assert.equal(tn.sat,.8-.16);assert.ok(Math.abs(s.exp.value-(before-.1))<1e-9);assert.ok(!L.rentNotice);
 assert.ok(s.ledger.some(x=>x.cat==='rent'&&x.amt===110));const cash=s.cash;
 assert.equal(sim.financialBatch(),false);assert.equal(s.cash,cash);
});
test('A/B: 30 *complete* days, not merely calendar day number; no mid-cycle increase',()=>{
 const f=fixture({noticeDay:190,minute:600,nextBill:220});notify(f);
 assert.equal(f.L.rentNotice.effectiveDay,250);
 bill(f,220);assert.equal(f.L.rent,100);assert.ok(f.s.ledger.some(x=>x.cat==='rent'&&x.amt===100));
 bill(f,250);assert.equal(f.L.rent,110);
});
test('zero-value: reject rounded $0 increases without changes and preview shows none',()=>{
 const f=fixture({rent:10,ask:100});const before=JSON.stringify(f.s);
 assert.equal(f.sim.rentReviewPreview(key,.01).n,0);
 assert.equal(f.sim.act_rentReview({key,pct:.01}).ok,false);
 assert.equal(JSON.stringify(f.s.leases),JSON.stringify(JSON.parse(before).leases));
});
test('C: advance rate complaint retains same choices and can cancel with six-month hold',()=>{
 const f=fixture();notify(f);f.sim.pricingConvo(f.L);
 const c=f.s.convos.find(x=>x.key==='rate22');assert.ok(c);assert.match(c.text,/will increase/);assert.equal(c.actions.length,3);
 const prevSat=f.tn.sat,now=f.s.t;const r=f.sim.act_cv({op:'rateHold',lease:f.L.id});
 assert.ok(r.ok);assert.equal(f.L.rent,100);assert.equal(f.L.rentNotice,undefined);
 assert.equal(f.L.holdUntil,now+180*MIN_PER_DAY);assert.equal(f.tn.sat,prevSat+.08);
 assert.equal(f.sim.rentReviewCands(key).length,0);
});
test('C: explain and ignore preserve existing response magnitude without premature price impact',()=>{
 const f=fixture();notify(f);assert.equal(f.sim.act_cv({op:'rateExplain',lease:22}).ok,true);assert.equal(f.tn.sat,.78);
 assert.equal(f.sim.act_cv({op:'rateIgnore',lease:22}).ok,true);assert.ok(Math.abs(f.tn.sat-.71)<1e-9);
 assert.equal(f.L.rent,100);bill(f,221);assert.ok(Math.abs(f.tn.sat-.55)<1e-9);
});
test('D: delinquency suspends notice, preserves old charges, and recovers next billing cycle',()=>{
 const f=fixture();notify(f);f.L.status='pastdue';f.L.balance=100;f.L.dueSince=220;f.sim.rnd=()=>.99;
 bill(f,221);assert.equal(f.L.rent,100);assert.equal(f.L.balance,200);assert.equal(f.L.nextBill,251);assert.ok(f.L.rentNotice);
 f.sim.payUp(f.L,'Paid');assert.equal(f.L.status,'current');assert.equal(f.L.balance,0);
 bill(f,251);assert.equal(f.L.rent,110);assert.equal(f.L.nextBill,281);
});
test('E: expiry-day billing valid if recovered; no reissue',()=>{
 const f=fixture();notify(f);f.L.status='pastdue';f.L.balance=100;f.L.dueSince=220;f.sim.rnd=()=>.99;
 bill(f,221);bill(f,251);assert.equal(f.L.rent,100);assert.equal(f.L.nextBill,281);
 f.sim.payUp(f.L,'Paid');bill(f,281);assert.equal(f.L.rent,110);assert.equal(f.L.rentNotice,undefined);
});
test('E: expiry-day without eligible bill or while delinquent cancels permanently',()=>{
 for(const status of ['current','pastdue']){
  const f=fixture();notify(f);f.L.nextBill=311;f.L.status=status;if(status==='pastdue'){f.L.dueSince=200;f.L.balance=100;f.sim.rnd=()=>.99;}
  bill(f,281);assert.equal(f.L.rent,100);assert.equal(f.L.rentNotice,undefined);
  assert.equal(f.sim.financialBatch(),false);
  bill(f,311);assert.equal(f.L.rent,100);
 }
});
test('saving, reloading, and manual Pause preserve notice and no duplicate billing',()=>{
 const f=fixture();notify(f);f.s.speed=0;const saved=structuredClone(f.s);
 const sim=new Sim(saved),L=saved.leases[22];sim.rnd=()=>0;
 assert.deepEqual(L.rentNotice,f.L.rentNotice);assert.equal(saved.speed,0);
 saved.t=financialTime(221);saved.finance.lastDay=220;assert.equal(sim.financialBatch(),true);
 assert.equal(L.rent,110);const cash=saved.cash;assert.equal(sim.financialBatch(),false);assert.equal(saved.cash,cash);
 assert.equal(saved.speed,0);
});
test('separate CR-01 leases within one account remain independent',()=>{
 const f=fixture();f.s.objects[998]={id:998,type:'unit',size:'5x5',env:'std',num:1003,x:8,y:5,f:0,w:1,h:1,dir:[0,1],access:'drive',cond:1,cstate:'operating'};
 f.s.leases[23]={id:23,unit:998,tenant:78,rent:50,start:1,nextBill:221,status:'current',balance:0,fees:0};
 f.s.tenants[78]={id:78,name:'Tenant One',lease:23,sat:.8,accountId:'shared'};f.tn.accountId='shared';
 notify(f);assert.ok(f.L.rentNotice);assert.equal(f.s.leases[23].rentNotice,undefined);
 bill(f,221);assert.equal(f.L.rent,110);assert.equal(f.s.leases[23].rent,50);
});
test('forecast uses effective bill rent but never creates cash or mutates state',()=>{
 const f=fixture();notify(f);f.s.t=financialTime(200)-1;f.s.finance.lastDay=199;
 const before=structuredClone(f.s),F=f.sim.scheduledOutlook();
 assert.deepEqual(f.s,before);assert.equal(F.bills.length,1);assert.equal(F.bills[0].day,221);assert.equal(F.bills[0].amount,110);
 assert.equal(f.L.rent,100);
});
test('notice alone never applies a rent change when action is ineligible',()=>{
 const f=fixture();f.L.status='delinquent';const before=structuredClone(f.s.leases);assert.equal(notify(f).ok,false);assert.deepEqual(f.s.leases,before);
});
test('move-out deletes pending notice and retains other customers and leases',()=>{
 const f=fixture();notify(f);
 f.s.objects[998]={id:998,type:'unit',size:'5x5',env:'std',num:1003,x:8,y:5,f:0,w:1,h:1,dir:[0,1],access:'drive',cond:1,cstate:'operating'};
 f.s.leases[23]={id:23,unit:998,tenant:78,rent:50,start:1,nextBill:221,status:'current',balance:0,fees:0};
 f.s.tenants[78]={id:78,name:'Other Tenant',lease:23,sat:.8};
 f.sim.endLease(f.L,'moveout');assert.equal(f.s.leases[22],undefined);
 assert.ok(f.s.leases[23]);assert.equal(f.s.leases[23].rent,50);
 assert.equal(f.s.objects[999].commercial,'unready');
});
test('successful existing retention discount cancels a pending increase instead of repricing it',()=>{
 const f=fixture();notify(f);f.tn.leaving=true;f.sim.rnd=()=>0;
 const r=f.sim.act_cv({op:'retain',tenant:77});assert.ok(r.ok);
 assert.equal(f.L.rent,90);assert.equal(f.L.rentNotice,undefined);assert.equal(f.tn.leaving,false);
 bill(f,221);assert.equal(f.L.rent,90);
});
test('positive actual change is required even if unrounded cap differs',()=>{
 const f=fixture({rent:100,ask:100.25});assert.equal(f.sim.rentReviewPreview(key,.1).n,0);
 assert.equal(notify(f).ok,false);assert.equal(f.L.rentNotice,undefined);
});
test('a prior rate increase still supports the original six-month accommodation',()=>{
 const f=fixture();f.L.rent=120;f.L.prevRent=100;f.L.incT=f.s.t;f.L.asked=true;
 const r=f.sim.act_cv({op:'rateHold',lease:f.L.id});assert.ok(r.ok);
 assert.equal(f.L.rent,100);assert.equal(f.L.incT,null);assert.equal(f.L.prevRent,null);
 assert.equal(f.L.holdUntil,f.s.t+180*MIN_PER_DAY);
});
console.log(`${passes} RN-01 focused checks passed`);
