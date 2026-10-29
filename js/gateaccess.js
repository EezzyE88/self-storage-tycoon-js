// Stage 2A: saved single-gate identity/connection and traffic ownership foundation.
// This module intentionally does not select alternate gates or enable multi-gate play.
const asId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const uniqueIds = (xs) => [...new Set((xs || []).map(asId).filter((x) => x != null))];
const gateObjects = (s) => Object.values(s.objects || {}).filter((o) => o && o.type === 'gate').sort((a, b) => a.id - b.id);
const activeAgentIds = (s) => new Set((s.agents || []).map((a) => a.id));

function connectionFor(s, gate, previous) {
  if (previous && previous.kind === 'front-street') return { ...previous, gateId: gate.id, x: gate.x, y: gate.y };
  const front = gate.y === s.parcel?.y1;
  return {
    gateId: gate.id,
    kind: front ? 'front-street' : 'unconnected',
    boundary: front ? 'front' : null,
    x: gate.x, y: gate.y,
    outside: front ? { x: gate.x, y: (s.parcel?.y1 ?? gate.y) + 1 } : null,
  };
}

function issue(list, code, detail = {}) {
  const row = { code, ...detail };
  if (!list.some((x) => JSON.stringify(x) === JSON.stringify(row))) list.push(row);
}

export function normalizeGateAccess(s) {
  const gates = gateObjects(s), ids = gates.map((g) => g.id), primary = ids[0] ?? null;
  const old = s.gateAccess && s.gateAccess.v === 1 ? s.gateAccess : null;
  const issues = Array.isArray(old?.migration?.issues) ? old.migration.issues.map((x) => ({ ...x })) : [];
  const legacyQueue = Array.isArray(s.gateQ) ? [...s.gateQ] : [];
  const hadLegacyQueue = Object.prototype.hasOwnProperty.call(s, 'gateQ');
  const hadLegacyServing = gates.some((g) => Object.prototype.hasOwnProperty.call(g, 'serving'));
  const agents = activeAgentIds(s);
  const queues = {}, serving = {}, connections = {};

  for (const gate of gates) {
    const k = String(gate.id);
    connections[k] = connectionFor(s, gate, old?.connections?.[k]);
    const source = Array.isArray(old?.queues?.[k]) ? old.queues[k] : gate.id === primary ? legacyQueue : [];
    const clean = [];
    for (const id of uniqueIds(source)) {
      if (agents.has(id)) clean.push(id);
      else issue(issues, 'stale-queue-agent', { gateId: gate.id, agentId: id });
    }
    queues[k] = clean;
    const rawServing = old?.serving && Object.prototype.hasOwnProperty.call(old.serving, k) ? old.serving[k] : gate.serving;
    const sid = asId(rawServing);
    if (sid != null && agents.has(sid) && clean.includes(sid)) serving[k] = sid;
    else {
      serving[k] = null;
      if (sid != null) issue(issues, 'stale-serving-agent', { gateId: gate.id, agentId: sid });
    }
  }

  for (const ag of s.agents || []) {
    if (ag.kind !== 'cust' || !ag.veh || primary == null) continue;
    const current = asId(ag.gateId);
    if (current == null) ag.gateId = primary;
    else if (!ids.includes(current)) { issue(issues, 'stale-trip-gate', { agentId: ag.id, gateId: current }); ag.gateId = primary; }
  }

  for (const gate of gates) delete gate.serving;
  if (hadLegacyQueue) delete s.gateQ;
  s.gateAccess = {
    v: 1,
    gateIds: ids,
    connections,
    queues,
    serving,
    migration: {
      legacy: old?.migration?.legacy ?? !!(hadLegacyQueue || hadLegacyServing),
      issues,
    },
  };
  return s.gateAccess;
}

export function registerGateAccess(s, gate) {
  if (!s.gateAccess || s.gateAccess.v !== 1) normalizeGateAccess(s);
  const A = s.gateAccess, id = gate.id, k = String(id);
  if (!A.gateIds.includes(id)) A.gateIds.push(id);
  A.gateIds.sort((a, b) => a - b);
  A.connections[k] = connectionFor(s, gate, A.connections[k]);
  A.queues[k] ||= [];
  if (!Object.prototype.hasOwnProperty.call(A.serving, k)) A.serving[k] = null;
  delete gate.serving;
  return id;
}

export function unregisterGateAccess(s, id) {
  const A = s.gateAccess; if (!A || A.v !== 1) return;
  id = asId(id); const k = String(id);
  A.gateIds = A.gateIds.filter((x) => x !== id);
  delete A.connections[k]; delete A.queues[k]; delete A.serving[k];
  for (const ag of s.agents || []) if (ag.gateId === id) delete ag.gateId;
}

export const primaryGateId = (s) => s.gateAccess?.v === 1 ? (s.gateAccess.gateIds[0] ?? null) : null;
export const gateConnection = (s, id) => s.gateAccess?.connections?.[String(id)] || null;
export const gateQueue = (s, id) => s.gateAccess?.queues?.[String(id)] || [];
export const gateServing = (s, id) => s.gateAccess?.serving?.[String(id)] ?? null;
export function enqueueGate(s, id, agentId) { const q = gateQueue(s, id); if (!q.includes(agentId)) q.push(agentId); return q; }
export function shiftGate(s, id) { const q = gateQueue(s, id); return q.shift(); }
export function setGateServing(s, id, agentId) { if (s.gateAccess?.serving) s.gateAccess.serving[String(id)] = agentId ?? null; }
export function removeGateAgent(s, id, agentId) {
  if (!s.gateAccess?.queues) return;
  const ids = id == null ? s.gateAccess.gateIds : [id];
  for (const gid of ids) {
    const k = String(gid), q = gateQueue(s, gid);
    s.gateAccess.queues[k] = q.filter((x) => x !== agentId);
    if (gateServing(s, gid) === agentId) setGateServing(s, gid, null);
  }
}
export function gateStatus(s, gateOrId) {
  const gate = typeof gateOrId === 'object' ? gateOrId : s.objects?.[gateOrId];
  if (!gate || gate.type !== 'gate') return 'missing';
  if (gate.cstate !== 'operating') return 'pending';
  if ((gate.cond ?? 1) < 0.2 || gate.unpowered) return 'failed';
  return 'operating';
}
