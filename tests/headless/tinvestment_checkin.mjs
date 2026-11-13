// IP-01 read-only Investment Check-in; no economy, persistent state, or owner-Pause mutations.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { investmentCheckin, investmentCheckinHtml } from '../../js/investmentprogress.js';
let passes = 0;
const test=(label,fn)=>{fn();passes++;console.log('PASS',label)};
const state = () => { const sim=makeMaple(17);sim.s.tut.on=false;sim.s.speed=0;return sim; };
const add=(sim,id,order,size='5x5',env='std',cstate='operating')=>{
  sim.s.objects[id]={id,type:'unit',order,size,env,cstate,lease:null,commercial:'ready',f:0,x:id%40,y:8,w:1,h:1};return sim.s.objects[id];
};
const leased=(sim,u,lid,rent)=>{u.lease=lid;sim.s.leases[lid]={id:lid,unit:u.id,rent,status:'current',nextBill:31};};

test('no constructed units -> no check-in and no markup',()=>{
 const sim=state();assert.equal(investmentCheckin(sim),null);assert.equal(investmentCheckinHtml(sim),'');
});
test('newest complete order used; incomplete newer order excluded',()=>{
 const sim=state();add(sim,901,40);add(sim,902,40);add(sim,903,41,'10x10','std','construction');
 const c=investmentCheckin(sim);assert.equal(c.order,40);assert.equal(c.total,2);assert.equal(c.leased,0);assert.equal(c.rent,0);
});
test('newest finished order shown even when one unit never opened; unopened unit counted, not hidden',()=>{
 const sim=state();add(sim,901,40);add(sim,902,41);add(sim,903,41,'5x5','std','built');leased(sim,sim.s.objects[902],704,70);
 const c=investmentCheckin(sim);assert.equal(c.order,41);assert.equal(c.total,1);assert.equal(c.notOpen,1);assert.equal(c.leased,1);assert.equal(c.rent,70);
 assert.match(investmentCheckinHtml(sim),/1 more unit from this build is not open yet/);
});
test('active incomplete order excluded even when its units operating',()=>{
 const sim=state();add(sim,901,40);add(sim,902,41);sim.s.orders.push({id:41,st:'construction'});
 assert.equal(investmentCheckin(sim).order,40);
});
test('lease consistency and totals; mixed-product grouping retains accurate labels',()=>{
 const sim=state(),a=add(sim,901,44,'5x5'),b=add(sim,902,44,'10x10'),c=add(sim,903,44,'5x5');
 leased(sim,a,701,65);leased(sim,b,702,178);c.lease=703;sim.s.leases[703]={id:703,unit:999,rent:900};
 const check=investmentCheckin(sim);assert.equal(check.total,3);assert.equal(check.leased,2);assert.equal(check.rent,243);
 assert.deepEqual(check.products.map(p=>[p.size,p.total,p.leased,p.rent]),[['10x10',1,1,178],['5x5',2,1,65]]);
 const html=investmentCheckinHtml(sim);assert.match(html,/10x10 standard/);assert.match(html,/5x5 standard/);assert.match(html,/\$243\/mo/);
});
test('matching lost requests are property- and product-specific and window labeled',()=>{
 const sim=state();sim.s.t=40*1440;sim.s.finance.observedFrom=10;
 add(sim,901,50,'5x5','std');add(sim,902,50,'5x5','climate');
 sim.s.mkt.lostLog=[{d:40,r:'noSize',sz:'5x5',climate:false},{d:39,r:'noClimate',sz:'5x5',climate:true},{d:40,r:'price',sz:'5x5',climate:false},{d:9,r:'noSize',sz:'5x5',climate:false},{d:40,r:'noSize',sz:'10x10',climate:false}];
 const c=investmentCheckin(sim);assert.equal(c.products.find(p=>p.env==='std').losses,1);assert.equal(c.products.find(p=>p.env==='climate').losses,1);
 const html=investmentCheckinHtml(sim);assert.match(html,/not total demand/);assert.match(html,/Days 12–41/);
});
test('separate property states never leak leases or market demand',()=>{
 const a=state(),b=state();add(a,901,55);add(b,901,55);leased(a,a.s.objects[901],702,119);
 a.s.mkt.lostLog=[{d:a.day,r:'noSize',sz:'5x5',climate:false}];
 assert.equal(investmentCheckin(a).leased,1);assert.equal(investmentCheckin(b).leased,0);
 assert.equal(investmentCheckin(a).products[0].losses,1);assert.equal(investmentCheckin(b).products[0].losses,0);
});
test('read-only across state, cash, RNG, Pause and growth rendering',()=>{
 const sim=state();add(sim,901,77);const before=JSON.stringify(sim.s),rng=sim.s.rng,cash=sim.s.cash;
 investmentCheckin(sim);investmentCheckinHtml(sim);
 assert.equal(sim.s.speed,0);assert.equal(sim.s.cash,cash);assert.equal(sim.s.rng,rng);assert.equal(JSON.stringify(sim.s),before);
});
console.log(`${passes} Investment Check-in focused checks passed`);
