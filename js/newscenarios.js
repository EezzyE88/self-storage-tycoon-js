// Three scenario starts added Nov 22, 2026 (local prototype, not accepted):
//   ratereset   Harborview Rate Reset  - pricing, rent reviews, retention and upkeep decide the run
//   freightlift Ironworks Lofts        - an aging freight elevator, upper-floor rent and uptime
//   campus      Campus Crunch          - a move-out wave, a fall rush and when to staff up or down
// Each start takes a per-run seed and draws one variant from it. All three set s.scenario.rules, which is the
// only switch for the scenario-only engine rules in scenariorules.js.
import { newState, Sim } from './sim.js';
import { MARKETS, NAMES_FIRST, NAMES_LAST, BILLING_CYCLE_DAYS, ROUTINE_VISIT_CHANCE } from './data.js';
import { ensureCustomerAccounts } from './customeraccounts.js';

const lcg = (seed) => { let r = (seed >>> 0) || 1; return () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; }; };
const round50 = (v) => Math.round(v / 50) * 50;

function start(market, seed, dims = {}) {
  const s = newState({ mode: 'scenario', seed, market, ...dims });
  s.tut = { on: false, beat: 99, flags: {}, done: true }; s.lesson = null; s.speed = 0;
  const sim = new Sim(s);
  s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
  sim.spawnStaffAgent(s.staff[0]);
  return sim;
}
function prebuild(sim, list) {
  const s = sim.s, cre = s.creative; s.creative = true;
  for (const a of list) { const r = sim.dispatch({ type: 'build', f: 0, ...a }); if (!r.ok) throw new Error(`scenario prebuild ${a.tool} ${JSON.stringify(a.a)}: ${r.msg}`); }
  s.creative = cre; sim.markDirty(); sim.rebuild();
  sim.act_commission({ all: true, automatic: true });
  s.ledger = []; s.lastCommit = null; s.orders = [];
}
// Long-time tenants at authored rents (a fraction of market rent). `since` makes them eligible for rent reviews.
function seedTenants(sim, units, rnd, rentFrac, opts = {}) {
  const s = sim.s, M = MARKETS[s.market.id];
  for (const u of units) {
    const ageDays = Math.floor((opts.ageLo ?? 200) + rnd() * ((opts.ageHi ?? 900) - (opts.ageLo ?? 200)));
    const tn = { id: s.nextId++, name: `${NAMES_FIRST[Math.floor(rnd() * NAMES_FIRST.length)]} ${NAMES_LAST[Math.floor(rnd() * NAMES_LAST.length)]}`, sat: (opts.satLo ?? 0.68) + rnd() * 0.1, lease: null, since: -ageDays * 1440 };
    const mk = sim.marketRent(u);
    const L = { id: s.nextId++, unit: u.id, tenant: tn.id, rent: Math.round(mk * rentFrac(u, rnd)), start: 1 - ageDays, nextBill: 1 + Math.floor(rnd() * BILLING_CYCLE_DAYS), status: 'current', balance: 0, fees: 0 };
    tn.lease = L.id; s.tenants[tn.id] = tn; s.leases[L.id] = L; u.lease = L.id; u.commercial = 'occupied';
  }
}
function finish(sim, id, def, rnd, extra) {
  const s = sim.s;
  ensureCustomerAccounts(s);
  s.scenario = { id, name: def.name, v: 1, goals: def.goals.map((g) => ({ ...g })), deadline: def.deadline, fail: { ...def.fail }, status: 'active', badDays: 0,
    hold: def.hold, held: 0, seed: s.seed, rules: { ...def.rules }, ...extra };
  s.today = { day: 1, rent: 0, other: 0, opex: 0, payroll: 0, capex: 0, leases: 0, moveouts: 0, prospects: 0, lost: 0 }; s.days = []; s.milestones = {};
  s.ledger = []; s.lastCommit = null;
  sim.markDirty(); sim.rebuild(); sim.generateTasks();
  for (const tn of Object.values(s.tenants)) if (rnd() < ROUTINE_VISIT_CHANCE) sim.schedule({ kind: 'access', tenant: tn.id, unit: s.leases[tn.lease].unit }, sim.randomTime(1, 7.5, 19));
  sim.events.length = 0;
  return sim;
}
const pickVariant = (list, seed) => list[(seed >>> 0) % list.length];

// ------------------------------------------------------------------ Harborview Rate Reset
export const RATE_RESET_VARIANTS = [
  { id: 'soft', label: 'Soft market: fewer shoppers than usual', demand: 0.3, gate: 0.32 },
  { id: 'standard', label: 'Standard: legacy rents 62-80% of market, street rates at 78%', demand: 0.36, gate: 0.3 },
  { id: 'cheap', label: 'Deep discounts: legacy rents 58-70% of market, street rates at 72%', demand: 0.36, gate: 0.3, legacy: [0.58, 0.70], ask: 0.72 },
];
export function makeRateReset(def, seed = 4401) {
  const sim = start('blank', seed), s = sim.s, rnd = lcg(seed ^ 0x5a17), y1 = s.parcel.y1;
  const V = pickVariant(RATE_RESET_VARIANTS, seed);
  prebuild(sim, [
    { tool: 'gate', a: { x: 20, y: y1 }, b: { x: 20, y: y1 } },
    { tool: 'aisle', a: { x: 19, y: 5 }, b: { x: 21, y: y1 } },
    { tool: 'aisle', a: { x: 4, y: 8 }, b: { x: 37, y: 9 } },
    { tool: 'parking', a: { x: 19, y: 23 }, b: { x: 19, y: 26 } },
    { tool: 'office', a: { x: 16, y: 24 }, b: { x: 16, y: 24 } },
    { tool: 'du10x10', a: { x: 4, y: 7 }, b: { x: 17, y: 7 } },
    { tool: 'du5x10', a: { x: 23, y: 7 }, b: { x: 37, y: 7 } },
    { tool: 'du10x10', a: { x: 4, y: 10 }, b: { x: 17, y: 10 } },
    { tool: 'du5x10', a: { x: 23, y: 10 }, b: { x: 37, y: 10 } },
    ...[[6, 12], [12, 12], [26, 12], [33, 12], [20, 14]].map(([x, y]) => ({ tool: 'light', a: { x, y }, b: { x, y } })),
  ]);
  s.open = true; s.cash = def.cash; s.opts = { demand: V.demand };
  const units = sim.objs('unit').sort((a, b) => a.id - b.id);
  const vacant = new Set(); while (vacant.size < 3) vacant.add(units[Math.floor(rnd() * units.length)].id);
  const [lo, hi] = V.legacy || [0.62, 0.80];
  seedTenants(sim, units.filter((u) => !vacant.has(u.id)), rnd, () => lo + rnd() * (hi - lo));
  for (const o of sim.objs('gate')) o.cond = V.gate;
  for (const o of sim.objs('light')) o.cond = 0.24 + rnd() * 0.2;
  Object.assign(s.exp, { access: 0.66, security: 0.56, cleanliness: 0.62, service: 0.7, value: 0.92 });
  // The last owner's posted street rates are stale too: new tenants sign at the same discount unless you change them.
  for (const k of Object.keys(s.market.ask)) s.market.ask[k] = Math.round(s.market.ask[k] * (V.ask || 0.78));
  const roll0 = sim.rentRoll();
  const goals = def.goals.map((g) => g.k === 'roll' ? { ...g, v: round50(roll0 * (1 + def.rollUp)), label: `Monthly lease rent at least ${'$' + round50(roll0 * (1 + def.rollUp)).toLocaleString()} (start: ${'$' + Math.round(roll0).toLocaleString()})` } : g);
  return finish(sim, 'ratereset', { ...def, goals }, rnd, { variant: V.id, variantLabel: V.label, roll0 });
}

// ------------------------------------------------------------------ Ironworks Lofts
export const FREIGHT_VARIANTS = [
  { id: 'tired', label: 'Tired cab: the elevator starts at 35% condition', cond: 0.35 },
  { id: 'busy', label: 'Busy upstairs: more upper-floor tenants than usual', cond: 0.45, upperLeased: 0.95 },
  { id: 'standard', label: 'Standard: the elevator starts at 45% condition', cond: 0.45 },
];
const IW_COLS = [10, 12, 16, 18, 22, 24, 28];
export function makeFreightLift(def, seed = 4401) {
  const sim = start('urban', seed, { W: 36, H: 28 }), s = sim.s, rnd = lcg(seed ^ 0x1f0a), y1 = s.parcel.y1;
  const V = pickVariant(FREIGHT_VARIANTS, seed);
  const halls = [11, 17, 23, 29].flatMap((x) => [0, 1].map((f) => ({ tool: 'hall', a: { x, y: 4 }, b: { x, y: 10 }, f })));
  const lights = [0, 1].flatMap((f) => [[11, 6], [17, 6], [23, 6], [29, 6], [13, 11], [20, 11], [26, 11], [11, 9], [17, 9], [23, 9], [29, 9]].map(([x, y]) => ({ tool: 'light', a: { x, y }, b: { x, y }, f })));
  prebuild(sim, [
    { tool: 'gate', a: { x: 18, y: y1 }, b: { x: 18, y: y1 } },
    { tool: 'aisle', a: { x: 17, y: 14 }, b: { x: 19, y: y1 } },
    { tool: 'parking', a: { x: 17, y: 17 }, b: { x: 17, y: 22 } },
    { tool: 'office', a: { x: 14, y: 19 }, b: { x: 14, y: 19 } },
    { tool: 'aisle', a: { x: 8, y: 13 }, b: { x: 30, y: 14 } },
    { tool: 'walk', a: { x: 8, y: 12 }, b: { x: 30, y: 12 } },
    { tool: 'shell2', a: { x: 8, y: 3 }, b: { x: 30, y: 11 } },
    ...halls,
    { tool: 'hall', a: { x: 9, y: 11 }, b: { x: 29, y: 11 }, f: 0 },
    { tool: 'hall', a: { x: 9, y: 11 }, b: { x: 29, y: 11 }, f: 1 },
    { tool: 'elevator', a: { x: 14, y: 10 }, b: { x: 14, y: 10 } },
    { tool: 'stairs', a: { x: 20, y: 10 }, b: { x: 20, y: 10 } },
    { tool: 'doorWide', a: { x: 17, y: 11 }, b: { x: 17, y: 11 } },
    ...lights,
    ...IW_COLS.map((x) => ({ tool: 'iu5x5', a: { x, y: 4 }, b: { x, y: 10 }, f: 0 })),
    ...IW_COLS.slice(0, 4).map((x) => ({ tool: 'iu5x10', a: { x, y: 4 }, b: { x, y: 10 }, f: 1 })),
    { tool: 'corral', a: { x: 16, y: 12 }, b: { x: 16, y: 12 } },
    { tool: 'power', a: { x: 32, y: 6 }, b: { x: 32, y: 6 } },
  ]);
  s.open = true; s.cash = def.cash;
  const units = sim.objs('unit').sort((a, b) => a.id - b.id);
  const ground = units.filter((u) => !(u.f || 0)), upper = units.filter((u) => (u.f || 0) > 0);
  const lease = (list, share) => list.filter(() => rnd() < share);
  seedTenants(sim, [...lease(ground, 0.9), ...lease(upper, V.upperLeased || 0.8)], rnd, () => 0.95 + rnd() * 0.08, { ageLo: 40, ageHi: 400 });
  for (const el of sim.objs('elevator')) el.cond = V.cond;
  const up0 = Object.values(s.leases).reduce((a, L) => a + ((s.objects[L.unit].f || 0) > 0 ? L.rent : 0), 0);
  const goals = def.goals.map((g) => g.k === 'upperRoll' ? { ...g, v: round50(up0 + def.upperAdd), label: `Upper-floor lease rent at least ${'$' + round50(up0 + def.upperAdd).toLocaleString()}/mo (start: ${'$' + Math.round(up0).toLocaleString()})` } : g);
  return finish(sim, 'freightlift', { ...def, goals }, rnd, { variant: V.id, variantLabel: V.label, upper0: up0, downDays: 0 });
}

// ------------------------------------------------------------------ Campus Crunch
export const CAMPUS_VARIANTS = [
  { id: 'early', label: 'Early term: 28 move-outs, the fall rush starts on Day 16', rush: 16, wave: 28 },
  { id: 'bigwave', label: 'Big graduating class: 32 move-outs, rush from Day 18', rush: 18, wave: 32 },
  { id: 'standard', label: 'Standard term: 28 move-outs, rush from Day 18', rush: 18, wave: 28 },
];
export const RUSH_DAYS = 14;
export function makeCampus(def, seed = 4401) {
  const sim = start('blank', seed), s = sim.s, rnd = lcg(seed ^ 0xc4a9), y1 = s.parcel.y1;
  const V = pickVariant(CAMPUS_VARIANTS, seed);
  prebuild(sim, [
    { tool: 'gate', a: { x: 20, y: y1 }, b: { x: 20, y: y1 } },
    { tool: 'aisle', a: { x: 19, y: 5 }, b: { x: 21, y: y1 } },
    { tool: 'aisle', a: { x: 4, y: 8 }, b: { x: 37, y: 9 } },
    { tool: 'parking', a: { x: 19, y: 23 }, b: { x: 19, y: 27 } },
    { tool: 'office', a: { x: 16, y: 24 }, b: { x: 16, y: 24 } },
    { tool: 'du5x10', a: { x: 4, y: 7 }, b: { x: 17, y: 7 } },
    { tool: 'du5x10', a: { x: 23, y: 7 }, b: { x: 37, y: 7 } },
    { tool: 'du5x5', a: { x: 4, y: 10 }, b: { x: 17, y: 10 } },
    ...[[6, 12], [12, 12], [26, 12], [33, 12], [20, 14]].map(([x, y]) => ({ tool: 'light', a: { x, y }, b: { x, y } })),
  ]);
  s.open = true; s.cash = def.cash;
  const units = sim.objs('unit').sort((a, b) => a.id - b.id);
  seedTenants(sim, units.filter((u, k) => k % 23 !== 7), rnd, () => 0.97 + rnd() * 0.06, { ageLo: 120, ageHi: 260 });
  // The graduating class: authored move-outs on Days 2-12, each leaving a heavy clean-out.
  const tenants = Object.values(s.tenants).sort((a, b) => a.id - b.id), wave = [];
  while (wave.length < V.wave) { const tn = tenants.splice(Math.floor(rnd() * tenants.length), 1)[0]; if (tn) wave.push(tn); else break; }
  wave.forEach((tn, k) => { tn.leaving = true; const L = s.leases[tn.lease]; sim.schedule({ kind: 'moveout', tenant: tn.id, unit: L.unit }, sim.randomTime(2 + Math.floor(k * 10 / wave.length), 9, 17)); });
  const rules = { ...def.rules, demandCurve: [{ from: 1, to: V.rush - 1, m: 0.3 }, { from: V.rush, to: V.rush + RUSH_DAYS - 1, m: 3 }, { from: V.rush + RUSH_DAYS, to: 9999, m: 0.25 }] };
  return finish(sim, 'campus', { ...def, rules }, rnd, { variant: V.id, variantLabel: V.label, rush: V.rush, wave: V.wave });
}
