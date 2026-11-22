// Scenario kit (SK-01): shared, additive rules for the newer authored scenarios.
// Active only when s.scenario.kit exists. Older scenarios (Cedar Creek, Maple Turnaround, Go Vertical,
// Climate Boom) never create kit state, so none of this code runs for them or for their saves.
//
// What the kit adds to a scenario:
//  - a run seed, so each new start differs (which days events land, which units are let, storm strength...)
//  - goals that must HOLD for several morning checks in a row (no win from a one-morning snapshot)
//  - authored decisions with real costs, shown on the scenario card (time pauses while it is open)
//  - optional projects (one-time investments that take days to finish)
//  - lender / owner checkpoints with advance warning and a cure period before a loss
//  - temporary market modifiers (demand, costs) that expire on their own
//  - a versioned result record with a star rating and the reasons behind it
// All kit state is plain JSON inside s.scenario.kit, so save/load needs no new code.
import { MIN_PER_DAY } from './data.js';

const DEFS = {};
export function registerKit(id, def) { DEFS[id] = def; }
export function kitDef(s) { return s && s.scenario && s.scenario.kit ? DEFS[s.scenario.id] || null : null; }
export function isKit(s) { return !!(s && s.scenario && s.scenario.kit); }
export const KIT_VERSION = 1;

// small deterministic RNG kept in kit state (does not disturb the main simulation stream)
export function kitRand(k) { k.r = (Math.imul(k.r >>> 0, 1664525) + 1013904223) >>> 0; return k.r / 4294967296; }
export function seedRand(seed) { let r = seed >>> 0 || 1; return () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; }; }
export function runSeed() { return ((Date.now() % 2147483647) ^ Math.floor(Math.random() * 2147483647)) >>> 0 || 1; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- setup
export function kitState({ seed, events = [], checks = [], projects = [], base = {}, start = {}, extra = {} }) {
  return {
    v: KIT_VERSION, seed, r: (seed ^ 0x9e3779b9) >>> 0,
    events: events.map((e) => ({ fired: false, choice: null, ...e })),
    checks: checks.map((c) => ({ result: null, warned: false, cureUntil: null, ...c })),
    projects: projects.map((p) => ({ state: 'offered', ...p })),
    pending: null, mods: [], base: { demand: 1, costs: 1, ...base }, streak: 0, best: 0, badStreak: {},
    log: [], flags: {}, start, result: null, notes: [], ...extra,
  };
}

// ---------------------------------------------------------------- metrics
function lastDays(sim, n = 30) { return sim.s.days.slice(-n); }
export function kitMetric(sim, k) {
  const s = sim.s, kit = s.scenario && s.scenario.kit, def = kitDef(s);
  if (def && def.metric) { const v = def.metric(sim, k); if (v !== undefined) return v; }
  switch (k) {
    case 'opProfit30': { const d = lastDays(sim); if (d.length < 30) return -1; return d.reduce((a, x) => a + x.rent + (x.anc || 0) + (x.other || 0) - x.opex - x.payroll - (x.service || 0) - (x.marketing || 0), 0); }
    case 'debtPay': return s.debt.reduce((a, d) => a + d.pmt, 0) || 0;
    case 'dscr': { const p = kitMetric(sim, 'opProfit30'), pay = kitMetric(sim, 'debtPay'); if (p === -1) return 0; return pay > 0 ? p / pay : 9; }
    case 'netLiquid': return sim.financialPosition().netLiquid;
    case 'rollPaying': return sim.rentRollPaying();
    case 'equipOk': { const eq = Object.values(s.objects).filter((o) => o.cstate === 'operating' && ['light', 'camera', 'gate'].includes(o.type)); return eq.length ? eq.filter((o) => sim.works(o)).length / eq.length : 1; }
    case 'avgRentRatio': { const Ls = Object.values(s.leases); if (!Ls.length) return 0; return Ls.reduce((a, L) => { const u = s.objects[L.unit]; return a + (u ? L.rent / sim.marketRent(u) : 1); }, 0) / Ls.length; }
    case 'delinquent': return Object.values(s.leases).filter((L) => ['delinquent', 'lien', 'notice', 'auction'].includes(L.status)).length;
    default: return kit ? 0 : 0;
  }
}

// ---------------------------------------------------------------- modifiers
export function addMod(sim, mod) { const k = sim.s.scenario.kit; k.mods.push({ ...mod, from: sim.day }); applyMods(sim); }
export function applyMods(sim) {
  const s = sim.s, k = s.scenario.kit, day = sim.day;
  k.mods = k.mods.filter((m) => m.until == null || day <= m.until);
  const prod = (key) => k.mods.filter((m) => m.k === key).reduce((a, m) => a * m.mult, 1);
  s.opts = { ...(s.opts || {}) };
  s.opts.demand = Math.round(k.base.demand * prod('demand') * 1000) / 1000;
  s.opts.costs = Math.round(k.base.costs * prod('costs') * 1000) / 1000;
}
export function modsFor(sim, key) { return sim.s.scenario.kit.mods.filter((m) => m.k === key); }

// ---------------------------------------------------------------- log, notes
export function kitLog(sim, text, tone = '') { const k = sim.s.scenario.kit; k.log.push({ day: sim.day, text, tone }); if (k.log.length > 60) k.log.shift(); }

// ---------------------------------------------------------------- decisions
function optionCost(o) { return o.cost || 0; }
export function firePending(sim, e) {
  const k = sim.s.scenario.kit, def = kitDef(sim.s);
  const view = def.decision(sim, e); if (!view) { e.fired = true; e.choice = -1; return; }
  e.fired = true;
  k.pending = { id: e.id, title: view.title, who: view.who || '', text: view.text, opts: view.opts.map((o) => ({ label: o.label, sub: o.sub || '', cost: o.cost || 0 })), def: view.def ?? view.opts.length - 1, expires: sim.day + (view.days || 5), firedDay: sim.day };
  sim.emit('scn_decision', { id: e.id, title: view.title });
}
export function kitChoose(sim, a) {
  const s = sim.s, sc = s.scenario, k = sc && sc.kit, def = kitDef(s);
  if (!k || !def) return { ok: false, msg: 'No scenario decision is open' };
  if (sc.status !== 'active') return { ok: false, msg: 'This scenario has ended' };
  const p = k.pending; if (!p || p.id !== a.ev) return { ok: false, msg: 'That decision is no longer open' };
  const i = Math.floor(Number(a.i)); const o = p.opts[i]; if (!o) return { ok: false, msg: 'Unknown choice' };
  const cost = optionCost(o);
  if (cost > 0 && !a.auto && sim.financialPosition({ spend: cost }).cash < 0) return { ok: false, msg: `Not enough cash for ${fmt(cost)}` };
  const e = k.events.find((x) => x.id === p.id); if (e) e.choice = i;
  k.pending = null;
  const msg = def.choose(sim, p.id, i, !!a.auto) || o.label;
  kitLog(sim, `${p.title}: ${o.label}${a.auto ? ' (no answer, default)' : ''}`, 'decision');
  sim.emit('scn_choice', { id: p.id, i });
  return { ok: true, msg };
}
export function kitProject(sim, a) {
  const s = sim.s, sc = s.scenario, k = sc && sc.kit, def = kitDef(s);
  if (!k || !def || sc.status !== 'active') return { ok: false, msg: 'No scenario projects are open' };
  const p = k.projects.find((x) => x.id === a.id); if (!p) return { ok: false, msg: 'Unknown project' };
  if (p.state !== 'offered') return { ok: false, msg: p.state === 'building' ? 'Already under way' : 'Already finished' };
  if (p.until != null && sim.day > p.until) return { ok: false, msg: 'This project is no longer offered' };
  if (sim.financialPosition({ spend: p.cost }).cash < 0) return { ok: false, msg: `Not enough cash for ${fmt(p.cost)}` };
  sim.money(-p.cost, 'capex', p.name);
  p.state = 'building'; p.doneDay = sim.day + (p.days || 0); p.boughtDay = sim.day;
  kitLog(sim, `Started ${p.name} (${fmt(p.cost)}, ready Day ${p.doneDay})`, 'decision');
  if (!p.days) finishProject(sim, p);
  return { ok: true, msg: `${p.name}: ${p.days ? 'ready on Day ' + p.doneDay : 'done'}` };
}
function finishProject(sim, p) { p.state = 'done'; const def = kitDef(sim.s); def.projectDone && def.projectDone(sim, p.id); kitLog(sim, `${p.name} finished`, 'good'); sim.emit('scn_project', { id: p.id }); }
export function projectDone(s, id) { const p = s.scenario.kit.projects.find((x) => x.id === id); return !!p && p.state === 'done'; }

// ---------------------------------------------------------------- daily check (from Sim.scenarioCheck at the 7:00 batch)
export function kitCheck(sim, day) {
  const s = sim.s, sc = s.scenario, k = sc.kit, def = kitDef(s);
  if (!def || sc.status !== 'active') return;
  applyMods(sim);
  for (const p of k.projects) if (p.state === 'building' && day >= p.doneDay) finishProject(sim, p);
  // decisions: one open at a time; an unanswered decision takes its stated default when it expires
  if (k.pending && day >= k.pending.expires) kitChoose(sim, { ev: k.pending.id, i: k.pending.def, auto: true });
  if (def.onDay) def.onDay(sim, day);
  if (sc.status !== 'active') return;
  if (!k.pending) { const e = k.events.find((x) => !x.fired && day >= x.day); if (e) firePending(sim, e); }
  // checkpoints (lender reviews, owner targets): warned ahead; a miss opens a cure period; a miss after cure ends the run
  for (const c of k.checks) {
    if (c.result === 'pass' || c.result === 'fail') continue;
    const cur = sim.metric(c.k), ok = c.cmp === '<' ? cur < c.v : cur >= c.v;
    if (!c.warned && day >= c.day - (c.warn ?? 10)) { c.warned = true; sim.emit('scn_warn', { msg: `${c.label} on Day ${c.day}` }); kitLog(sim, `Coming up: ${c.label} on Day ${c.day}`, 'warn'); }
    if (c.result == null && day >= c.day) {
      c.at = cur;
      if (ok) { c.result = 'pass'; kitLog(sim, `${c.label}: passed`, 'good'); sim.emit('scn_check', { ok: true, label: c.label }); }
      else if (c.cure) { c.result = 'cure'; c.cureUntil = day + c.cure; kitLog(sim, `${c.label}: missed. ${c.cure} days to fix it`, 'bad'); sim.emit('scn_check', { ok: false, label: c.label, cure: c.cureUntil }); sim.emit('cash_warn', { msg: `${c.label} missed. Fix it by Day ${c.cureUntil} or the run ends.` }); }
      else { c.result = 'fail'; return endKit(sim, false, c.failWhy || `${c.label} missed`); }
    } else if (c.result === 'cure') {
      if (ok) { c.result = 'pass'; c.cured = day; kitLog(sim, `${c.label}: fixed on Day ${day}`, 'good'); }
      else if (day >= c.cureUntil) { c.result = 'fail'; c.at = cur; return endKit(sim, false, c.failWhy || `${c.label} still missed on Day ${c.cureUntil}`); }
    }
  }
  // sustained-failure rules (e.g. reputation below a floor for N mornings)
  for (const f of sc.kitFail || []) {
    const cur = sim.metric(f.k), bad = f.cmp === '>' ? cur > f.v : cur < f.v;
    k.badStreak[f.k] = bad ? (k.badStreak[f.k] || 0) + 1 : 0;
    if (bad && k.badStreak[f.k] === 1) sim.emit('cash_warn', { msg: `${f.label}: ${f.days} mornings in a row ends the run` });
    if (k.badStreak[f.k] >= f.days) return endKit(sim, false, f.why);
  }
  // cash rule (same meaning as the older scenarios)
  const f = sc.fail; let failing = false;
  if (f && f.cashBelow != null && sim.financialPosition().netLiquid < f.cashBelow) failing = true;
  sc.badDays = failing ? (sc.badDays || 0) + 1 : 0;
  if (failing && sc.badDays === 1) sim.emit('cash_warn', { msg: `Scenario risk: cash after bills and debt below ${fmt(f.cashBelow)}. ${f.cashDays} mornings of this ends the run` });
  if (f && f.cashDays && sc.badDays >= f.cashDays) return endKit(sim, false, `Cash after bills and debt stayed below ${fmt(f.cashBelow)} for ${f.cashDays} days`);
  // goals must all hold together for sc.hold mornings, from sc.winFrom onward
  const allMet = sc.goals.every((g) => sim.goalMet(g)) && !k.checks.some((c) => c.result === 'cure');
  k.streak = allMet && day >= (sc.winFrom || 1) ? k.streak + 1 : 0; k.best = Math.max(k.best, k.streak);
  if (k.streak >= (sc.hold || 1)) return endKit(sim, true, null);
  if (day >= sc.deadline) return endKit(sim, false, `Day ${sc.deadline} arrived before every goal held for ${sc.hold} mornings`);
}

// ---------------------------------------------------------------- endings + result record
export function endKit(sim, won, why) {
  const s = sim.s, sc = s.scenario, k = sc.kit, def = kitDef(s);
  sc.status = won ? 'won' : 'lost'; sc.endDay = sim.day; if (why) sc.why = why;
  k.pending = null;
  const goals = sc.goals.map((g) => ({ k: g.k, label: g.label, v: g.v, cmp: g.cmp || null, fmt: g.fmt || null, cur: sim.metric(g.k), met: sim.goalMet(g) }));
  let stars = 0, notes = [];
  if (won) { const r = def.score ? def.score(sim) : { stars: 1, notes: [] }; stars = clamp(r.stars, 1, 3); notes = r.notes || []; }
  k.result = { v: KIT_VERSION, id: sc.id, won, why: why || null, day: sim.day, deadline: sc.deadline, seed: k.seed, stars, notes, goals,
    cash: Math.round(s.cash), netLiquid: Math.round(sim.financialPosition().netLiquid), occ: +sim.occupancy().pct.toFixed(3), rep: +sim.reputation().toFixed(3), roll: Math.round(sim.rentRoll()),
    decisions: k.events.filter((e) => e.fired && e.choice != null && e.choice >= 0).length, held: k.streak, t: s.t };
  k.result.check = resultCheck(k.result);
  kitLog(sim, won ? `Scenario complete on Day ${sim.day}: ${'★'.repeat(stars)}` : `Scenario failed on Day ${sim.day}: ${why}`, won ? 'good' : 'bad');
  sim.emit('scenario_end', { won, kit: true });
  if (won) sim.milestone('scenario_' + sc.id);
}
// A light consistency check for the stored result (not security): a won record must carry held goals and stars.
export function resultCheck(r) {
  const body = [r.v, r.id, r.won ? 1 : 0, r.day, r.seed, r.stars, r.goals.map((g) => g.met ? 1 : 0).join(''), r.held].join('|');
  let h = 2166136261; for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}
export function validResult(r) {
  if (!r || r.v !== KIT_VERSION || typeof r.id !== 'string' || !Array.isArray(r.goals)) return false;
  if (r.check !== resultCheck(r)) return false;
  if (r.won && (!(r.stars >= 1 && r.stars <= 3) || !r.goals.every((g) => g.met))) return false;
  return true;
}

// ---------------------------------------------------------------- view helpers for the UI
export function kitView(sim) {
  const s = sim.s, sc = s.scenario, k = sc.kit, day = sim.day;
  const upcoming = [];
  for (const c of k.checks) {
    if (c.result === 'cure') upcoming.push({ day: c.cureUntil, text: `Fix by Day ${c.cureUntil}: ${c.label}`, urgent: true, cur: sim.metric(c.k), c });
    else if (c.result == null && c.warned) upcoming.push({ day: c.day, text: `Day ${c.day}: ${c.label}`, urgent: c.day - day <= 5, cur: sim.metric(c.k), c });
    else if (c.result == null) upcoming.push({ day: c.day, text: `Day ${c.day}: ${c.label}`, urgent: false, cur: sim.metric(c.k), c });
  }
  const def = kitDef(s); const extra = def && def.upcoming ? def.upcoming(sim) : [];
  upcoming.push(...extra);
  upcoming.sort((a, b) => a.day - b.day);
  return { upcoming: upcoming.slice(0, 4), projects: k.projects.filter((p) => p.state !== 'hidden' && (p.until == null || day <= p.until || p.state !== 'offered')), pending: k.pending, streak: k.streak, hold: sc.hold, log: k.log.slice(-8).reverse(), mods: k.mods };
}
export const DAY_MIN = MIN_PER_DAY;
