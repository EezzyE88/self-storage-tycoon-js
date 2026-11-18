import { analyzeRemoval } from './removal.js';
import { gateQueue, gateServing, unregisterGateAccess } from './gateaccess.js';

// Review identity is transient, never saved; identical properties must not share a quote.
const reviewIds = new WeakMap(); let nextReviewId = 1;
function reviewId(sim) { if (!reviewIds.has(sim)) reviewIds.set(sim, nextReviewId++); return reviewIds.get(sim); }

function gateRemovalAccess(sim, gate) {
  const s = sim.s, blockers = [], effects = [];
  const taskIds = new Set(s.tasks.filter(t => t.obj === gate.id).map(t => t.id));
  if (gateQueue(s,gate.id).length || gateServing(s,gate.id) || s.agents.some(a => a.gateId === gate.id || a.gate === gate.id || a.obj === gate.id || taskIds.has(a.task)))
    blockers.push('Wait for trips and workers using this gate to finish.');
  if (taskIds.size || s.convos.some(c => c.obj === gate.id)) blockers.push('Finish or cancel this gate’s service work and resolve its requests first.');
  if (s.visits.some(v => v.gateId === gate.id || v.gate === gate.id)) blockers.push('A scheduled trip still references this gate. Wait for it to finish.');

  // Never remove/rebuild a gate on the live state to inspect its consequences.
  const state = structuredClone(s);
  unregisterGateAccess(state, gate.id); delete state.objects[gate.id];
  const after = new sim.constructor(state);
  const alternatives = (state.gateAccess?.gateIds || []).filter(id => {
    const g = state.objects[id], c = after.gateConnection(id), p = state.parcel;
    return after.gateStatus(id) === 'operating' && c?.kind === 'front-street' && c.boundary === 'front' && g.y === p.y1 && g.x-1 >= p.x0 && g.x+1 <= p.x1 && !!after.vehicleReachForGate(id)[after.idx(g.x,g.y)];
  });
  const customers = s.agents.filter(a => a.kind === 'cust');
  const obligations = s.open || Object.keys(s.leases).length > 0 || customers.length > 0 || s.visits.length > 0 || s.orders.some(order => order.st === 'construction') || Object.values(s.objects).some(o => o.type === 'unit' && (o.lease || ['occupied','reserved'].includes(o.commercial)));
  const serves = visit => alternatives.some(id => after.gateCanServeVisit(id,visit));
  if (obligations) {
    if (!alternatives.length) blockers.push('Last necessary access: complete and connect another working gate before removal.');
    if (alternatives.length) {
      for (const office of Object.values(s.objects).filter(o => o.type === 'office' && o.cstate === 'operating')) {
        const retained = state.objects[office.id];
        if (JSON.stringify(retained.door) !== JSON.stringify(office.door) || !serves({kind:'prospect'})) blockers.push('Keep a customer route to the existing office door. Connect the alternate gate first.');
      }
      const lostUnits = [];
      for (const unit of Object.values(s.objects).filter(o => o.type === 'unit' && (s.open || o.cstate === 'construction' || o.lease || ['occupied','reserved'].includes(o.commercial)))) {
        if (!serves({unit:unit.id}) || (state.objects[unit.id].missing || []).some(reason => !(unit.missing || []).includes(reason)))
          lostUnits.push(unit.num || unit.id);
      }
      if (lostUnits.length) blockers.push(`Keep access to ${lostUnits.length} unit${lostUnits.length > 1 ? 's' : ''} (including Unit ${lostUnits[0]}). Connect the alternate gate to their loading/drive route first.`);
      for (const visit of [...s.visits, ...customers.map(a => ({kind:a.vt,unit:a.unit}))]) if (!serves(visit)) {
        blockers.push('A current or scheduled visit would lose destination access. Connect its alternate route first.'); break;
      }
    }
  }
  // Retain paths, not just destinations: another gate’s traffic must not lose a crossing.
  for (const v of s.vehicles) {
    const agent = s.agents.find(a => a.veh === v.id), gid = agent?.gateId ?? null;
    const path = (v.path || []).slice(Math.max(0,(v.pi || 0)-1));
    const near = v.moving && Math.abs(v.x-(gate.x+.5)) < 2.2 && Math.abs(v.y-(gate.y+1)) < 1.8;
    if (near || path.some((n,i) => i && !after.vehNbr(path[i-1],gid).includes(n))) {
      blockers.push('Wait for vehicles near this gate or using its crossing to clear.'); break;
    }
  }
  for (const a of s.agents.filter(a => a.kind === 'staff' && a.path)) {
    const path = a.path.slice(Math.max(0,(a.pi || 0)-1));
    if (path.some((n,i) => i && sim.pedNbr(path[i-1]).includes(n) && !after.pedNbr(path[i-1]).includes(n))) {
      blockers.push('A worker would lose their route. Wait for the work to finish.'); break;
    }
  }
  effects.push(`Removes Gate #${gate.id} and closes its fence crossing; paving stays. No salvage refund.`);
  if (alternatives.length) effects.push(`Remaining working gate${alternatives.length > 1 ? 's' : ''}: ${alternatives.map(id=>'#'+id).join(', ')}. Required routes checked after removal.`);
  else effects.push('No working entrance will remain. Complete and connect a gate before reopening.');
  return {blockers:[...new Set(blockers)],effects,alternatives};
}

export function analyzePlaceableRemoval(sim, targetId) {
  return analyzeRemoval(sim, targetId, gateRemovalAccess, reviewId(sim));
}
