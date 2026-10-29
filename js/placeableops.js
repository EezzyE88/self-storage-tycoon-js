import { SIZES } from './data.js';
import { gateQueue, gateServing, gateStatus } from './gateaccess.js';

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
    if (gateQueue(s,o.id).length || gateServing(s,o.id)) prerequisites.push('Clear approaching, queued and crossing traffic first.');
    prerequisites.push('Gate removal waits for functional alternate-route support; object count alone cannot prove safe access.');
    effects.push('Would change the property vehicle entrance and fence crossing.');
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
  const quote = {
    action: 'remove', target: targetState(o), dependencies: dep, cost,
    cash: s.cash, cashAfter: s.cash - cost, time: s.t, rngS: s.rngS,
  };
  return { covered: true, action: 'remove', target: targetState(o), classification, cost, cashAfter: s.cash - cost, effects, prerequisites, dependencies: dep, stamp: stamp(quote) };
}
