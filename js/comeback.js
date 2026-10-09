// Comeback Yard scenario progress. No economy, RNG, rendering, or initialization here.
export const COMEBACK_GOALS = [
  { k: 'comebackFirst', v: 1, label: 'Bring one unit back', fmt: 'n' },
  { k: 'comebackPlan', v: 1, label: 'Make your recovery choice work', fmt: 'n' },
  { k: 'comebackWing', v: 6, label: 'Bring all six spaces back', fmt: 'n' },
];
export const isComeback = (s) => s.scenario?.id === 'comeback';
const int = (v) => Number.isInteger(v) && v >= 0;
const inside = (t, u) => u && u.type === 'unit' && (u.f || 0) === t.f && u.access === t.access && u.env === t.env && u.dir?.[0] === t.dir[0] && u.dir?.[1] === t.dir[1] && u.x >= t.x && u.y >= t.y && u.x + u.w <= t.x + t.w && u.y + u.h <= t.y + t.h;
export function targetUnits(s, t) {
  const units = t.ids.map(id => s.objects[id]);
  if (!units.every(u => inside(t, u))) return [];
  const cells = new Set();
  for (const u of units) for (let y = u.y; y < u.y + u.h; y++) for (let x = u.x; x < u.x + u.w; x++) {
    const key = `${x},${y}`; if (cells.has(key)) return []; cells.add(key);
  }
  return cells.size === t.w * t.h ? units : [];
}
export function unitInService(s, u) {
  if (!u || u.type !== 'unit' || u.cstate !== 'operating' || u.blocked || u.missing?.length) return false;
  if (u.commercial === 'ready') return !u.lease;
  const L = u.lease && s.leases[u.lease];
  return ['occupied', 'reserved'].includes(u.commercial) && L?.unit === u.id && !!s.tenants[L.tenant];
}
export function targetInService(s, t) { const us = targetUnits(s, t); return us.length > 0 && us.every(u => unitInService(s, u)); }
export function comebackProgress(sim) {
  const s = sim.s, c = s.scenario;
  const disabled = c?.status === 'unavailable';
  const targets = disabled ? [] : c?.targets || [];
  const restored = targets.filter(t => targetInService(s, t)).length;
  const us = targets.flatMap(t => targetUnits(s, t));
  return { restored, ready: us.filter(u => unitInService(s, u) && u.commercial === 'ready').length,
    occupied: us.filter(u => unitInService(s, u) && u.commercial === 'occupied').length,
    reserved: us.filter(u => unitInService(s, u) && u.commercial === 'reserved').length,
    missing: targets.filter(t => !targetUnits(s, t).length).map(t => t.num),
    owner: c?.ownerDone?.length || 0, staff: c?.staffDone?.length || 0,
    goals: COMEBACK_GOALS.map((g, k) => ({ ...g, met: !!c?.earned?.[k], cur: k === 0 ? Math.min(1, restored) : k === 1 ? +(!!c?.staffDone?.length || (c?.ownerDone?.length || 0) >= 2) : restored })) };
}
export function validComeback(s) {
  const c = s.scenario, ts = c.targets;
  return c.v === 1 && Array.isArray(ts) && ts.length === 6 && new Set(ts.map(t => t?.id)).size === 6 &&
    ts.every(t => t && int(t.id) && t.id > 0 && int(t.num) && [t.x,t.y,t.f,t.w,t.h].every(int) && t.w > 0 && t.h > 0 && t.x + t.w <= s.W && t.y + t.h <= s.H && t.f < s.hall.length && t.access === 'drive' && t.env === 'std' && Array.isArray(t.dir) && t.dir.length === 2 && Math.abs(t.dir[0]) + Math.abs(t.dir[1]) === 1 && t.dir.every(Number.isInteger) && Array.isArray(t.ids) && t.ids.length > 0 && t.ids.length <= 4 && t.ids.every(id => int(id) && id > 0) && new Set(t.ids).size === t.ids.length) &&
    ts.every((t,i) => ts.slice(i+1).every(u => t.f !== u.f || t.x+t.w <= u.x || u.x+u.w <= t.x || t.y+t.h <= u.y || u.y+u.h <= t.y)) &&
    new Set(ts.flatMap(t => t.ids)).size === ts.reduce((n,t) => n + t.ids.length,0) &&
    ['ownerDone','staffDone'].every(k => Array.isArray(c[k]) && c[k].every(id => ts.some(t => t.id === id)) && new Set(c[k]).size === c[k].length) &&
    Array.isArray(c.earned) && c.earned.length === 3 && c.earned.every(v => typeof v === 'boolean') && typeof c.acknowledged === 'boolean' &&
    ['active','won'].includes(c.status) && (c.status === 'won') === c.earned.every(Boolean) && (!c.acknowledged || c.status === 'won') && (!c.earned[2] || c.earned[0]) && (!c.earned[1] || c.staffDone.length > 0 || c.ownerDone.length >= 2);
}
export function normalizeComeback(s) {
  if (!isComeback(s)) return;
  const c = s.scenario;
  const valid = validComeback(s);
  if (!valid) {
    s.scenario = { id: 'comeback', name: 'The Comeback Yard', status: 'unavailable', goals: [],
      notice: 'Comeback progress could not be read. Your property is still playable; start a new Comeback Yard for fresh goals.' };
    return;
  }
  c.goals = COMEBACK_GOALS.map(g => ({ ...g })); c.deadline = null; c.fail = null;
}
// Explicit construction/renovation may replace a target, only with full, nonoverlapping coverage of its original space.
export function mapComebackReplacements(sim, newIds) {
  const s = sim.s, c = s.scenario; if (!isComeback(s) || c.status === 'unavailable') return;
  for (const t of c.targets) {
    if (targetUnits(s,t).length) continue;
    const ids = [...new Set([...t.ids.filter(id => s.objects[id]), ...newIds.filter(id => inside(t, s.objects[id]))])];
    if (ids.length && ids.length <= 4 && targetUnits(s, { ...t, ids }).length) t.ids = ids;
  }
}
export function recordComebackWork(sim, task, ag) {
  const s = sim.s, c = s.scenario; if (!isComeback(s) || c.status !== 'active' || task.type !== 'makeready' || !ag) return;
  const st = s.staff.find(st => st.id === ag.sid && st.role === ag.role);
  const t = c.targets.find(t => t.ids.includes(task.obj) && inside(t, s.objects[task.obj]));
  if (!st || !t) return;
  const ids = ag.role === 'owner' ? c.ownerDone : c.staffDone;
  if (!ids.includes(t.id)) ids.push(t.id);
}
export function checkComeback(sim) {
  const s = sim.s, c = s.scenario; if (!isComeback(s) || c.status !== 'active') return;
  const p = comebackProgress(sim), met = [p.restored >= 1, p.staff > 0 || p.owner >= 2, p.restored === 6];
  met.forEach((v,k) => { if (v && !c.earned[k]) { c.earned[k] = true; sim.emit('comeback_goal', { goal: k, label: COMEBACK_GOALS[k].label }); } });
  if (c.earned.every(Boolean)) { c.status = 'won'; c.endDay = sim.day; sim.emit('scenario_end', { won: true, comeback: true }); }
}
