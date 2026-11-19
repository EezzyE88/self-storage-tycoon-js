import { MAPLE_PUBLIC, publicDrive, accessState, lostMapleAccess } from './mapleaccess.js';
// Universal removal. F1-F5 removal terms are owner-approved for release (2026-11-18).
import { G, SIZES } from './data.js';
import { unregisterGateAccess } from './gateaccess.js';
const equipment = new Set(['gate','door','elevator','stairs','power','water','hvac','light','camera','unitLight','restroom','fountain','canopy','corral']);
const sorted = v => Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])) : v;
const key = v => JSON.stringify(sorted(v));
const floorOf = o => o.f || 0;
const inside = (o,b) => o.x>=b.x && o.y>=b.y && o.x<b.x+b.w && o.y<b.y+b.h;
const occupied = o => o.lease || ['occupied','reserved'].includes(o.commercial);
// Player-facing asset names; ids stay only to tell same-type assets apart.
const NAMES = {shell:'Building',office:'Office',gate:'Gate',door:'Door',elevator:'Elevator',stairs:'Stairwell',power:'Power supply',water:'Water supply',hvac:'HVAC unit',light:'Light',camera:'Camera',unitLight:'Interior light',restroom:'Restroom',fountain:'Water fountain',canopy:'Covered canopy',corral:'Cart corral'};
export const assetTypeName = (o) => o?.type==='light'&&o.mount ? 'Wall light' : o?.type==='camera'&&o.mount ? 'Outside camera' : NAMES[o?.type] || 'Asset';
export const assetLabel = o => o.type==='unit' ? `Unit ${o.num || o.name || o.id}` : `${assetTypeName(o)} #${o.id}`;
const label = assetLabel;
const SURFACE = {[G.ASPHALT]:'Drive aisle',[G.CONCRETE]:'Walkway',[G.LOADING]:'Loading zone',[G.PARKING]:'Parking'};
export function idleCorralCarts(s, corralId){return s.carts.filter(c=>(c.corral===corralId||c.home===corralId)&&c.st==='corral'&&!s.agents.some(a=>a.cart===c.id)&&!s.tasks.some(a=>a.cart===c.id&&(a.assigned||a.vendor||a.prog||a.workBooked)));}
const uses = (a,ids) => ['unit','obj','gate','gateId','elev','corral'].some(k=>ids.has(a[k]));
function idleProperty(s) {
  return !Object.keys(s.leases).length && !Object.values(s.objects).some(o=>o.type==='unit'&&occupied(o)) &&
    !s.visits.length && !s.agents.some(a=>a.kind==='cust'||a.task||a.inElev) && !s.vehicles.length &&
    !s.orders.some(o=>o.st==='construction') && !s.tasks.some(t=>t.assigned||t.vendor||t.prog);
}
export function removalTarget(sim, value) {
  return typeof value==='number' || typeof value==='string' ? {kind:'object',id:Number(value)} : {...value};
}
export function applyRemovalState(s, q) {
  const ids=new Set(q.ids), tasks=new Set(s.tasks.filter(t=>ids.has(t.obj)||q.cartIds.includes(t.cart)).map(t=>t.id));
  s.tasks=s.tasks.filter(t=>!tasks.has(t.id));s.convos=s.convos.filter(c=>!ids.has(c.obj));
  for(const a of s.agents) if(a.queue) a.queue=a.queue.filter(id=>!tasks.has(id));
  for(const id of ids){if(s.objects[id]?.type==='gate')unregisterGateAccess(s,id);delete s.objects[id];}
  s.carts=s.carts.filter(c=>!q.cartIds.includes(c.id));
  if(q.keypad){const d=s.objects[q.keypad];if(d){d.keypad=null;delete d.keypadOrder;delete d.kcond;}}
  for(const t of q.tiles){if(t.k==='ground')s.ground[t.i]=t.v;else {s.hall[t.f][t.i]=t.v;if(s.dirt[t.f])s.dirt[t.f][t.i]=0;}}
  if(q.floor){const b=s.objects[q.floor.id];b.floors=q.floor.f;for(const o of Object.values(s.objects))if(['elevator','stairs'].includes(o.type)&&inside(o,b)){
    o.servedFloors=(o.servedFloors||Array.from({length:q.floor.f+1},(_,i)=>i)).filter(f=>f<q.floor.f);
    if(o.q)o.q=o.q.slice(0,q.floor.f);if(o.pos>=q.floor.f)o.pos=q.floor.f-1;if(o.tgt>=q.floor.f)o.tgt=null;
  }}
  if(q.closeProperty)s.open=false;
}
export function analyzeRemoval(sim,value,gateCheck,identity) {
  sim.ensure();
  const s=sim.s,t=removalTarget(sim,value),all=Object.values(s.objects),o=s.objects[t.id];
  const prerequisites=[],effects=[],ids=new Set(),cartIds=[],tiles=[],charges=[],items=[];
  let name='',floor=null,keypad=null,closeProperty=false,surfaceTo=null;
  const bad=m=>{if(!prerequisites.includes(m))prerequisites.push(m);};
  const add=o=>{if(o&&!ids.has(o.id)){ids.add(o.id);}};
  const structural=(b,f)=>charges.push({key:`structure:${b.id}:${f}`,label:`${b.type==='shell'?'Building':'Office'} #${b.id} Floor ${f+1} structure${b.type==='shell'?' (halls included)':''}`,cost:60+b.w*b.h*25*.6});
  if(t.kind==='object'){
    if(!o)bad('The selected asset no longer exists. Select it again.');
    else if(o.type==='shell'){
      name=`Building #${o.id}`;add(o);for(let f=0;f<o.floors;f++)structural(o,f);
      for(const c of all)if(c.id!==o.id&&(inside(c,o)||c.serves===o.id))add(c);
      for(let f=0;f<o.floors;f++)for(let y=o.y;y<o.y+o.h;y++)for(let x=o.x;x<o.x+o.w;x++)tiles.push({k:'hall',f,i:sim.idx(x,y),v:0});
    }else if(o.type==='office'){name=`Office #${o.id}`;add(o);structural(o,0);}
    else if(o.type==='unit'||equipment.has(o.type)){name=label(o);add(o);}
    else bad('This is not a player-built removable asset.');
  }else if(t.kind==='floor'){
    if(!o||o.type!=='shell'||!Number.isInteger(t.f)||t.f<1||t.f!==o.floors-1)bad('Select the highest completed upper floor of this building.');
    else {name=`Building #${o.id} Floor ${t.f+1}`;floor={id:o.id,f:t.f};structural(o,t.f);
      if(o.cstate!=='operating')bad('Finish or cancel this building’s construction first.');
      for(const c of all)if(inside(c,o)&&floorOf(c)===t.f&&!['shell','elevator','stairs'].includes(c.type))add(c);
      for(let y=o.y;y<o.y+o.h;y++)for(let x=o.x;x<o.x+o.w;x++)tiles.push({k:'hall',f:t.f,i:sim.idx(x,y),v:0});
      for(const c of all.filter(c=>inside(c,o)&&['elevator','stairs'].includes(c.type)))if(c.riders?.length||c.q?.some(q=>q.length)||c.tgt!=null||c.extensionDrain||c.serviceTestUntil>s.t)bad(`Wait for ${label(c)} trips and floor-extension work to finish.`);
    }
  }else if(t.kind==='keypad'){
    name=`Keypad on Door #${t.id}`;if(!o||o.type!=='door'||!o.keypad)bad('This door has no installed keypad.');
    else {keypad=o.id;if(o.keypad==='pending')bad('Use Cancel installation for the unfinished keypad.');charges.push({key:`keypad:${o.id}`,label:name,cost:100});}
  }else if(t.kind==='cart'){
    const c=s.carts.find(c=>c.id===t.id);name=`Cart #${t.id}`;
    if(!c)bad('The selected cart no longer exists.');else {cartIds.push(c.id);if(!['corral','stranded','damaged'].includes(c.st)||s.agents.some(a=>a.cart===c.id)||s.tasks.some(a=>a.cart===c.id&&(a.assigned||a.vendor||a.prog||a.workBooked)))bad('Wait for this cart’s trip or assigned recovery work to finish.');charges.push({key:`cart:${c.id}`,label:name,cost:0});}
  }else if(t.kind==='surface'){
    const {x,y}=t,f=t.f||0,i=sim.idx(x,y),layerName=t.layer==='hall'?'Hallway':(Number.isInteger(x)&&Number.isInteger(y)&&SURFACE[s.ground[i]])||'Ground';name=`${layerName} cell (${x}, ${y}) · Floor ${f+1}`;
    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(f)||f<0||f>=s.hall.length||!sim.inParcel(x,y))bad('Select an editable cell inside this property.');
    else if(t.layer==='hall'){
      if(s.hall[f][i]!==1)bad('Select a completed hallway cell. Unfinished work uses Cancel construction.');
      if(all.some(c=>c.type!=='shell'&&floorOf(c)===f&&inside(c,{x,y,w:1,h:1}))||sim.D.elevAt[i]||sim.D.stairAt[i])bad('Remove the fixture or shaft supported by this hallway cell first.');
      tiles.push({k:'hall',f,i,v:0});
    }else {
      const g=s.ground[i];if(f!==0||![G.ASPHALT,G.CONCRETE,G.LOADING,G.PARKING].includes(g))bad('Select player-editable paving or markings. Public street and sidewalk stay.');
      if(!sim.cellFree(i)||sim.D.at.get(i)?.length)bad('Remove the asset on this surface first.');
      tiles.push({k:'ground',i,v:[G.LOADING,G.PARKING].includes(g)?G.ASPHALT:G.GRASS});surfaceTo=[G.LOADING,G.PARKING].includes(g)?'plain drive aisle':'grass';
    }
    items.push({x,y,f,ok:true});charges.push({key:`surface:${f}:${i}`,label:name,cost:5});
  }else bad('Select an exact asset or surface.');
  // Include hosted fixtures once, even if also collected through a parent footprint.
  for(const c of all)if(ids.has(c.mount?.host))add(c);
  const removed=all.filter(c=>ids.has(c.id));
  if(o?.retrofitOrder)bad('Cancel this unit’s upgrade installation before demolition.');
  for(const c of removed){
    if(c.cstate==='construction'||c.keypad==='pending'||c.retrofitOrder)bad(`Finish or Cancel construction/installation for ${label(c)} first.`);
    if(c.type==='unit'&&occupied(c))bad(`Occupied or reserved — resolve the lease/reservation for ${label(c)} before removal.`);
    if(c.type==='corral'&&s.carts.some(a=>a.corral===c.id||a.home===c.id)){const n=s.carts.filter(a=>a.corral===c.id||a.home===c.id).length,idle=idleCorralCarts(s,c.id).length;bad(`${label(c)} still has ${n} cart${n===1?'':'s'}. ${idle?`Dispose of each idle cart from this corral’s panel first`:'Wait for its carts to return'}${idle<n&&idle?'; wait for in-use carts to return':''}. Carts are never moved automatically.`);}
    if(c.type==='unit')charges.push({key:`object:${c.id}`,label:label(c),cost:60+SIZES[c.size].sqft*.6});
    else if(equipment.has(c.type)&&!ids.has(c.mount?.host))charges.push({key:`object:${c.id}`,label:label(c),cost:100});
    effects.push(c.type==='unit'?(occupied(c)?`Would remove ${label(c)}, which is currently occupied or reserved, and its rental capacity.`:`Removes one vacant unit (${label(c)}) and its rental capacity; no salvage refund.`):c.mount&&c.id!==t.id?`Also removes attached ${assetTypeName(c).toLowerCase()} #${c.id}; no salvage refund.`:`Removes ${label(c)}${c.mount&&s.objects[c.mount.host]?` from ${label(s.objects[c.mount.host])}; the ${s.objects[c.mount.host].type==='unit'?'unit':'host'} stays`:''}; no salvage refund.`);
    for(let y=Math.floor(c.y);y<Math.ceil(c.y+(c.h||1));y++)for(let x=Math.floor(c.x);x<Math.ceil(c.x+(c.w||1));x++)items.push({x,y,f:floorOf(c),ok:true});
  }
  const refs=new Set([...ids,...(keypad?[keypad]:[])]);
  const pending=s.orders.filter(q=>q.st==='construction'&&(q.objs?.some(id=>refs.has(id))||refs.has(q.retrofit)||refs.has(q.keypadDoor)||q.vertical&&(refs.has(q.vertical.shell)||floor?.id===q.vertical.shell)||q.tiles?.some(a=>tiles.some(b=>a.k===b.k&&a.i===b.i&&(a.f||0)===(b.f||0)))));
  if(pending.length)bad(`Finish or Cancel construction order #${pending[0].id} before removal.`);
  if(s.tasks.some(a=>refs.has(a.obj)&&(a.assigned||a.vendor||a.prog||a.workBooked)))bad('Finish or cancel assigned service work on this asset first.');
  if(s.agents.some(a=>uses(a,refs)||removed.some(c=>c.type==='elevator'&&a.elev===c.id)||floor&&a.f===floor.f&&inside(a,o)))bad('A customer or worker is using this asset or floor. Wait for the trip/work to finish.');
  if(s.agents.some(a=>t.kind==='surface'&&floorOf(a)===(t.f||0)&&Math.floor(a.x)===t.x&&Math.floor(a.y)===t.y||removed.some(c=>['shell','office'].includes(c.type)&&inside(a,c))))bad('A person is on the selected surface or inside the structure. Wait for them to leave before removal.');
  if(s.visits.some(v=>uses(v,refs)))bad('A scheduled trip references this asset. Wait for it to finish.');
  if(removed.some(c=>c.type==='elevator'&&(c.riders?.length||c.q?.some(q=>q.length))))bad('Wait for elevator riders and queues to clear.');
  if(floor&&s.tasks.some(a=>a.f===floor.f&&inside(a,o)))bad('Resolve work on this floor before removal.');
  const lastGate=removed.some(c=>c.type==='gate')&&!all.some(c=>c.type==='gate'&&!ids.has(c.id));
  if(s.open&&(removed.some(c=>c.type==='office')||lastGate)){
    if(idleProperty(s)){closeProperty=true;effects.push('Close property to new business; existing expenses and debt remain. Reopen through normal prerequisites.');}
    else bad('Last necessary access: resolve all property leases, reservations, trips and committed work before closing and removing essential infrastructure.');
  }
  const q={ids:[...ids].sort((a,b)=>a-b),cartIds,tiles,floor,keypad,closeProperty};
  if(!prerequisites.length){
    const state=structuredClone(s);applyRemovalState(state,q);const after=new sim.constructor(state);
    if (s.layout===MAPLE_PUBLIC && !closeProperty && after.objs('office').length) {
      const reason=lostMapleAccess(accessState(sim),accessState(after)); if(reason) bad(reason);
    }
    const lost=[];
    if(!closeProperty)for(const u of all.filter(c=>c.type==='unit'&&!ids.has(c.id))){
      const a=after.s.objects[u.id];if(!a)continue;
      if((u.cstate==='operating'&&!u.blocked||u.cstate==='ready'||occupied(u))&&((!u.blocked&&a.blocked)||(a.missing||[]).some(m=>!(u.missing||[]).includes(m)&&!/dark|HVAC/.test(m))))lost.push(u.num||u.id);
      if((u.cstate==='operating'||u.cstate==='ready'||occupied(u))&&(u.f||0)>0&&removed.some(c=>['elevator','stairs'].includes(c.type)&&sim.D.shellAt[sim.idx(c.x,c.y)]===sim.D.shellAt[sim.idx(u.x,u.y)])&&(a.missing||[]).some(m=>/elevator|freight|hallway.*route|entrance|loading|power/i.test(m)&&!/HVAC/i.test(m)))bad(`Keep working freight access to retained Unit ${u.num||u.id}. Complete and power an alternative elevator first.`);
      if(occupied(u)&&u.env==='climate'&&(a.missing||[]).some(m=>/HVAC/.test(m))&&!(u.missing||[]).some(m=>/HVAC/.test(m)))bad(`Keep working HVAC capacity for leased/reserved Unit ${u.num||u.id}. Add replacement capacity first.`);
    }
    if(lost.length)bad(`Keep required access to ${lost.length} retained unit(s), including Unit ${lost[0]}. Connect an alternative route first.`);
    if(!closeProperty&&s.open&&after.openingIssues().some(m=>/office|gate|Main gate/i.test(m)&&!sim.openingIssues().includes(m)))bad('Keep required customer access to the office and entrance. Connect an alternative first.');
    for(const a of s.agents.filter(a=>a.path&&!uses(a,refs))){const path=a.path.slice(Math.max(0,(a.pi||0)-1));if(path.some((n,i)=>i&&sim.pedNbr(path[i-1]).includes(n)&&!after.pedNbr(path[i-1]).includes(n))){bad('A current customer or worker would lose their path. Wait or connect an alternative first.');break;}}
    for(const v of s.vehicles){const a=s.agents.find(a=>a.veh===v.id),path=(v.path||[]).slice(Math.max(0,(v.pi||0)-1));if(path.some((n,i)=>i&&sim.vehNbr(path[i-1],a?.publicVisit?publicDrive:a?.gateId).includes(n)&&!after.vehNbr(path[i-1],a?.publicVisit?publicDrive:a?.gateId).includes(n))){bad('Wait for vehicles using this route to clear.');break;}}
    if(t.kind==='object'&&o?.type==='gate'&&!closeProperty&&gateCheck){const g=gateCheck(sim,o);g.blockers.forEach(bad);effects.push(...g.effects);}
  }
  if(keypad)effects.push('Removes only the keypad; door remains. No salvage refund.');
  if(floor)effects.push(`Removes top Floor ${floor.f+1}; lower-floor shafts and paid reinforcement remain.`);
  if(t.kind==='surface')effects.push(t.layer==='hall'?'Removes only this hallway cell on this floor; no salvage refund.':`Changes only this cell${surfaceTo?` to ${surfaceTo}`:''}; no salvage refund.`);
  for(const tile of tiles)items.push({x:tile.i%s.W,y:Math.floor(tile.i/s.W),f:tile.f||0,ok:true});
  if(cartIds.length)effects.push('Disposes of this idle cart only; no salvage refund.');
  const unique=[...new Map(charges.map(c=>[c.key,c])).values()],cost=unique.reduce((n,c)=>n+c.cost,0);
  const target=t.kind==='object'&&o?{...o}: {id:t.id??null,type:t.kind,x:t.x??o?.x,y:t.y??o?.y,f:t.f||0};
  return {covered:true,action:'remove',descriptor:t,target,name:name||'Selected asset',classification:prerequisites.length?'blocked':effects.length>1?'allowed with disclosed effects':'allowed',cost,cashAfter:s.sb?.unlimited?Math.max(0,s.cash-cost):s.cash-cost,effects,prerequisites,charges:unique,items,mutation:q,dependencies:{attachments:removed.filter(c=>c.mount),orders:pending},stamp:key({identity,target:t,state:s})};
}
