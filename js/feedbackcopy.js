// Presentation only: never change reports, inventory, decisions or simulation state.
const COPY = {
  loading: ['Loading bays were full.', 'Reachable loading bays were occupied.', 'Check parking now. Let congestion clear; assess more bays if it repeats.'],
  gate_queue: ['Gate queue reported.', 'Vehicles were waiting for keypad service.', 'Check the queue now; inspect gate power and condition if delays persist.'],
  gate_fault: ['Gate access failed.', 'The keypad failed or lacked power.', 'Inspect the gate and its repair job; check office assistance.'],
  gate_office: ['Visitor left without gate assistance.', 'Office assistance was unavailable when the gate failed.', 'Check gate status and current office coverage before changing staffing.'],
  office: ['Shopper left without office service.', 'The shopper left without receiving service.', 'Check current office hours, coverage and waits before changing staffing.'],
  vehicle_access: ['Vehicle access failed.', 'The visitor could not reach a usable vehicle destination.', 'Inspect the driveway and this unit’s loading or drive-up access.'],
  walk_access: ['Unit access failed.', 'The visitor could not find a pedestrian route.', 'Inspect this floor’s doors, halls and vertical access.'],
  office_access: ['Office entrance was unreachable.', 'The visitor could not walk from parking to the office.', 'Inspect the pedestrian route and office doorway.'],
  cart: ['No cart was available here.', 'No cart was claimable at this corral.', 'Check local carts, recovery and repair jobs before buying more.'],
  stairs: ['Customer used stairs after lift failure.', 'The elevator route failed; the cart could not use stairs.', 'Inspect this building’s elevator power, condition and repair job.'],
  dark: ['Dark hallway reported.', 'Lighting was insufficient during the visit.', 'Check this floor’s lighting coverage, power and repairs.'],
  restroom_dirty: ['Dirty restroom reported.', 'The visited restroom needed cleaning.', 'Check its cleaning job and staff availability.'],
  restroom_missing: ['Restroom unavailable in this building.', 'No working restroom served the visitor’s building.', 'Inspect existing facilities and utilities before building another.'],
  elevator_power: ['Elevator had no power.', 'The lift lacked power while passengers waited.', 'Check current power supply and electrical capacity.'],
  elevator_fault: ['Elevator was out of service.', 'The lift was not working while passengers waited.', 'Check current condition and repair status.'],
  elevator_queue: ['Long elevator wait reported.', 'The customer waited too long to board.', 'Check the queue now; fix faults before assessing another lift.'],
  noSize: ['Requested size was unavailable.', 'No suitable ready unit of this size was available.', 'Check current unit states before assessing more stock.'],
  price: ['Shopper rejected the price.', 'Asking rent exceeded this shopper’s willingness to pay.', 'Compare repeated losses, rents and service quality before changing prices.'],
  convenience: ['Shopper rejected the convenience.', 'The property did not meet this shopper’s preferences.', 'Review recurring route, cart and elevator problems.'],
  shopping: ['Shopper continued shopping.', 'The shopper left without signing.', 'No immediate action. Watch for repeated reasons.'],
  competitor: ['Shopper chose a competitor.', 'The shopper preferred the competing offer.', 'Compare repeated losses, rents and service quality before changing prices.'],
  reputation: ['Reviews discouraged a shopper.', 'Reputation influenced this shopper’s decision.', 'Review recurring service complaints and current repair or cleaning jobs.'],
  noReady: ['Requested unit was unavailable.', 'No accessible operating unit of this size was ready to offer.', 'Check current readiness and access before assessing more stock.']
};
const AVAILABILITY = {
  full: ['All units were occupied or reserved.', 'Check vacancies now. If still full, review Growth Readiness before expanding.'],
  sizeFull: ['No accessible rent-ready unit of this size was available.', 'Check this size’s availability now; assess expansion only if unmet demand repeats.'],
  makeReady: ['Matching vacant units needed make-ready.', 'Check their current make-ready jobs and staff availability.'],
  access: ['Matching units had blocked rental access.', 'Inspect the unit’s door, hall or drive-up route.'],
  construction: ['Matching units were unfinished or uncommissioned.', 'Complete their construction and commissioning checklist.']
};
export function complaintCopy(th, d) {
  let [what, why, next] = COPY[d.id] || [th.text, 'A customer reported this condition.', 'Inspect the reported location and current conditions.'];
  if (d.id === 'noReady' && AVAILABILITY[th.availability]) [why, next] = AVAILABILITY[th.availability];
  if (d.id === 'loading') {
    if (th.overflowAvailable === true) {
      why = 'Marked bays were occupied, but overflow parking was available.';
      next = 'No parking failure was recorded. Check current congestion before adding bays.';
    } else if (th.overflowAvailable === false) why = 'Marked bays were occupied and no free reachable overflow space was found.';
    else why = 'Bays were reported full; overflow availability was not recorded.';
  }
  if (d.climate) {
    what = 'Climate shopper left.';
    const r = d.climate.historical;
    if (!r) {
      why = 'This older report did not record detailed inventory conditions.';
      next = 'Inspect current matching units before spending.';
    } else if (!r.total) {
      why = 'No matching climate units were recorded at that time.';
      next = 'Check current stock. If demand repeats, review conversion or expansion costs.';
    } else {
      const c = r.counts, blockers = [];
      if (c.occupied || c.reserved) blockers.push('occupied or reserved');
      if (c.makeReady) blockers.push('needing make-ready');
      if (c.blocked) blockers.push('access-blocked');
      if (c.unfinished) blockers.push('unfinished or uncommissioned');
      if (c.other) blockers.push('in another unavailable state');
      why = blockers.length ? 'Recorded matching stock included units ' + blockers.join('; ') + '.' : 'Matching stock was recorded as ready to offer; the detailed rejection cause is unknown.';
      if (blockers.length === 1 && (c.occupied || c.reserved)) next = 'Check availability now. If still full, wait for turnover or assess expansion.';
      else if (blockers.length === 1 && c.makeReady) next = 'Check these units’ current make-ready jobs and staff availability.';
      else if (blockers.length === 1 && c.blocked) next = 'Inspect current doors, halls and freight access; temporary holds may have cleared.';
      else if (blockers.length === 1 && c.unfinished) next = 'Check these units’ construction and commissioning checklist.';
      else next = 'Inspect matching units now. Resolve existing readiness or access issues before adding stock.';
    }
  }
  return {what, why, next};
}
export function requestCopy(c, d) {
  // Pending decisions are distinct from saved complaint history. Existing choices retain their effects.
  const key = c.key || '';
  if (d.id && COPY[d.id]) { const [, why, next] = COPY[d.id]; return {why, next}; }
  if (key.startsWith('bi')) return {why:'A theft was reported at this unit.', next:'Choose a response, then review this unit’s security coverage.'};
  if (key.startsWith('rate')) return {why:'The tenant questioned a rent change.', next:'Compare rents, then choose whether to explain or hold the rate.'};
  if (key.startsWith('mo')) return {why:d.category==='Normal move-out'?'The tenant has finished using the unit.':'The tenant wants to leave over rent.', next:'Review the available response choices; check make-ready after departure.'};
  if (key.startsWith('size')) return {why:'The shopper asked whether their contents fit.', next:'Review available sizes and choose the appropriate sizing response.'};
  if (key==='secrisk') return {why:'The security check found dark, unwatched occupied areas.', next:'Inspect current lighting, camera coverage and power at the reported unit.'};
  return {why:'A customer decision is pending.', next:'Review the existing response choices.'};
}
