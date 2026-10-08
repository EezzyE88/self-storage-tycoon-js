// Read-only offer diagnostics. Use the leasing path's stored readiness/access fields; never revalidate, dispatch or roll RNG.
export const CLIMATE_SNAPSHOT_LIMIT = 12;
export function climateInventory(sim, size) {
  const stock=sim.objs('unit').filter(u=>u.size===size && u.env==='climate');
  const counts={occupied:0,reserved:0,makeReady:0,blocked:0,unfinished:0,eligible:0,other:0};
  const flags=u=>{
    const f=[];
    if(u.commercial==='occupied')f.push('occupied');
    if(u.commercial==='reserved')f.push('reserved');
    if(u.cstate==='operating' && u.commercial==='unready' && !u.lease)f.push('makeReady');
    if(u.cstate==='operating' && u.blocked)f.push('blocked');
    if(u.cstate!=='operating')f.push('unfinished');
    if(u.cstate==='operating' && !u.blocked && u.commercial==='ready')f.push('eligible');
    if(!f.length)f.push('other');
    return f;
  };
  for(const u of stock)for(const k of flags(u))counts[k]++;
  const conditions=stock.length ? ['occupied','reserved','makeReady','blocked','unfinished','other'].filter(k=>counts[k]) : ['absent'];
  const units=stock.slice(0,CLIMATE_SNAPSHOT_LIMIT).map(u=>({id:u.id,name:u.name||`Unit ${u.id}`,x:u.x,y:u.y,f:u.f||0,building:sim.D.shellAt[sim.idx(u.x,u.y)]||null,cstate:u.cstate,commercial:u.commercial,conditions:flags(u),missing:[...(u.missing||[])],accessHold:u.accessHold??null}));
  return {v:1,size,t:sim.s.t,total:stock.length,counts,conditions,units,omitted:Math.max(0,stock.length-units.length)};
}
// Visual cause grouping ignores requested size and unit identity, retaining the approved across-size grouping.
export function climateCauseKey(report) {
  const c=report.conditions;
  return 'climate:'+['absent',...(c.some(k=>k==='occupied'||k==='reserved')?['capacity']:[]),'makeReady','blocked','unfinished','other'].filter(k=>k==='capacity'||c.includes(k)).join('+');
}
export function climateInventoryText(r) {
  const c=r.counts;
  return `${r.size} climate: ${r.total} total; ${c.occupied} occupied, ${c.reserved} reserved, ${c.makeReady} vacant needing make-ready, ${c.blocked} operating with blocked access, ${c.unfinished} unfinished or uncommissioned, ${c.eligible} accessible operating rent-ready${c.other?`, ${c.other} other unavailable state`:''}. Counts can overlap.`;
}
export function climateRemedy(r) {
  const c=r.counts,parts=[];
  if(!r.total)parts.push('No matching-size climate stock was recorded. Review repeated size-and-climate demand, conversion eligibility and cash before adding stock; check building HVAC only when commissioning requires it.');
  if(c.occupied||c.reserved)parts.push('For occupied or reserved climate stock, wait for turnover or review Growth Readiness and cash before justified expansion. Cleaning occupied units does not create vacancies.');
  if(c.makeReady)parts.push('For vacant unready climate units, review their make-ready jobs in Operate, staff shifts, routes and remaining work hours.');
  if(c.blocked)parts.push('For blocked operating units, inspect the recorded doorway, hallway, entrance or freight route. A freight-handover hold can be temporary; check its current status before building more.');
  if(c.unfinished)parts.push('Finish existing construction and its actual commissioning checklist first, including HVAC capacity only where listed as a prerequisite.');
  if(c.other)parts.push('Inspect the listed units and their current readiness before spending.');
  if(!parts.length)parts.push('Matching climate units were eligible to offer in this inventory snapshot. The detailed rejection cause is unknown; inspect current stock before spending.');
  return parts.join(' ')+' Adding stock does not guarantee leases.';
}

export function validClimateSnapshot(r) {
  const keys=['occupied','reserved','makeReady','blocked','unfinished','eligible','other'];
  return !!r && r.v===1 && typeof r.size==='string' && Number.isFinite(r.t) && Number.isInteger(r.total) && r.total>=0 && Number.isInteger(r.omitted) && r.omitted>=0 &&
    keys.every(k=>Number.isInteger(r.counts?.[k]) && r.counts[k]>=0 && r.counts[k]<=r.total) &&
    Array.isArray(r.conditions) && r.conditions.length<=7 && r.conditions.every(k=>[...keys,'absent'].includes(k)) &&
    Array.isArray(r.units) && r.units.length<=CLIMATE_SNAPSHOT_LIMIT && r.units.length+r.omitted===r.total &&
    r.units.every(u=>u && typeof u.name==='string' && Number.isFinite(u.x) && Number.isFinite(u.y) && Number.isInteger(u.f) && u.f>=0 && Array.isArray(u.conditions) && u.conditions.length<=7 && u.conditions.every(k=>keys.includes(k)) && Array.isArray(u.missing) && u.missing.every(m=>typeof m==='string'));
}

export function climateSuggestion(count) {
  return `${count} climate-related availability losses were recorded. Check matching-size climate stock and its readiness before expanding. Adding units does not guarantee leases.`;
}
// Correct presentation of old saved advice without rewriting historical report data or outcomes.
export function climateSuggestionText(text) {
  const old=/^(\d+) shoppers needed climate control\. An HVAC plant plus climate units would capture them\.$/.exec(text);
  return old ? climateSuggestion(old[1]) : text;
}
