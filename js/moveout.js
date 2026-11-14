// MG-01 Move-Out Turnaround (Revision 3 sweep-and-mop), simulation side. No DOM.
// One authoritative SST make-ready job; the Owner may personally clean it instead of the normal walk-and-work route.
// - Only genuine, available, unclaimed make-ready jobs on a vacant unit qualify. Auction clean-outs do not.
// - While played, the job is claimed by the Owner: staff, queues and vendors cannot take it.
// - Normal Owner labor: the job's standard hours are booked against today's Owner capacity, exactly as Send Owner.
// - Leaving returns the job unchanged and refunds the hours. A save holding a claim is released on load.
// - Completion runs once, through the normal finishTask path (rent-ready, milestone, work report).
// - Cadence: at most one featured opportunity per five genuine move-out jobs, per property (state.mg01).
// No money, rent, reputation, RNG or Pause changes here.
import { WORK, ROLES } from './data.js';

export const MG01_CADENCE = 5;
const nat = (n) => Number.isInteger(n) && n >= 0;

// Called from the Sim constructor. Legacy saves have no state.mg01 and stay without one until a move-out needs it.
export function recoverMoveOut(sim) {
  const s = sim.s, m = s.mg01;
  if (m !== undefined) {
    if (!m || typeof m !== 'object' || Array.isArray(m) || m.v !== 1) delete s.mg01;
    else {
      for (const k of ['eligible', 'sessions', 'done']) if (!nat(m[k])) m[k] = 0;
      if (m.featuredAt !== null && !(nat(m.featuredAt) && m.featuredAt >= 1 && m.featuredAt <= m.eligible)) m.featuredAt = null;
    }
  }
  // Interruption recovery: a claim cannot outlive the page that held it.
  for (const t of Array.isArray(s.tasks) ? s.tasks : []) {
    if (t && t.mg01Featured !== undefined && t.mg01Featured !== true) delete t.mg01Featured;
    if (t && t.mg01Claim !== undefined) releaseClaim(sim, t);
  }
}
function state(s) { return (s.mg01 ||= { v: 1, eligible: 0, featuredAt: null, sessions: 0, done: 0 }); }
function ownerOf(s) { return s.staff.find((x) => x.role === 'owner') || null; }
function guided(s) { return !!(s.tut && s.tut.on && !s.tut.done) || !!s.lesson; }
function releaseClaim(sim, t) {
  const owner = ownerOf(sim.s);
  if (owner) sim.refundTaskWork(owner, t);
  if (owner && t.assigned === owner.id) t.assigned = null;
  t.queued = false; delete t.mg01Claim;
}

// endLease hook: count one genuine move-out make-ready and maybe feature it. Nothing else changes.
export function noteMoveOutJob(sim, t) {
  if (!t || t.type !== 'makeready' || t.total !== WORK.makeready) return false;
  const m = state(sim.s); m.eligible++;
  if (guided(sim.s)) return false; // the campaign/lesson coach owns the screen; the slot stays due
  if (m.featuredAt !== null && m.eligible - m.featuredAt < MG01_CADENCE) return false;
  m.featuredAt = m.eligible; t.mg01Featured = true;
  return true;
}

export function moveOutClaimed(t) { return !!(t && t.mg01Claim); }

// Why (or whether) this exact job can be cleaned personally right now. `hours` is reported separately so the UI can
// show the same disabled state as Send Owner when the Owner is short of capacity today.
export function moveOutCheck(sim, t) {
  const s = sim.s;
  if (!t || !s.tasks.includes(t) || t.type !== 'makeready' || t.total !== WORK.makeready) return { ok: false, why: 'job' };
  const u = s.objects[t.obj];
  if (!u || u.type !== 'unit' || u.lease || u.commercial !== 'unready') return { ok: false, why: 'unit' };
  if (t.assigned || t.queued || t.vendor || t.prog || t.mg01Claim) return { ok: false, why: 'claimed' };
  if (s.agents.some((a) => a.task === t.id || (a.queue || []).includes(t.id))) return { ok: false, why: 'claimed' };
  if (guided(s)) return { ok: false, why: 'guided' };
  const owner = ownerOf(s), ag = owner && s.agents.find((g) => g.sid === owner.id);
  if (!owner || !ag || !ROLES.owner.can.includes(t.need)) return { ok: false, why: 'owner' };
  if (t.unreachable != null || !sim.taskCell(t)) return { ok: false, why: 'route' };
  const need = sim.taskHours(t), left = sim.workRemaining(owner);
  if (left + 1e-9 < need) return { ok: false, why: 'hours', need, left };
  return { ok: true, need, left, featured: t.mg01Featured === true };
}

export function startMoveOut(sim, a) {
  const s = sim.s, t = s.tasks.find((x) => x.id === a.task);
  const c = moveOutCheck(sim, t);
  if (!c.ok) return { ok: false, msg: c.why === 'hours' ? `Owner has ${c.left}h available today; this needs ${c.need}h.` : 'This make-ready job is not available to clean yourself right now.' };
  const owner = ownerOf(s);
  if (!sim.reserveTaskWork(owner, t)) return { ok: false, msg: 'Owner has no work hours left for this today.' };
  const m = state(s), token = ++m.sessions;
  t.assigned = owner.id; t.queued = false; t.mg01Claim = { token, day: sim.day };
  return { ok: true, token, task: t.id, unit: t.obj, msg: `Owner is cleaning ${s.objects[t.obj].name} (${c.need}h)` };
}

export function leaveMoveOut(sim, a) {
  const t = sim.s.tasks.find((x) => x.mg01Claim && x.mg01Claim.token === a.token);
  if (!t) return { ok: false, msg: 'Nothing to leave' };
  releaseClaim(sim, t);
  return { ok: true, msg: 'Make-ready returned to the work queue. No Owner hours used.' };
}

export function finishMoveOut(sim, a) {
  const s = sim.s, t = s.tasks.find((x) => x.mg01Claim && x.mg01Claim.token === a.token);
  if (!t) return { ok: false, msg: 'This job was already finished or returned.' };
  const u = s.objects[t.obj], owner = ownerOf(s);
  const booked = owner && t.workBooked === owner.id && t.workBookedDay === sim.day;
  if (!u || u.type !== 'unit' || u.lease || !owner || (!booked && !sim.reserveTaskWork(owner, t))) {
    releaseClaim(sim, t); return { ok: false, msg: 'The job changed; it was returned to the work queue.' };
  }
  delete t.mg01Claim;
  // The Owner did the work: credit it to the Owner role without disturbing the Owner's current walk or queue.
  sim.finishTask(t, { kind: 'staff', role: 'owner', sid: owner.id, task: t.id });
  state(s).done++;
  sim.emit('mg01_done', { unit: u.id });
  return { ok: true, unit: u.id, msg: `${u.name} is clean and rent-ready.` };
}
