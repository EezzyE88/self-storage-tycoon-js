// Optional commercial handoff. Existing asking-price and lease commands own gameplay.
import { targetUnits, unitInService } from './comeback.js';
import { authoredYard } from './propertyprojects.js';
export function normalizeRescueOperation(s) {
  const r=s.rescueOperation;if(r==null)return;
  const int=n=>Number.isInteger(n)&&n>=0;
  if(!r||r.v!==1||!['hold','lower'].includes(r.approach)||!int(r.started)||r.started>s.t||r.product!=='10x10|std'||![r.previousAsk,r.selectedAsk].every(n=>Number.isFinite(n)&&n>=10&&n<=2000)||!Array.isArray(r.ids)||!r.ids.length||r.ids.length>24||!r.ids.every(int)||new Set(r.ids).size!==r.ids.length||!Array.isArray(r.leases)||r.leases.length>r.ids.length||!r.leases.every(l=>l&&r.ids.includes(l.unit)&&int(l.t)&&l.t>=r.started&&l.t<=s.t&&Number.isFinite(l.rent)&&l.rent>=0)||new Set(r.leases.map(l=>l.unit)).size!==r.leases.length||typeof r.acknowledged!=='boolean'){delete s.rescueOperation;return;}
  s.rescueOperation={v:1,approach:r.approach,started:r.started,product:r.product,previousAsk:r.previousAsk,selectedAsk:r.selectedAsk,ids:[...r.ids],leases:r.leases.map(l=>({unit:l.unit,t:l.t,rent:l.rent})),acknowledged:r.acknowledged||r.leases.length>0};
}
export function rescueVacancies(sim) {
  const s=sim.s;if(s.scenario?.id!=='comeback'||s.scenario.status!=='won'||!s.scenario.acknowledged)return [];
  return s.scenario.targets.flatMap(t=>targetUnits(s,t)).filter(u=>u.size==='10x10'&&u.env==='std'&&u.commercial==='ready'&&unitInService(s,u));
}
export function rescuePricing(sim) {
  if(!authoredYard(sim)||sim.s.rescueOperation)return null;
  const targets=rescueVacancies(sim);if(!targets.length)return null;
  const ask=sim.s.market.ask['10x10|std'],lower=Math.max(10,Math.min(2000,Math.round(ask*.9)));
  const all=sim.objs('unit').filter(u=>u.size==='10x10'&&u.env==='std'&&u.commercial==='ready'&&unitInService(sim.s,u));
  return {ask,lower,ids:targets.map(u=>u.id),restored:targets.length,matching:all.length,market:sim.marketRent(targets[0]),difference:Math.round((ask-lower)*100)/100};
}
export function chooseRescuePricing(sim,a) {
  const q=rescuePricing(sim);
  if(!q||!['hold','lower'].includes(a.approach)||a.expectedAsk!==q.ask)return {ok:false,msg:'The asking rent or vacancies changed. Review leasing again.'};
  if(a.approach==='lower'){
    if(q.lower>=q.ask)return {ok:false,msg:'The asking rent cannot be lowered further.'};
    const r=sim.act_setRent({key:'10x10|std',v:q.lower});if(!r.ok)return r;
  }
  sim.s.rescueOperation={v:1,approach:a.approach,started:sim.s.t,product:'10x10|std',previousAsk:q.ask,selectedAsk:a.approach==='lower'?q.lower:q.ask,ids:q.ids,leases:[],acknowledged:false};
  return {ok:true,msg:a.approach==='lower'?`New 10×10 standard asking rent: $${q.lower}. Existing contracts unchanged.`:'Current asking rent kept. Watching actual use of restored vacancies.'};
}
export function recordRescueLease(sim,u,L) {
  const r=sim.s.rescueOperation;
  if(!r||!r.ids.includes(u.id)||r.leases.some(l=>l.unit===u.id)||!unitInService(sim.s,u))return;
  r.leases.push({unit:u.id,t:sim.s.t,rent:L.rent});
  if(!r.acknowledged){r.acknowledged=true;sim.emit('rescue_operation_lease',{unit:u.id,name:u.name,rent:L.rent,bounds:{x:u.x,y:u.y,w:u.w,h:u.h}});}
}
export function rescueResults(sim) {
  const r=sim.s.rescueOperation;if(!r)return null;
  return {record:r,leased:r.leases.length,reserved:r.ids.filter(id=>sim.s.objects[id]?.commercial==='reserved').length,occupied:r.ids.filter(id=>sim.s.objects[id]?.commercial==='occupied').length,changed:r.ids.some(id=>!sim.s.objects[id]),priceChanged:sim.s.market.ask[r.product]!==r.selectedAsk};
}
