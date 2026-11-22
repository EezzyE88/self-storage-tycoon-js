// Comeback Yard scenario progress. No economy, RNG, rendering, or initialization here.
// Record v1: the original yard on Maple's layout (old saves, makeComeback).
// Record v2: Cedar Creek Storage Yard (new starts): three goals that must all
// hold at the same moment; the scenario completes immediately when they do.
import { cedarSiteOk } from './cedarcreek.js';
export const COMEBACK_GOALS = [
  { k: 'comebackFirst', v: 1, label: 'Bring one unit back', fmt: 'n' },
  { k: 'comebackPlan', v: 1, label: 'Make your recovery choice work', fmt: 'n' },
  { k: 'comebackWing', v: 6, label: 'Bring all six spaces back', fmt: 'n' },
];
export const isComeback = (s) => s.scenario?.id === 'comeback';
export const isCedar = (s) => isComeback(s) && s.scenario.v === 2;
const dollars = (n) => '$' + Math.round(n).toLocaleString('en-US');
// Net liquid = cash minus bills already owed and any credit-line balance (financialPosition).
// With liquidGoal the goal is reaching it; without (3fd14ab records) it is staying above the start.
export const cedarGoals = ({ cash, leaseGoal, liquidGoal }) => [
  { k: 'cedarRestored', v: 6, label: 'Restore all six rear units', fmt: 'n' },
  { k: 'cedarLeased', v: leaseGoal, label: `Lease ${leaseGoal} restored units`, fmt: 'n' },
  liquidGoal != null
    ? { k: 'cedarCash', v: liquidGoal, label: `Reach ${dollars(liquidGoal)} cash after bills and debt`, fmt: 'money' }
    : { k: 'cedarCash', v: cash, label: `Cash after bills and debt above your ${dollars(cash)} start`, fmt: 'money' },
];
const cedarGoalsOf = (c) => cedarGoals({ cash: c.cash0, leaseGoal: c.leaseGoal, liquidGoal: c.liquidGoal });
export const cedarCashMet = (c, cash) => c.liquidGoal != null ? cash >= c.liquidGoal : cash > c.cash0;
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
// A restored target with at least one live lease (occupied or reserved) on its own units.
export function targetLeased(s, t) { return targetInService(s, t) && targetUnits(s, t).some(u => !!u.lease && ['occupied', 'reserved'].includes(u.commercial)); }
// Cash for the v2 goal: cash after bills already owed and any credit-line draw.
export const cedarCash = (sim) => sim.financialPosition().netLiquid;
// Size-level shopper feedback for the Cedar panel, from data the game already keeps:
// leases signed in the window that are still active, and the rolling lost-shopper log.
// The game does not track inquiries per unit, so this is reported by unit size only.
export function cedarDemand(sim, size = '10x10', days = 7) {
  // Buckets follow the reasons the game records: a 'competitor' loss is a shopper who chose an open
  // rival on price; 'service' and 'ownerDeferred' are shoppers the counter did not serve.
  const s = sim.s, from = sim.day - days + 1, lost = { price: 0, competitor: 0, noReady: 0, service: 0, other: 0 };
  const bucket = { price: 'price', competitor: 'competitor', noReady: 'noReady', service: 'service', ownerDeferred: 'service' };
  for (const x of s.mkt?.lostLog || []) if (x.sz === size && x.d >= from && !x.climate) lost[bucket[x.r] || 'other']++;
  const leased = Object.values(s.leases).filter(L => L.start >= from && s.objects[L.unit]?.size === size).length;
  const comps = sim.openComps?.() || [], rival = comps.length ? comps.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const coming = (s.mkt?.comp || []).filter(c => c.opens > sim.day).sort((a, b) => a.opens - b.opens)[0] || null;
  return { size, days, leased, lost, rival: rival && { name: rival.name, price: rival.price }, coming: coming && { name: coming.name, opens: coming.opens, price: coming.price } };
}
export function comebackProgress(sim) {
  const s = sim.s, c = s.scenario;
  const disabled = c?.status === 'unavailable';
  if (c?.v === 2 && !disabled) {
    const targets = c.targets || [], us = targets.flatMap(t => targetUnits(s, t));
    const restored = targets.filter(t => targetInService(s, t)).length, leased = targets.filter(t => targetLeased(s, t)).length, cash = cedarCash(sim);
    const cur = [restored, leased, cash], met = [restored === 6, leased >= c.leaseGoal, cedarCashMet(c, cash)];
    return { v: 2, restored, leased, cash, cash0: c.cash0, leaseGoal: c.leaseGoal, liquidGoal: c.liquidGoal ?? null,
      ready: us.filter(u => unitInService(s, u) && u.commercial === 'ready').length,
      occupied: us.filter(u => unitInService(s, u) && u.commercial === 'occupied').length,
      reserved: us.filter(u => unitInService(s, u) && u.commercial === 'reserved').length,
      missing: targets.filter(t => !targetUnits(s, t).length).map(t => t.num),
      owner: c.ownerDone?.length || 0, staff: c.staffDone?.length || 0,
      goals: cedarGoalsOf(c).map((g, k) => ({ ...g, met: met[k], cur: cur[k] })) };
  }
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
export function validComeback(s) { const v = s.scenario?.v; return v === 1 ? validComebackV1(s) : v === 2 ? validComebackV2(s) : false; }
function validComebackV1(s) {
  const c = s.scenario, ts = c.targets;
  return c.v === 1 && c.site === undefined && targetsOk(s, ts) &&
    ['ownerDone','staffDone'].every(k => Array.isArray(c[k]) && c[k].every(id => ts.some(t => t.id === id)) && new Set(c[k]).size === c[k].length) &&
    Array.isArray(c.earned) && c.earned.length === 3 && c.earned.every(v => typeof v === 'boolean') && typeof c.acknowledged === 'boolean' &&
    ['active','won'].includes(c.status) && (c.status === 'won') === c.earned.every(Boolean) && (!c.acknowledged || c.status === 'won') && (!c.earned[2] || c.earned[0]) && (!c.earned[1] || c.staffDone.length > 0 || c.ownerDone.length >= 2);
}
function validComebackV2(s) {
  const c = s.scenario, ts = c.targets;
  return c.v === 2 && cedarSiteOk(s) && targetsOk(s, ts) &&
    ['ownerDone','staffDone'].every(k => Array.isArray(c[k]) && c[k].every(id => ts.some(t => t.id === id)) && new Set(c[k]).size === c[k].length) &&
    Number.isFinite(c.cash0) && c.cash0 > 0 && Number.isInteger(c.leaseGoal) && c.leaseGoal >= 1 && c.leaseGoal <= 6 &&
    (c.liquidGoal === undefined || (Number.isFinite(c.liquidGoal) && c.liquidGoal > c.cash0)) &&
    Array.isArray(c.earned) && c.earned.length === 3 && c.earned.every(v => typeof v === 'boolean') && typeof c.acknowledged === 'boolean' &&
    ['active','won'].includes(c.status) && (!c.acknowledged || c.status === 'won') &&
    (c.status !== 'won' || (c.earned.every(Boolean) && int(c.endDay) && Number.isFinite(c.endCash)));
}
function targetsOk(s, ts) {
  return Array.isArray(ts) && ts.length === 6 && new Set(ts.map(t => t?.id)).size === 6 &&
    ts.every(t => t && int(t.id) && t.id > 0 && int(t.num) && [t.x,t.y,t.f,t.w,t.h].every(int) && t.w > 0 && t.h > 0 && t.x + t.w <= s.W && t.y + t.h <= s.H && t.f < s.hall.length && t.access === 'drive' && t.env === 'std' && Array.isArray(t.dir) && t.dir.length === 2 && Math.abs(t.dir[0]) + Math.abs(t.dir[1]) === 1 && t.dir.every(Number.isInteger) && Array.isArray(t.ids) && t.ids.length > 0 && t.ids.length <= 4 && t.ids.every(id => int(id) && id > 0) && new Set(t.ids).size === t.ids.length) &&
    ts.every((t,i) => ts.slice(i+1).every(u => t.f !== u.f || t.x+t.w <= u.x || u.x+u.w <= t.x || t.y+t.h <= u.y || u.y+u.h <= t.y)) &&
    new Set(ts.flatMap(t => t.ids)).size === ts.reduce((n,t) => n + t.ids.length,0);
}
export function normalizeComeback(s) {
  if (!isComeback(s)) return;
  const c = s.scenario;
  const valid = validComeback(s);
  if (!valid) {
    s.scenario = c?.v === 2
      ? { id: 'comeback', name: 'Cedar Creek Storage Yard', status: 'unavailable', goals: [],
        notice: 'Cedar Creek progress could not be read. Your property is still playable; start a new Cedar Creek Storage Yard for fresh goals.' }
      : { id: 'comeback', name: 'The Comeback Yard', status: 'unavailable', goals: [],
        notice: 'Comeback progress could not be read. Your property is still playable; start a new Comeback Yard for fresh goals.' };
    return;
  }
  if (c.v === 2) { c.goals = cedarGoalsOf(c); c.deadline = null; c.fail = null; return; }
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
  if (c.v === 2) {
    // All three goals must hold now. Each goal's first completion toasts once; the win happens at most once.
    const p = comebackProgress(sim), met = p.goals.map(g => g.met);
    met.forEach((v,k) => { if (v && !c.earned[k]) { c.earned[k] = true; sim.emit('comeback_goal', { goal: k, label: c.goals[k].label }); } });
    if (met.every(Boolean)) { c.status = 'won'; c.endDay = sim.day; c.endCash = p.cash; sim.emit('scenario_end', { won: true, comeback: true }); }
    return;
  }
  const p = comebackProgress(sim), met = [p.restored >= 1, p.staff > 0 || p.owner >= 2, p.restored === 6];
  met.forEach((v,k) => { if (v && !c.earned[k]) { c.earned[k] = true; sim.emit('comeback_goal', { goal: k, label: COMEBACK_GOALS[k].label }); } });
  if (c.earned.every(Boolean)) { c.status = 'won'; c.endDay = sim.day; sim.emit('scenario_end', { won: true, comeback: true }); }
}
