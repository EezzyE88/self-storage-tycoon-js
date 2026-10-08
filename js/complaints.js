import { climateInventory, climateInventoryText, climateRemedy, validClimateSnapshot } from './climateavailability.js';
// Read-only explanations. No dispatch, routing, randomness or economy changes.
import { floorCount, RELEASE_FLOORS } from './vertical.js';
export const COMPLAINTS = [
  ['loading', /^Loading bays are full\.$/, 'Temporary congestion', 'All reachable marked loading bays were occupied and no free reachable overflow parking was found. This is a temporary space shortage, not proof of a disconnected route.', 'Keep time running for vehicles to leave. If this repeats, paint more Loading Zone on vehicle-connected pavement near this building. Keep its door and hallway reachable. A canopy gives weather protection, not extra capacity.', 'build'],
  ['gate_queue', /^Gate line is backing up\.$/, 'Temporary congestion', 'Several vehicles are waiting for keypad service.', 'Let the queue clear. Inspect the keypad and power if delays persist; repair faults rather than adding unrelated loading bays.', 'operate'],
  ['gate_fault', /^My gate code isn't working\.$/, 'Access failure', 'The keypad failed or lacked power when this visitor arrived.', 'Inspect the gate condition and power supply. Review its repair job and Tech capacity; the existing repair request supports assignment. Office coverage can buzz visitors in while repairs wait.', 'operate'],
  ['gate_office', /^Nobody answered\. I'm leaving\.$/, 'Recorded service loss', 'The failed gate needed office assistance and no server was available at the time.', 'Inspect current gate status, office hours, coverage and waits. Historical losses alone do not establish a current staffing shortage. Repair an existing gate fault and assess persistent uncovered demand before changing staffing.', 'operate'],
  ['office', /^No one at the office\.$/, 'Recorded service loss', 'This shopper left without receiving office service at the time.', 'Inspect current office hours, coverage and waits. Historical losses alone do not establish a current staffing shortage. Check staff shifts and remaining capacity before changing staffing; hiring cannot recover this departed shopper.', 'operate'],
  ['vehicle_access', /^I can't get to my unit from here\.$/, 'Access failure', 'No usable vehicle destination could be found for this unit.', 'Connect the gate and driveway to drive-up unit fronts, or reachable loading/parking for interior units. Keep an entrance and hall route connected; extra painted bays on disconnected pavement will not help.', 'build'],
  ['walk_access', /^I can't reach my unit\.$/, 'Access failure', 'The visitor could not find a pedestrian route to the unit.', 'Inspect the selected floor: connect the outside door, built halls and unit entrance. Upper floors need usable vertical access; carts need an elevator. Check power and equipment condition before adding capacity.', 'build'],
  ['office_access', /^I can't find the office entrance\.$/, 'Access failure', 'The visitor could not walk from parking to the office door.', 'Reconnect pedestrian access to the office entrance and leave its doorway clear. Hiring someone does not fix a disconnected route.', 'build'],
  ['cart', /^No carts at .+\.$/, 'Capacity or distribution shortage', 'The requested corral had no claimable cart; carts may be in use, misplaced or damaged.', 'Inspect this corral and cart status. Wait for busy carts to return; use Porter cart recovery and review repair jobs for displaced or damaged stock. Buy carts here only if shortages persist. Other corrals do not guarantee stock at this one.', 'operate'],
  ['stairs', /^Elevator is down - carrying it up the stairs\.$/, 'Access failure', 'The elevator route failed and this customer used stairs without the cart.', 'Inspect this building’s elevator power, condition and repair queue. Techs handle complex repairs; stairs are a fallback, not an equivalent cart route.', 'operate'],
  ['dark', /^The hallway is dark\.$/, 'Service or coverage gap', 'Lighting at the unit visit was below the comfort threshold.', 'Inspect lights on this floor and the power map. Repair failed lights with available staff, restore electrical capacity if shed, or add hall lighting where coverage is missing.', 'build'],
  ['restroom_dirty', /^That restroom needs cleaning\.$/, 'Staffing or maintenance gap', 'The restroom used by this visitor was dirty.', 'Review cleaning jobs and Porter capacity, shifts and routes. The restroom inspector also offers explicit Owner cleaning. More restrooms do not clean this one. For dirty halls or loading areas, use the Cleanliness map to inspect the exact dirty spot and its cleaning job; check staff routes and remaining work-hours before hiring more.', 'operate'],
  ['restroom_missing', /^No restroom in this building\?$/, 'Amenity availability gap', 'No working restroom served this visitor’s building. One elsewhere does not satisfy this check.', 'Inspect existing restrooms here first: finish construction, restore power and provide this building’s Water Service. If none exists, build a restroom beside a built hall in this building. Then keep it clean.', 'build'],
  ['elevator_power', /^The elevator has no power\.$/, 'Access failure', 'This elevator was without power while passengers waited.', 'Review the power map and electrical load/capacity. Restore power to this building; a repair or another unpowered elevator will not solve power shedding.', 'build'],
  ['elevator_fault', /^The elevator is out of service\.$/, 'Access failure', 'This elevator was not working while passengers waited.', 'Inspect condition and its repair job. Review Tech shift, remaining capacity and route, or the existing paid vendor option. Preserve access to its landings.', 'operate'],
  ['elevator_queue', /^I've been waiting forever for the elevator\.$/, 'Temporary congestion', 'The passenger waited over 40 simulation ticks for boarding.', 'Let the current trip finish, then inspect queue and elevator status. Repeated queues on a working lift indicate capacity pressure; consider another connected elevator. If it is failed or unpowered, fix that first.', 'build'],
  ['noSize', /^No .+ available\.$/, 'Market / product availability', 'No suitable ready unit of the requested size was available.', 'Review size demand and the unit states: occupied/reserved stock is unavailable; unfinished or unready stock needs commissioning/make-ready. Add this size only if repeated unmet demand and finances justify it.', 'business'],
  ['noClimate', /^I need climate control\.$/, 'Market / product availability', 'This shopper requested climate control, but no matching climate unit was available to offer.', 'Review climate demand and ready climate units. Check this building’s HVAC capacity and eligibility before commissioning climate units. Climate construction and operation have costs.', 'business'],
  ['price', /^Too expensive for me\.$/, 'Market outcome', 'The asking rent exceeded this shopper’s willingness to pay.', 'Compare Asking rents with Your market and lost-demand totals. Consider price/quality tradeoffs; one refusal does not require a price cut or guarantee a lease.', 'business'],
  ['convenience', /^Not convenient enough\.$/, 'Market outcome', 'The shopper rejected the property’s convenience relative to their preferences.', 'Review Customer experience: walking routes, carts, doors and elevator waits. Improve the recurring local bottleneck rather than assuming more staff or lower rent fixes every shopper.', 'growth'],
  ['shopping', /^I'll keep shopping\.$/, 'Normal market outcome', 'Some shoppers leave without signing even when the property is usable.', 'No immediate fix is required. Track repeated lost-demand reasons before investing or lowering rents; conversion is not guaranteed.', 'business'],
  ['competitor', /^The place down the road is cheaper\.$/, 'Market outcome', 'The shopper chose the competing offer.', 'Compare market competition, your rents and service quality. A price reduction trades income for possible demand; do not expand solely because one shopper left.', 'business'],
  ['reputation', /^The reviews put me off\.$/, 'Market outcome', 'Reputation influenced this shopper’s decision.', 'Review recurring service complaints and Customer experience, repair faults and complete cleaning/turnover. Reputation recovery takes time; advertising does not repair access or equipment.', 'growth'],
  ['noReady', /^(Nothing ready to rent today\.|All units occupied or reserved\.|Vacant .+ units need make-ready\.|.+ rental access is blocked\.|New .+ units are not open yet\.|No .+ units ready to rent\.)$/, 'Market / unit availability', 'No accessible operating unit of the requested size was ready to offer this shopper.', 'Review unit states. Check the requested size and blocked access, not just total occupancy. Full occupancy is a capacity outcome, not a cleaning failure. For vacant unready units, complete make-ready; finish and commission new units. Expand only after checking demand, Growth Readiness and cash.', 'business']
];
// Group only equivalent observations; do not discard product or observed overflow differences.
export function complaintKey(th) {
  const l=th.location;
  return JSON.stringify([th.text,th.kind,th.requestedSize??null,th.requestedClimate??null,l?.obj??null,l?.building??null,l?.x??null,l?.y??null,l?.f??null,th.loadingBays??null,th.overflowAvailable??null,...(validClimateSnapshot(th.climateAvailability)?[th.availability??null]:[])]);
}
// A reported floor must be a whole floor index within the playable release limit (F1-F3) and within this property's
// floor layers. Floors beyond either are unsupported and rejected. (A playable floor that no building reaches any
// more is a stale report: viewReportedTarget() shows its spot from F1 instead.)
export function supportedFloor(sim,f) {
  return Number.isInteger(f) && f>=0 && f<Math.min(RELEASE_FLOORS,floorCount(sim.s));
}
export function reportedTarget(sim,l) {
  if(!l || !Number.isFinite(l.x) || !Number.isFinite(l.y) || l.x<0 || l.y<0 || l.x>=sim.s.W || l.y>=sim.s.H || !supportedFloor(sim,l.f??0)) return null;
  return {...l,f:l.f??0};
}
export function complaintType(text) { return COMPLAINTS.find(x => x[1].test(text)); }
export function complaintContext(sim, ag, text) {
  const entry=complaintType(text); if(!entry) return {};
  const s=sim.s, u=s.objects[ag.unit];
  let o=u;
  if(entry[0].startsWith('gate')) o=sim.D.gate;
  if(entry[5]==='business' || ['convenience','reputation'].includes(entry[0])) o=sim.objs('office')[0];
  if(entry[0].startsWith('office')) o=sim.objs('office')[0];
  if(entry[0]==='cart') o=s.objects[ag.corral] || u;
  if(entry[0].startsWith('elevator') || entry[0]==='stairs') o=s.objects[ag.elev] || u;
  const target=o ? {obj:o.id,x:o.x,y:o.y,f:entry[0].startsWith('elevator') ? ag.f||0 : o.f||0} : {x:ag.x,y:ag.y,f:ag.f||0};
  const building=o && sim.D.shellAt[sim.idx(o.x,o.y)];
  return {complaint:entry[0],location:{...target,building:building||null},requestedSize:ag.size||null};
}
export function diagnoseComplaint(sim, th) {
  const e=complaintType(th.text); if(!e || th.kind!=='bad') return null;
  const l=th.location || {x:th.x,y:th.y,f:th.f||0}, target=reportedTarget(sim,l), o=sim.s.objects[l.obj], b=sim.s.objects[l.building];
  const location=[b ? (b.name||'Building '+b.id) : l.building ? 'Building '+l.building+' (removed)' : 'Property', o ? (o.name||sim.objName(o)) : l.obj ? 'Target '+l.obj+' (removed)' : 'reported position', 'F'+((l.f||0)+1), Number.isFinite(l.x)&&Number.isFinite(l.y)?`(${Math.floor(l.x)}, ${Math.floor(l.y)})`:''].filter(Boolean).join(' · ');
  let cause=e[3], remedy=e[4], climate=null;
  if(e[0]==='noClimate' || (e[0]==='noSize' && th.requestedClimate)) {
    const historical=validClimateSnapshot(th.climateAvailability) ? th.climateAvailability : null;
    const current=th.requestedSize ? climateInventory(sim,th.requestedSize) : null;
    climate={historical,current};
    cause='This shopper requested climate control, but no matching climate unit was available to offer. '+(historical ? 'At report time: '+climateInventoryText(historical) : 'The original detailed climate-availability cause was not recorded in this older report.');
    if(current)cause+=' Current matching climate inventory (not the original observation): '+climateInventoryText(current);
    else cause+=' The requested size was not recorded; current matching stock cannot be identified.';
    remedy=historical ? climateRemedy(historical)+' These remedies describe the report-time conditions; check current stock before acting.' : current ? 'Original conditions are unknown. For current matching inventory: '+climateRemedy(current) : 'Review current size-and-climate demand and unit readiness before spending. Adding stock does not guarantee leases.';
  }
  if(e[0]==='noReady' && th.availability) {
    const guidance = {
      full:['All units were occupied or reserved when this shopper arrived.', 'Wait for turnover or review Growth Readiness and cash before expanding. Cleaning occupied units does not create vacancies.'],
      makeReady:['Vacant units of the requested size needed make-ready.', 'Review these vacant units and their make-ready jobs in Operate. Check staff shifts, routes and remaining work hours, or deliberately assign the Owner.'],
      access:['Units of the requested size had blocked rental access.', 'Inspect the requested units and reconnect their doors, halls or drive-up access before adding inventory.'],
      construction:['Units of the requested size were unfinished or not commissioned.', 'Finish the existing construction and commissioning checklist before buying another expansion.'],
      sizeFull:['No accessible rent-ready unit of this size was available.', 'Review this size’s occupied and reserved stock. Wait for turnover or expand this size after checking repeated demand and cash.']
    }[th.availability];
    if(guidance) [cause,remedy]=guidance;
  }
  if(e[0]==='loading' && th.overflowAvailable==null) cause='Historical bay-full report: exact overflow availability was not recorded. Review current local parking before adding capacity.';
  if(e[0]==='loading' && th.overflowAvailable===true) cause='Historical report: marked bays were occupied, but overflow parking was available. This did not prevent parking.';
  if(e[0]==='cart' && o?.type==='corral') {
    const local=sim.s.carts.filter(c=>c.home===o.id || c.corral===o.id);
    cause+=` Current local stock: ${sim.cartsAt(o.id).length} claimable here, ${local.filter(c=>c.st==='inuse').length} in use, ${local.filter(c=>c.st==='stranded').length} stranded, ${local.filter(c=>c.st==='damaged'||c.cond<0.2).length} damaged or worn. These are current counts, not the original observation.`;
    if(!sim.s.policies.porterCarts) remedy+=' Porter cart recovery is currently switched off; review Policies before buying more stock.';
  }
  if(['cart','restroom_dirty'].includes(e[0]) && o) {
    const tasks=sim.s.tasks.filter(t=>e[0]==='cart' ? t.type==='carts' && sim.cartById(t.cart)?.home===o.id : t.type==='cleanroom' && t.obj===o.id);
    if(tasks.length) remedy+=' Current local jobs: '+tasks.slice(0,5).map(t=>sim.taskDelegation(t)?.message || 'Review this job in Operate.').join(' ') ;
  }
  if(e[0]==='loading' && Number.isFinite(th.loadingBays)) cause+=` At report time: ${th.loadingBays} reachable bays were occupied; ${th.overflowAvailable?'overflow parking was available':'no free overflow space was found'}.`;
  if(!climate && ['noReady','noSize','noClimate'].includes(e[0])) { const units=sim.objs('unit').filter(u=>!th.requestedSize || u.size===th.requestedSize); cause+=` Current ${th.requestedSize||'all-size'} inventory: ${units.filter(u=>u.commercial==='occupied').length} occupied, ${units.filter(u=>u.commercial==='reserved').length} reserved, ${units.filter(u=>u.commercial==='unready').length} unready, ${units.filter(u=>u.cstate==='operating' && u.commercial==='ready' && !u.blocked).length} accessible rent-ready, ${units.filter(u=>u.blocked).length} blocked. Ready stock may still differ from the requested climate product.`; }
  return {id:e[0],category:e[2],cause,remedy,tab:e[5],location:target?location:location+' · reported location unavailable',target,legacy:!th.location,climate};
}

// Existing message choices keep their original prices, effects, expiry and automation.
export function diagnoseRequest(sim,c) {
  const key=c.key||'', o=sim.s.objects[c.obj];
  const common = key.startsWith('gate') ? "My gate code isn't working." : key.startsWith('carts') ? 'No carts at the corral.' : key.startsWith('elev') ? (o?.unpowered ? 'The elevator has no power.' : o && !sim.works(o) ? 'The elevator is out of service.' : "I've been waiting forever for the elevator.") : key.startsWith('light') ? 'The hallway is dark.' : null;
  if(common) return diagnoseComplaint(sim,{text:common,kind:'bad',location:o?{obj:o.id,x:o.x,y:o.y,f:o.f||0,building:sim.D.shellAt[sim.idx(o.x,o.y)]||null}:{obj:c.obj}});
  let category,cause,remedy,tab='business';
  if(key.startsWith('bi')) {category='Security incident';cause='A theft occurred at this unit. Darkness and missing camera coverage increase risk; even a well-run property can be hit.';remedy='Use the existing compensation or police-report response, then review this unit on the security map. Restore failed/unpowered lights and cameras or add missing coverage. Spending reduces risk; it cannot guarantee prevention.';tab='build';}
  else if(key.startsWith('rate')) {category='Price / retention decision';cause='An existing tenant is questioning their changed rent.';remedy='Compare old/new rents and market conditions. Explain the rate or use the existing six-month hold; holding trades revenue for retention. Ignoring has its existing satisfaction consequence.';}
  else if(key.startsWith('mo')) {category=String(c.text||'').includes('more than I want')?'Price / retention decision':'Normal move-out';cause=String(c.text||'').includes('more than I want')?'This tenant wants to leave because of rent.':'The tenant has finished using this unit; turnover is a normal business event.';remedy=sim.requestOfferStatus(c) || 'Use the existing retention offer or explain move-out steps. The 10% discount reduces rent and may not retain them. After departure, review the make-ready job before renting again.';}
  else if(key.startsWith('size')) {category='Product suitability';cause='The prospect is asking whether their planned contents fit a 10x10.';remedy='Use the existing sizing choices. Recommend the available 10x20 when appropriate; choosing a cramped unit has an existing satisfaction consequence. A recommendation does not create inventory.';}
  else if(key==='secrisk') {category='Security coverage gap';cause='The security check found dark, unwatched occupied areas.';remedy='Review the security map at the reported unit. Add missing lights/cameras and fix power or condition faults. Acknowledging the notice does not improve coverage.';tab='build';}
  else return null; // bank, collections and competitor notices are not customer complaints
  const l=o?{obj:o.id,x:o.x,y:o.y,f:o.f||0,building:sim.D.shellAt[sim.idx(o.x,o.y)]||null}:null;
  return {category,cause,remedy,tab,location:o?`${o.name||sim.objName(o)} · F${(o.f||0)+1} (${o.x}, ${o.y})`:'Property',target:reportedTarget(sim,l)};
}

// Reviews are property-wide scores, not recorded observations of a particular unit.
export function reviewRemedy(dim) {
  return ({
    security: 'Review the Security map: restore failed lights/cameras and cover dark, unwatched areas.',
    cleanliness: 'Review the Cleanliness map and exact dirty-area jobs. Check Porter shifts, routes, busy jobs and remaining work-hours; hiring alone does not complete cleaning.',
    convenience: 'Inspect local cart stock, recovery policy, routes and elevator power/queues before adding capacity.',
    service: 'Check office coverage, hours and Owner capacity; a Clerk serves during office hours.',
    value: 'Compare asking rents, market rents and service quality. A price cut trades income for possible retention.',
    access: 'Inspect gate power/condition, doors and connected routes. Repair faults before adding capacity.'
  })[dim] || '';
}
