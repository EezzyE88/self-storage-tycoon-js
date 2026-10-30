import { SIZES } from './data.js';
import { gateQueue, gateServing, gateStatus, unregisterGateAccess } from './gateaccess.js';

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

const ordered = (value) => {
  if (Array.isArray(value)) return value.map(ordered);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])]));
};

const stamp = (value) => JSON.stringify(ordered(value));
const attachmentName = (o) => o.type === 'unitLight' ? 'interior light' : o.type === 'light' ? 'wall light' : o.type === 'camera' ? 'outside camera' : o.type;

function targetState(o) {
  if (!o) return null;
  return {
    id: o.id, type: o.type, x: o.x, y: o.y, f: o.f || 0,
    cstate: o.cstate || null, order: o.order || null,
    commercial: o.commercial || null, lease: o.lease || null,
    retrofitOrder: o.retrofitOrder || null, keypad: o.keypad || null,
    mount: o.mount ? { ...o.mount } : null,
  };
}

function dependencies(sim, o) {
  const s = sim.s;
  const attachments = Object.values(s.objects).filter((x) => x.mount?.host === o.id).sort((a, b) => a.id - b.id);
  const orders = s.orders.filter((q) => q.st === 'construction' && (q.objs?.includes(o.id) || q.retrofit === o.id || q.keypadDoor === o.id)).map((q) => ({ id: q.id, tool: q.tool, st: q.st, prog: q.prog }));
  const tasks = s.tasks.filter((t) => t.obj === o.id).map((t) => ({ id: t.id, type: t.type || t.kind, assigned: t.assigned || null }));
  const agents = s.agents.filter((a) => a.unit === o.id || a.obj === o.id || a.gate === o.id || a.gateId === o.id).map((a) => ({ id: a.id, st: a.st || null }));
  const lease = o.lease && s.leases[o.lease] ? { id: o.lease, status: s.leases[o.lease].status } : null;
  const host = o.mount?.host ? targetState(s.objects[o.mount.host]) : null;
  const gates = Object.values(s.objects).filter((x) => x.type === 'gate').sort((a, b) => a.id - b.id).map((g) => ({ id: g.id, cstate: g.cstate, cond: g.cond, open: g.open, status: gateStatus(s,g), serving: gateServing(s,g.id) }));
  return {
    attachments: attachments.map(targetState), orders, tasks, agents, lease, host,
    access: { structV: s.structV, gates, gateQueues: Object.fromEntries(gates.map(g=>[g.id,[...gateQueue(s,g.id)]])), visits: s.visits.map((v) => ({ id: v.id, st: v.st, gate: v.gate || v.gateId || null })) },
  };
}

export function analyzePlaceableRemoval(sim, targetId) {
  const s = sim.s, o = s.objects[targetId];
  if (!o) return { covered: true, action: 'remove', target: null, classification: 'blocked', cost: 0, cashAfter: s.cash, effects: [], prerequisites: ['The selected asset no longer exists.'], stamp: stamp({ action: 'remove', targetId, missing: true, cash: s.cash, structV: s.structV }) };
  const covered = o.type === 'unit' || o.type === 'light' || o.type === 'camera' || o.type === 'unitLight' || o.type === 'gate' || !!o.mount;
  if (!covered) return { covered: false };
  const dep = dependencies(sim, o), effects = [], prerequisites = [];
  const cost = o.type === 'unit' ? 60 + SIZES[o.size].sqft * 0.6 : 100;

  if (o.cstate === 'construction' || o.keypad === 'pending') prerequisites.push('Construction or installation is unfinished. Use Cancel construction for the applicable refund.');
  if (o.retrofitOrder) prerequisites.push('Cancel this unit’s upgrade installation before demolition.');
  else if (dep.orders.length) prerequisites.push('Cancel the active construction commitment first.');
  if (dep.agents.length) prerequisites.push('A customer or worker is using this asset right now.');
  if (o.type === 'unit' && (dep.lease || o.commercial === 'reserved')) prerequisites.push('Occupied - the lease must end before demolition.');
  if (o.type === 'gate') {
    const access = gateRemovalAccess(sim,o);
    prerequisites.push(...access.blockers); effects.push(...access.effects);
    dep.gateRemoval = {alternatives:access.alternatives};
  }
  if (o.mount) {
    prerequisites.push('Individual hosted-attachment removal is not enabled in Stage 1; manage it with its host until that lifecycle is implemented.');
    effects.push(`Would remove the ${attachmentName(o)} from its host.`);
  }
  if (o.type === 'unit') effects.push('Removes one vacant unit and its rental capacity; no salvage refund.');
  else if (o.type === 'light') effects.push('Removes this light and its coverage; no salvage refund.');
  else if (o.type === 'camera') effects.push('Removes this camera and its coverage; no salvage refund.');
  if (dep.attachments.length) effects.push(`Removes ${dep.attachments.length} attached fixtures with the host.`);
  for (const a of dep.attachments) effects.push(`Also removes attached ${attachmentName(a)} #${a.id}.`);

  const classification = prerequisites.length ? 'blocked' : effects.length > 1 || dep.attachments.length ? 'allowed with disclosed effects' : 'allowed';
  const cashAfter = o.type === 'gate' && s.sb?.unlimited ? Math.max(0,s.cash-cost) : s.cash-cost;
  const quote = {
    action: 'remove', target: targetState(o), dependencies: dep, cost,
    cash: s.cash, cashAfter, time: s.t, rngS: s.rngS,
  };
  // Includes occupancy, power, paths, tasks and opening state even without a topology change.
  if (o.type === 'gate') quote.gateReview = {sim:reviewId(sim),state:s};
  return { covered: true, action: 'remove', target: targetState(o), classification, cost, cashAfter, effects, prerequisites, dependencies: dep, stamp: stamp(quote) };
}
