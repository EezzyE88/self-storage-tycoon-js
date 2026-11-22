// Three SK-01 scenarios built on the scenario kit (scenariokit.js):
//   grandopening  Grand Opening: lease up a brand-new facility before the construction lender loses patience
//   stormseason   Storm Season: keep an older highway facility running through a season of storms
//   chainnextdoor The Chain Next Door: a national chain opens across the road and answers every price move
// Each start is seeded: event days, storm strength, which units are let and rival behaviour vary per run.
import { newState, Sim } from './sim.js';
import { MARKETS, NAMES_FIRST, NAMES_LAST, BILLING_CYCLE_DAYS, ROUTINE_VISIT_CHANCE, WORK, G } from './data.js';
import { ensureCustomerAccounts } from './customeraccounts.js';
import { registerKit, kitState, kitRand, seedRand, runSeed, addMod, applyMods, kitLog, kitMetric, projectDone, modsFor } from './scenariokit.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pctTxt = (v) => Math.round(v * 100) + '%';

// ---------------------------------------------------------------- shared setup helpers
function baseSim(market, seed) {
  const s = newState({ mode: 'scenario', seed, market });
  s.tut = { on: false, beat: 99, flags: {}, done: true }; s.lesson = null; s.open = false; s.speed = 0;
  const sim = new Sim(s);
  s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
  sim.spawnStaffAgent?.(s.staff[0]);
  s.mkt.nextComp = 99999; // kit scenarios bring their own rivals (or none)
  return sim;
}
function prebuild(sim, list) {
  const s = sim.s, cre = s.creative; s.creative = true;
  for (const a of list) { const r = sim.dispatch({ type: 'build', f: 0, ...a }); if (!r.ok) console.warn('kit prebuild', a.tool, JSON.stringify(a.a), r.msg); }
  sim.dispatch({ type: 'commission', all: true });
  s.creative = cre; s.ledger = []; s.lastCommit = null; s.orders = [];
  sim.rebuild();
  for (const u of sim.objs('unit')) if (u.cstate === 'operating' && !u.lease) u.commercial = 'ready';
}
function tenantName(rnd) { return `${NAMES_FIRST[Math.floor(rnd() * NAMES_FIRST.length)]} ${NAMES_LAST[Math.floor(rnd() * NAMES_LAST.length)]}`; }
function addTenant(sim, u, rent, rnd, o = {}) {
  const s = sim.s, day = sim.day;
  const age = o.newLease ? 0 : Math.floor(o.minAge ?? 40 + rnd() * (o.spread ?? 600));
  const tn = { id: sim.id(), name: tenantName(rnd), sat: o.sat ?? 0.74 + rnd() * 0.1, lease: null, since: s.t - age * 1440 };
  const L = { id: sim.id(), unit: u.id, tenant: tn.id, rent: Math.round(rent), start: day - age, nextBill: o.newLease ? day + BILLING_CYCLE_DAYS : day + 1 + Math.floor(rnd() * BILLING_CYCLE_DAYS), status: 'current', balance: 0, fees: 0 };
  if (o.tag) L.kitTag = o.tag;
  tn.lease = L.id; s.tenants[tn.id] = tn; s.leases[L.id] = L; u.lease = L.id; u.commercial = 'occupied';
  return L;
}
function finishSetup(sim, scenario, cash) {
  const s = sim.s;
  s.cash = cash; s.scenario = scenario;
  ensureCustomerAccounts(s);
  s.today = { day: 1, rent: 0, anc: 0, other: 0, opex: 0, payroll: 0, service: 0, marketing: 0, capex: 0, debt: 0, interest: 0, fin: 0, leases: 0, moveouts: 0, prospects: 0, lost: 0 };
  s.days = []; s.milestones = {}; s.ledger = []; s.lastCommit = null;
  applyMods(sim);
  sim.markDirty(); sim.rebuild();
  const rnd = seedRand(scenario.kit.seed ^ 77);
  for (const tn of Object.values(s.tenants)) if (rnd() < ROUTINE_VISIT_CHANCE) sim.schedule({ kind: 'access', tenant: tn.id, unit: s.leases[tn.lease].unit }, sim.randomTime(1, 7.2, 20));
  sim.events.length = 0;
  return sim;
}
function scenarioShell(id, def, seed, kit) {
  return { id, name: def.name, kit, goals: def.goals.map((g) => ({ ...g })), deadline: def.deadline, fail: { ...def.fail }, hold: def.hold, winFrom: def.winFrom,
    kitFail: (def.kitFail || []).map((f) => ({ ...f })), status: 'active', badDays: 0, v: 1 };
}
const vacantReady = (sim) => sim.objs('unit').filter((u) => u.cstate === 'operating' && !u.lease && u.commercial === 'ready');
function askRatio(sim) { // average new-tenant asking rent against market, weighted by units on the property
  const us = sim.objs('unit').filter((u) => u.cstate === 'operating'); if (!us.length) return 1;
  return us.reduce((a, u) => a + sim.askFor(u) / sim.marketRent(u), 0) / us.length;
}
function scheduleMoveOut(sim, tn) {
  const L = sim.s.leases[tn.lease]; if (!L || tn.leaving) return false;
  tn.leaving = true; sim.schedule({ kind: 'moveout', tenant: tn.id, unit: L.unit }, sim.randomAccessTime(sim.day + 2 + Math.floor(kitRand(sim.s.scenario.kit) * 5)));
  return true;
}
function addRival(sim, r) {
  const s = sim.s; const c = { id: sim.id(), name: r.name, announced: sim.day, opens: r.opens, strength: r.strength, price: r.price, dist: r.dist, kit: true };
  s.mkt.comp.push(c); s.drama ||= { lastBreak: -99, wars: {} }; s.drama.wars ||= {}; s.drama.wars[c.id] = 'none'; // the kit runs this rival's pricing, not the generic one-off price war
  sim.emit('comp_announce', { name: c.name, opens: c.opens, dist: c.dist, price: c.price });
  return c;
}

// =====================================================================================================
// 1. GRAND OPENING
// =====================================================================================================
const GO_LAYOUT = [
  { tool: 'gate', a: { x: 20, y: 29 }, b: { x: 20, y: 29 } },
  { tool: 'aisle', a: { x: 19, y: 18 }, b: { x: 21, y: 29 } },
  { tool: 'office', a: { x: 16, y: 24 }, b: { x: 16, y: 24 } },
  { tool: 'aisle', a: { x: 5, y: 15 }, b: { x: 36, y: 17 } },
  { tool: 'du10x20', a: { x: 5, y: 14 }, b: { x: 12, y: 14 } },
  { tool: 'du10x10', a: { x: 13, y: 14 }, b: { x: 28, y: 14 } },
  { tool: 'du5x10', a: { x: 29, y: 14 }, b: { x: 36, y: 14 } },
  { tool: 'du5x10', a: { x: 5, y: 18 }, b: { x: 10, y: 18 } },
  { tool: 'du10x10', a: { x: 11, y: 18 }, b: { x: 18, y: 18 } },
  { tool: 'du10x10', a: { x: 22, y: 18 }, b: { x: 29, y: 18 } },
  { tool: 'du5x5', a: { x: 30, y: 18 }, b: { x: 36, y: 18 } },
  { tool: 'light', a: { x: 8, y: 16 }, b: { x: 8, y: 16 } },
  { tool: 'light', a: { x: 16, y: 16 }, b: { x: 16, y: 16 } },
  { tool: 'light', a: { x: 25, y: 16 }, b: { x: 25, y: 16 } },
  { tool: 'light', a: { x: 33, y: 16 }, b: { x: 33, y: 16 } },
  { tool: 'light', a: { x: 20, y: 22 }, b: { x: 20, y: 22 } },
  { tool: 'camera', a: { x: 20, y: 16 }, b: { x: 20, y: 16 } },
  { tool: 'camera', a: { x: 6, y: 16 }, b: { x: 6, y: 16 } },
  { tool: 'camera', a: { x: 35, y: 16 }, b: { x: 35, y: 16 } },
];
const GO = {
  name: 'Grand Opening',
  blurb: 'You just finished building a 41-unit facility on borrowed money, and not one unit is rented. The construction lender checks your occupancy on set days and wants the rent to cover its payments by the end. Price low and you fill fast but lock in thin rents for good. Price high and the lender may run out of patience first.',
  goals: [
    { k: 'occ', v: 0.85, label: 'Occupancy at least 85%', fmt: 'pct' },
    { k: 'dscr', v: 1.25, label: 'Operating profit covers loan payments 1.25 times (30 days)', fmt: 'x' },
    { k: 'rep', v: 0.7, label: 'Reputation at least 70%', fmt: 'pct' },
  ],
  hold: 14, winFrom: 100, deadline: 210,
  fail: { cashBelow: -6000, cashDays: 14 },
  failText: 'Missing a lender check and not fixing it in 21 days, or cash after bills and debt below -$6,000 for 14 days, ends the run.',
  loan: 184000, demand: 0.1,
};
function goMake(seed) {
  const sim = baseSim('blank', seed), s = sim.s, rnd = seedRand(seed);
  prebuild(sim, GO_LAYOUT);
  s.open = true;
  const { rate, months } = sim.loanTerms(); const pmt = sim.loanPmt(GO.loan, rate, months);
  s.debt.push({ id: sim.id(), orig: GO.loan, bal: GO.loan, rate, months, pmt, next: 31, start: 1, paid: 0, kitConstruction: true });
  const j = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const events = [
    { id: 'finance', day: 1 },
    { id: 'opening', day: j(8, 14) },
    { id: 'movers', day: j(38, 50) },
    { id: 'rival', day: j(66, 80) },
    { id: 'bulk', day: j(118, 135) },
  ];
  const checks = [
    { id: 'm1', day: 60, k: 'occ', v: 0.35, label: 'Lender check: occupancy at least 35%', cure: 21, warn: 14, failWhy: 'The lender called the construction loan: occupancy stayed under 35% after the cure period' },
    { id: 'm2', day: 120, k: 'occ', v: 0.65, label: 'Lender check: occupancy at least 65%', cure: 21, warn: 14, failWhy: 'The lender called the construction loan: occupancy stayed under the Day 120 target after the cure period' },
  ];
  const kit = kitState({ seed, events, checks, base: { demand: GO.demand }, start: { cash: 12000, pmt } });
  return finishSetup(sim, scenarioShell('grandopening', GO, seed, kit), 12000);
}
function goDecision(sim, e) {
  const s = sim.s, k = s.scenario.kit, d = s.debt.find((x) => x.kitConstruction);
  switch (e.id) {
    case 'finance': return { title: 'How do you want to repay the construction loan?', who: 'Harbor Commercial Bank', days: 3,
      text: `You owe ${money(GO.loan)}. Standard payments are ${money(d.pmt)} a month from Day 31. We can make the first 90 days interest-only (${money(GO.loan * d.rate / 12)} a month), but then we would want 75% occupancy at the Day 120 check instead of 65%.`,
      opts: [{ label: 'Standard payments', sub: `${money(d.pmt)}/month from Day 31. Day 120 check stays at 65%.` }, { label: 'Interest-only for 90 days', sub: `${money(GO.loan * d.rate / 12)}/month until Day 90, then about ${money(d.pmt * 1.06)}. Day 120 check rises to 75%.` }], def: 0 };
    case 'opening': return { title: 'Plan your opening push', who: 'Marketing', days: 4,
      text: 'People notice a new storage place once. A real opening event brings a crowd for three weeks; flyers are cheaper and slower. Paid ads (Business tab) still work on top of either.',
      opts: [{ label: 'Opening event', sub: '$1,500 · about +60% shoppers for 21 days', cost: 1500 }, { label: 'Neighborhood flyers', sub: '$400 · about +20% shoppers for 30 days', cost: 400 }, { label: 'Skip it', sub: 'Keep the cash' }], def: 2 };
    case 'movers': return { title: 'A moving company wants to send you customers', who: 'Two Brothers Moving', days: 5,
      text: 'They will recommend you to every family they move for the next 60 days. In return, the customers they send get 10% off their rent for as long as they stay. About one new tenant in three would come through them.',
      opts: [{ label: 'Take the referral deal', sub: 'About +40% shoppers for 60 days · their tenants pay 10% less, for good' }, { label: 'Decline', sub: 'Keep full rents' }], def: 1 };
    case 'rival': return { title: 'Keystone Storage is building a mile away', who: 'Market watch', days: 5,
      text: `It opens around Day ${sim.day + 30} and will price about 10% under market. Shoppers who compare will see it. Tenants who pay well above its price are more likely to leave.`,
      opts: [{ label: 'Price lock for current tenants', sub: 'Current rents drop 4% and tenants are happier (fewer move-outs)' }, { label: 'Ad blitz before it opens', sub: '$1,200 · about +35% shoppers for 30 days, starting now', cost: 1200 }, { label: 'Hold steady', sub: 'No change' }], def: 2 };
    case 'bulk': { const n = Math.min(6, vacantReady(sim).filter((u) => u.size === '10x10' || u.size === '10x20').length);
      if (n < 2) return null;
      return { title: 'A contractor wants several units at once', who: 'Ridgeline Builders', days: 4,
        text: `They want ${n} of your empty 10x10 and 10x20 units for their crews, at 15% off. They move in this week and pay on time.`,
        opts: [{ label: `Rent all ${n} at 15% off`, sub: 'Fills them now at lower rent' }, { label: 'Counter at 5% off', sub: 'They may take fewer units, or walk away' }, { label: 'Decline', sub: 'Keep the units for full-price shoppers' }], def: 2 }; }
  }
  return null;
}
function goChoose(sim, id, i) {
  const s = sim.s, k = s.scenario.kit, d = s.debt.find((x) => x.kitConstruction);
  if (id === 'finance') {
    if (i === 1 && d) { k.flags.io = true; d.ioPmt = d.pmt; d.pmt = Math.round(d.bal * d.rate / 12 * 100) / 100; d.ioUntil = 90; const c = k.checks.find((x) => x.id === 'm2'); c.v = 0.75; c.label = 'Lender check: occupancy at least 75%'; return 'Interest-only until Day 90'; }
    return 'Standard payments';
  }
  if (id === 'opening') {
    if (i === 0) { sim.money(-1500, 'marketing', 'Grand opening event'); addMod(sim, { k: 'demand', mult: 1.6, until: sim.day + 20, label: 'Opening event' }); return 'Opening event booked: shoppers up for 21 days'; }
    if (i === 1) { sim.money(-400, 'marketing', 'Neighborhood flyers'); addMod(sim, { k: 'demand', mult: 1.2, until: sim.day + 29, label: 'Flyers' }); return 'Flyers out: shoppers up for 30 days'; }
    return 'No opening push';
  }
  if (id === 'movers') { if (i === 0) { k.flags.movers = sim.day + 59; k.flags.moverSeen = Object.keys(s.leases).map(Number); addMod(sim, { k: 'demand', mult: 1.4, until: sim.day + 59, label: 'Movers referrals' }); return 'Referral deal running for 60 days'; } return 'Declined'; }
  if (id === 'rival') {
    addRival(sim, { name: 'Keystone Storage', opens: sim.day + 30, strength: 0.2, price: 0.9, dist: 1.1 });
    if (i === 0) { for (const L of Object.values(s.leases)) { L.rent = Math.round(L.rent * 0.96); const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat + 0.1, 0, 1); } return 'Current rents cut 4%; tenants feel valued'; }
    if (i === 1) { sim.money(-1200, 'marketing', 'Pre-opening ad blitz'); addMod(sim, { k: 'demand', mult: 1.35, until: sim.day + 29, label: 'Ad blitz' }); return 'Ad blitz running'; }
    return 'Holding steady';
  }
  if (id === 'bulk') {
    const pool = vacantReady(sim).filter((u) => u.size === '10x10' || u.size === '10x20').slice(0, 6);
    let n = 0, off = 0;
    if (i === 0) { n = pool.length; off = 0.15; } else if (i === 1) { if (kitRand(k) < 0.55) { n = Math.min(4, pool.length); off = 0.05; } else return 'Ridgeline walked away'; }
    const rnd = () => kitRand(k);
    for (const u of pool.slice(0, n)) addTenant(sim, u, sim.askFor(u) * (1 - off), rnd, { newLease: true, sat: 0.8, tag: 'bulk' });
    if (n) { ensureCustomerAccounts(s); sim.markDirty(); }
    return n ? `${n} units rented to Ridgeline at ${Math.round(off * 100)}% off` : 'Declined';
  }
}
function goOnDay(sim, day) {
  const s = sim.s, k = s.scenario.kit, d = s.debt.find((x) => x.kitConstruction);
  if (d && d.ioUntil && day > d.ioUntil) { d.pmt = sim.loanPmt(d.bal, d.rate, d.months - 3); delete d.ioUntil; kitLog(sim, `Interest-only period over: loan payment now ${money(d.pmt)}/month`, 'warn'); }
  if (k.flags.movers) { // about one in three leases signed during the referral window came through the movers
    const seen = new Set(k.flags.moverSeen || []);
    for (const L of Object.values(s.leases)) if (!seen.has(L.id)) { seen.add(L.id); if (day <= k.flags.movers + 1 && !L.kitTag && kitRand(k) < 0.33) { L.rent = Math.round(L.rent * 0.9); L.kitTag = 'movers'; } }
    k.flags.moverSeen = [...seen].slice(-200);
    if (day > k.flags.movers + 1) delete k.flags.movers;
  }
}
function goScore(sim) {
  const s = sim.s, dscr = kitMetric(sim, 'dscr'), day = sim.day, notes = [];
  let stars = 1;
  const strong = dscr >= 1.4, fast = day <= 160;
  if (strong) notes.push(`Rent covers the loan ${dscr.toFixed(2)} times.`); else notes.push(`Rent covers the loan ${dscr.toFixed(2)} times; 1.4 earns a star.`);
  if (fast) notes.push(`Leased up by Day ${day}.`); else notes.push(`Finished on Day ${day}; by Day 160 earns a star.`);
  stars += (strong ? 1 : 0) + (fast ? 1 : 0);
  return { stars, notes };
}

// =====================================================================================================
// 2. STORM SEASON
// =====================================================================================================
const SS_LAYOUT = [
  { tool: 'gate', a: { x: 20, y: 29 }, b: { x: 20, y: 29 } },
  { tool: 'aisle', a: { x: 19, y: 10 }, b: { x: 21, y: 29 } },
  { tool: 'office', a: { x: 16, y: 24 }, b: { x: 16, y: 24 } },
  { tool: 'aisle', a: { x: 6, y: 13 }, b: { x: 34, y: 15 } },
  { tool: 'du10x20', a: { x: 6, y: 12 }, b: { x: 13, y: 12 } },
  { tool: 'du10x10', a: { x: 14, y: 12 }, b: { x: 17, y: 12 } },
  { tool: 'du10x10', a: { x: 22, y: 12 }, b: { x: 29, y: 12 } },
  { tool: 'du10x20', a: { x: 30, y: 12 }, b: { x: 33, y: 12 } },
  { tool: 'du5x10', a: { x: 6, y: 16 }, b: { x: 12, y: 16 } },
  { tool: 'du10x10', a: { x: 13, y: 16 }, b: { x: 18, y: 16 } },
  { tool: 'du10x10', a: { x: 22, y: 16 }, b: { x: 27, y: 16 } },
  { tool: 'du5x10', a: { x: 28, y: 16 }, b: { x: 34, y: 16 } },
  { tool: 'aisle', a: { x: 22, y: 21 }, b: { x: 34, y: 23 } },
  { tool: 'du10x20', a: { x: 22, y: 24 }, b: { x: 29, y: 24 } },
  { tool: 'light', a: { x: 9, y: 14 }, b: { x: 9, y: 14 } },
  { tool: 'light', a: { x: 15, y: 14 }, b: { x: 15, y: 14 } },
  { tool: 'light', a: { x: 25, y: 14 }, b: { x: 25, y: 14 } },
  { tool: 'light', a: { x: 31, y: 14 }, b: { x: 31, y: 14 } },
  { tool: 'light', a: { x: 20, y: 19 }, b: { x: 20, y: 19 } },
  { tool: 'light', a: { x: 28, y: 22 }, b: { x: 28, y: 22 } },
  { tool: 'light', a: { x: 20, y: 26 }, b: { x: 20, y: 26 } },
  { tool: 'camera', a: { x: 20, y: 13 }, b: { x: 20, y: 13 } },
  { tool: 'camera', a: { x: 7, y: 14 }, b: { x: 7, y: 14 } },
  { tool: 'camera', a: { x: 33, y: 22 }, b: { x: 33, y: 22 } },
];
const SS = {
  name: 'Storm Season',
  blurb: 'Your highway storage yard is nearly full, but it carries a mortgage and storm season is here. Every storm tears up roofs and doors, floods low units and knocks out lights and the gate. Insurance, storm-proofing, prep crews and fast repairs all cost money; slow repairs cost tenants. Come out of the season with the yard fixed, tenants happy and cash in the bank.',
  goals: [
    { k: 'sat', v: 0.72, label: 'Tenant satisfaction at least 72%', fmt: 'pct' },
    { k: 'occ', v: 0.88, label: 'Occupancy at least 88%', fmt: 'pct' },
    { k: 'stormOpen', v: 1, cmp: '<', label: 'All storm-damaged units repaired', fmt: 'n' },
    { k: 'equipOk', v: 0.95, label: 'Lights, cameras and gate working', fmt: 'pct' },
    { k: 'netLiquid', v: 6000, label: 'Cash after bills and debt at least $6,000', fmt: 'money' },
  ],
  hold: 10, winFrom: 100, deadline: 135,
  fail: { cashBelow: -5000, cashDays: 14 },
  kitFail: [{ k: 'sat', v: 0.55, cmp: '<', days: 10, label: 'Tenant satisfaction under 55%', why: 'Tenant satisfaction stayed under 55% for 10 days: word got around and the yard emptied out' }],
  failText: 'Tenant satisfaction under 55% for 10 days, or cash after bills and debt below -$5,000 for 14 days, ends the run.',
  demand: 0.1, mortgage: 120000,
};
const SS_FIX = { emergency: { per: 420, days: 2 }, contractor: { per: 240, days: 9 } };
function ssMake(seed) {
  const sim = baseSim('rural', seed), s = sim.s, rnd = seedRand(seed);
  prebuild(sim, SS_LAYOUT);
  s.open = true;
  const units = sim.objs('unit').slice().sort((a, b) => a.id - b.id);
  const share = 0.88 + rnd() * 0.06;
  for (const u of units) if (rnd() < share) addTenant(sim, u, sim.marketRent(u) * (0.92 + rnd() * 0.08), rnd);
  for (const o of Object.values(s.objects)) if (['light', 'camera', 'gate'].includes(o.type)) o.cond = 0.5 + rnd() * 0.3;
  Object.assign(s.exp, { security: 0.72, cleanliness: 0.8 });
  const { rate } = sim.loanTerms(); const pmt = sim.loanPmt(SS.mortgage, rate, 120);
  s.debt.push({ id: sim.id(), orig: SS.mortgage, bal: SS.mortgage, rate, months: 120, pmt, next: 1 + Math.floor(rnd() * 25), start: -400, paid: 13, kitMortgage: true });
  const j = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const windows = [[12, 20], [34, 46], [58, 72], [82, 94]], major = Math.floor(rnd() * 4);
  const storms = windows.map(([a, b], n) => ({ n, day: j(a, b), sev: n === major ? 1.4 : 0.65 + rnd() * 0.35, hit: false }));
  const events = [{ id: 'insure', day: 1 }, ...storms.map((st) => ({ id: 'prep' + st.n, day: st.day - 3, storm: st.n }))];
  const projects = [
    { id: 'fixtures', name: 'Roof and door reinforcement', cost: 3200, days: 12, until: 80, desc: 'Hurricane straps, braced roll-up doors and sealed light and camera housings. Storm damage to units and equipment falls by about 60%.' },
    { id: 'drainage', name: 'Drainage regrade', cost: 2400, days: 12, until: 80, desc: 'New grades and drains. Units stop flooding (no belongings claims) and storm debris falls by about 70%.' },
  ];
  const kit = kitState({ seed, events, projects, base: { demand: SS.demand }, start: { cash: 8000 }, extra: { storms, payouts: [], insurance: null, damage: [], patchQ: [] } });
  return finishSetup(sim, scenarioShell('stormseason', SS, seed, kit), 8000);
}
const INS = { std: { name: 'Standard cover', prem: 160, ded: 750, share: 0.7, claims: false, lag: 10 }, full: { name: 'Full cover', prem: 320, ded: 250, share: 1, claims: true, lag: 7 } };
const openDamage = (k) => k.damage.filter((d) => d.state !== 'fixed');
function ssDecision(sim, e) {
  const k = sim.s.scenario.kit;
  if (e.id === 'insure') return { title: 'Insure the yard for storm season?', who: 'Prairie Mutual', days: 3,
    text: 'Four storms are expected this season, and one is usually severe. Cover pays about a week after each storm toward the repair crews you hire for storm-damaged units.',
    opts: [{ label: 'No insurance', sub: 'Pay every repair and claim yourself' }, { label: 'Standard cover', sub: `${money(INS.std.prem)}/month · pays 70% of crew repairs over ${money(INS.std.ded)} per storm` }, { label: 'Full cover', sub: `${money(INS.full.prem)}/month · pays all crew repairs and tenant claims over ${money(INS.full.ded)}` }], def: 0 };
  if (e.id.startsWith('prep')) { const st = k.storms[e.storm]; const major = st.sev > 1.2;
    return { title: major ? 'Severe storm in 3 days' : 'Storm in 3 days', who: 'Weather service', days: 2,
      text: `${major ? 'A severe line of storms' : 'A storm'} reaches you on Day ${st.day}. Expect roof and door damage, flooded low units, and broken lights, cameras or gate.`,
      opts: [{ label: 'Hire a prep crew', sub: '$1,100 · damage cut by about 70%', cost: 1100 }, { label: 'Sandbags and tie-downs', sub: '$300 · damage cut by about 35%', cost: 300 }, { label: 'Ride it out', sub: 'No cost now' }], def: 2 }; }
  if (e.id.startsWith('repair')) { const n = e.units.filter((id) => k.damage.some((d) => d.unit === id && d.state === 'open')).length; if (!n) return null;
    const cover = k.insurance ? ` ${INS[k.insurance].name} repays ${k.insurance === 'full' ? 'all of it' : '70%'} over ${money(INS[k.insurance].ded)}, about ${INS[k.insurance].lag} days later.` : '';
    return { title: `${n} unit${n > 1 ? 's' : ''} damaged by the storm`, who: 'Yard check', days: 3,
      text: `Torn roofing and jammed doors. Tenants in damaged units get less happy every day until it is fixed, and damaged empty units cannot be rented.${cover}`,
      opts: [{ label: 'Emergency crew', sub: `${money(SS_FIX.emergency.per * n)} · fixed in ${SS_FIX.emergency.days} days`, cost: SS_FIX.emergency.per * n }, { label: 'Regular contractor', sub: `${money(SS_FIX.contractor.per * n)} · fixed in ${SS_FIX.contractor.days} days`, cost: SS_FIX.contractor.per * n }, { label: 'Patch it yourself', sub: 'Free · one unit every 2 days, and patches often fail in the next storm' }], def: 2 }; }
  if (e.id.startsWith('claims')) { const c = e.claims;
    return { title: `${c.n} tenant${c.n > 1 ? 's' : ''} report flooded belongings`, who: 'Office', days: 4,
      text: `Water got into ${c.n} occupied unit${c.n > 1 ? 's' : ''}. The tenants are asking you to cover ${money(c.amt)} of ruined belongings. Your lease does not require it.${k.insurance === 'full' ? ' Full cover repays claims you pay, less the deductible.' : ''}`,
      opts: [{ label: `Pay all claims (${money(c.amt)})`, sub: 'Tenants stay loyal', cost: c.amt }, { label: `Pay half (${money(c.amt / 2)})`, sub: 'Some goodwill', cost: Math.round(c.amt / 2) }, { label: 'Point to the lease', sub: 'No cost; expect angry tenants and bad reviews' }], def: 2 }; }
  return null;
}
function ssFix(sim, units, how) {
  const k = sim.s.scenario.kit, day = sim.day;
  for (const id of units) { const d = k.damage.find((x) => x.unit === id && x.state === 'open'); if (!d) continue;
    if (how === 'patch') { d.state = 'patch'; k.patchQ.push(id); } else { d.state = 'crew'; d.fixDay = day + SS_FIX[how].days; } }
}
function ssChoose(sim, id, i, auto) {
  const s = sim.s, k = s.scenario.kit;
  if (id === 'insure') { k.insurance = i === 1 ? 'std' : i === 2 ? 'full' : null; if (k.insurance) { k.nextPrem = sim.day; ssPremium(sim); } return k.insurance ? INS[k.insurance].name : 'No insurance'; }
  if (id.startsWith('prep')) { const n = +id.slice(4), st = k.storms[n]; const cost = auto ? 0 : i === 0 ? 1100 : i === 1 ? 300 : 0; if (cost) sim.money(-cost, 'service', 'Storm prep'); st.prep = auto ? 1 : i === 0 ? 0.3 : i === 1 ? 0.65 : 1; return ['Prep crew booked', 'Sandbags placed', 'Riding it out'][auto ? 2 : i]; }
  if (id.startsWith('repair')) { const e = k.events.find((x) => x.id === id); const units = e.units.filter((u) => k.damage.some((d) => d.unit === u && d.state === 'open'));
    const how = auto ? 'patch' : ['emergency', 'contractor', 'patch'][i];
    if (how !== 'patch') { const cost = SS_FIX[how].per * units.length; sim.money(-cost, 'service', 'Storm repairs: ' + how); if (k.insurance) { const P = INS[k.insurance]; const pay = Math.max(0, cost - P.ded) * P.share; if (pay > 0) k.payouts.push({ day: sim.day + P.lag, amt: Math.round(pay), why: 'repairs' }); } }
    ssFix(sim, units, how); return how === 'patch' ? 'Patching it yourself' : `Crew booked: done by Day ${sim.day + SS_FIX[how].days}`; }
  if (id.startsWith('claims')) { const e = k.events.find((x) => x.id === id), c = e.claims; const paid = auto ? 0 : i === 0 ? c.amt : i === 1 ? Math.round(c.amt / 2) : 0;
    if (paid) sim.money(-paid, 'service', 'Storm damage claims');
    const pick = auto ? 2 : i;
    for (const tid of c.tenants) { const tn = s.tenants[tid]; if (!tn) continue; if (pick === 0) tn.sat = clamp(tn.sat + 0.25, 0, 1); else if (pick === 1) tn.sat = clamp(tn.sat + 0.1, 0, 1); else { tn.sat = clamp(tn.sat - 0.2, 0, 1); if (kitRand(k) < 0.6) sim.postReview(tn, true); if (kitRand(k) < 0.6) scheduleMoveOut(sim, tn); } }
    if (paid && k.insurance === 'full') k.payouts.push({ day: sim.day + INS.full.lag, amt: Math.max(0, paid - INS.full.ded), why: 'claims' });
    return paid ? `Paid ${money(paid)} in claims` : 'Claims declined'; }
}
function ssPremium(sim) { const k = sim.s.scenario.kit; if (!k.insurance) return; const P = INS[k.insurance]; sim.money(-P.prem, 'service', P.name + ' premium'); k.nextPrem = sim.day + 30; k.premPaid = (k.premPaid || 0) + P.prem; }
function ssStorm(sim, st) {
  const s = sim.s, k = s.scenario.kit, day = sim.day;
  const prep = st.prep ?? 1, fx = projectDone(s, 'fixtures') ? 0.4 : 1, dr = projectDone(s, 'drainage');
  const sev = st.sev * prep;
  let broken = 0;
  for (const o of Object.values(s.objects)) {
    if (o.cstate !== 'operating' || !['light', 'camera', 'gate'].includes(o.type)) continue;
    if (kitRand(k) < clamp(0.7 * sev * fx + 0.05, 0, 0.95)) { const was = sim.works(o); sim.wear(o, (0.4 + 0.5 * kitRand(k)) * Math.min(1.3, st.sev)); if (was && !sim.works(o)) broken++; }
  }
  const debris = 0.45 * sev * (dr ? 0.3 : 1);
  for (let i = 0; i < s.ground.length; i++) if ([G.ASPHALT, G.CONCRETE, G.LOADING, G.PARKING].includes(s.ground[i])) s.dirt[0][i] = Math.min(1, s.dirt[0][i] + debris * (0.6 + 0.8 * kitRand(k)));
  // roof and door damage: patched units fail first
  const pool = sim.objs('unit').filter((u) => u.cstate === 'operating' && !k.damage.some((d) => d.unit === u.id && d.state !== 'fixed'));
  const want = Math.round(sev * fx * 5 + kitRand(k) * 2);
  const hit = [];
  for (const u of pool.filter((u) => u.kitPatched)) if (hit.length < want + 2 && kitRand(k) < 0.6) hit.push(u);
  const rest = pool.filter((u) => !hit.includes(u));
  while (hit.length < want && rest.length) hit.push(rest.splice(Math.floor(kitRand(k) * rest.length), 1)[0]);
  for (const u of hit) { u.kitPatched = false; k.damage.push({ unit: u.id, day, state: 'open' }); u.kitDamaged = true;
    if (u.lease && s.leases[u.lease]) { const tn = s.tenants[s.leases[u.lease].tenant]; if (tn) tn.sat = clamp(tn.sat - 0.18, 0, 1); }
    else { u.commercial = 'unready'; s.tasks = s.tasks.filter((t) => !(t.type === 'makeready' && t.obj === u.id)); } }
  const claims = { n: 0, amt: 0, tenants: [] };
  if (!dr) {
    const occ = sim.objs('unit').filter((u) => u.lease && s.leases[u.lease] && s.tenants[s.leases[u.lease].tenant]);
    const n = Math.min(occ.length, Math.round(sev * 2.6 + kitRand(k) * 1.5));
    for (let m = 0; m < n; m++) { const u = occ.splice(Math.floor(kitRand(k) * occ.length), 1)[0]; const tn = s.tenants[s.leases[u.lease].tenant]; tn.sat = clamp(tn.sat - 0.2, 0, 1); claims.n++; claims.tenants.push(tn.id); claims.amt += Math.round((180 + kitRand(k) * 420) / 10) * 10; }
  }
  st.hit = true; st.broken = broken; st.claims = claims.n; st.units = hit.length;
  sim.markDirty(); sim.generateTasks();
  sim.emit('drama', { k: 'storm', title: st.sev > 1.2 ? 'Severe storm' : 'Storm', sub: `${hit.length} units damaged, ${broken} lights, cameras or gate knocked out${claims.n ? `, ${claims.n} units flooded` : ''}.` });
  kitLog(sim, `${st.sev > 1.2 ? 'Severe storm' : 'Storm'}: ${hit.length} units damaged, ${broken} equipment out, ${claims.n} flooded${prep < 1 ? ' (prepared)' : ''}`, 'bad');
  if (hit.length) k.events.push({ id: 'repair' + st.n, day, fired: false, choice: null, units: hit.map((u) => u.id) });
  if (claims.n) k.events.push({ id: 'claims' + st.n, day, fired: false, choice: null, claims });
}
function ssOnDay(sim, day) {
  const s = sim.s, k = s.scenario.kit;
  if (k.insurance && day >= k.nextPrem) ssPremium(sim);
  for (const p of k.payouts) if (!p.paid && day >= p.day) { p.paid = true; sim.money(p.amt, 'anc', 'Insurance payout'); kitLog(sim, `Insurance paid ${money(p.amt)}`, 'good'); }
  // repairs finishing; one owner patch a day
  const done = (d, patched) => { d.state = 'fixed'; d.fixed = day; const u = s.objects[d.unit]; if (!u) return; u.kitDamaged = false; if (patched) u.kitPatched = true; if (!u.lease && u.commercial === 'unready') u.commercial = 'ready'; };
  for (const d of k.damage) if (d.state === 'crew' && day >= d.fixDay) done(d, false);
  if (day % 2 === 0) { const q = k.patchQ.shift(); if (q != null) { const d = k.damage.find((x) => x.unit === q && x.state === 'patch'); if (d) done(d, true); } }
  // living with damage: tenants in damaged units sour every day; damaged vacancies stay off the market
  for (const d of openDamage(k)) { const u = s.objects[d.unit]; if (!u) { d.state = 'fixed'; continue; }
    if (u.lease && s.leases[u.lease]) { const tn = s.tenants[s.leases[u.lease].tenant]; if (tn) { tn.sat = clamp(tn.sat - 0.015, 0, 1); if (day - d.day >= 3 && kitRand(k) < 0.035) scheduleMoveOut(sim, tn); } }
    else if (u.commercial === 'ready') { u.commercial = 'unready'; s.tasks = s.tasks.filter((t) => !(t.type === 'makeready' && t.obj === u.id)); } }
  for (const st of k.storms) if (!st.hit && day >= st.day) ssStorm(sim, st);
}
function ssMetric(sim, key) {
  const s = sim.s;
  if (key === 'sat') { const t = Object.values(s.tenants).filter((tn) => s.leases[tn.lease]); return t.length ? t.reduce((a, tn) => a + tn.sat, 0) / t.length : 0; }
  if (key === 'stormOpen') return openDamage(s.scenario.kit).length;
}
function ssUpcoming(sim) {
  const k = sim.s.scenario.kit, day = sim.day, out = [];
  const next = k.storms.find((st) => !st.hit);
  if (next && next.day - day <= 3) out.push({ day: next.day, text: `Day ${next.day}: ${next.sev > 1.2 ? 'severe storm' : 'storm'} arrives`, urgent: true });
  else if (next) out.push({ day: 999, text: `${k.storms.filter((x) => !x.hit).length} storms left this season (3 days' warning)`, urgent: false });
  const open = openDamage(k); if (open.length) { const crew = open.filter((d) => d.state === 'crew'); out.push({ day: day, text: `${open.length} damaged unit${open.length > 1 ? 's' : ''} (${crew.length ? `crew done by Day ${Math.max(...crew.map((d) => d.fixDay))}` : ''}${crew.length && open.length > crew.length ? ', ' : ''}${open.length > crew.length ? `${open.length - crew.length} waiting or being patched` : ''})`, urgent: true }); }
  for (const p of k.payouts) if (!p.paid) out.push({ day: p.day, text: `Day ${p.day}: insurance pays ${money(p.amt)}`, urgent: false });
  return out;
}
function ssScore(sim) {
  const sat = ssMetric(sim, 'sat'), cash = kitMetric(sim, 'netLiquid'), notes = [];
  let stars = 1; const happy = sat >= 0.8, rich = cash >= 14000;
  notes.push(happy ? `Tenant satisfaction ${pctTxt(sat)} after the storms.` : `Tenant satisfaction ${pctTxt(sat)}; 80% earns a star.`);
  notes.push(rich ? `${money(cash)} in the bank after bills.` : `${money(cash)} after bills; $14,000 earns a star.`);
  stars += (happy ? 1 : 0) + (rich ? 1 : 0);
  return { stars, notes };
}

// =====================================================================================================
// 3. THE CHAIN NEXT DOOR
// =====================================================================================================
const CN_LAYOUT = [
  { tool: 'gate', a: { x: 20, y: 29 }, b: { x: 20, y: 29 } },
  { tool: 'aisle', a: { x: 19, y: 8 }, b: { x: 21, y: 29 } },
  { tool: 'office', a: { x: 16, y: 24 }, b: { x: 16, y: 24 } },
  { tool: 'aisle', a: { x: 5, y: 10 }, b: { x: 35, y: 12 } },
  { tool: 'aisle', a: { x: 5, y: 18 }, b: { x: 35, y: 20 } },
  { tool: 'du10x10', a: { x: 5, y: 9 }, b: { x: 18, y: 9 } },
  { tool: 'du10x10', a: { x: 22, y: 9 }, b: { x: 35, y: 9 } },
  { tool: 'du5x10', a: { x: 5, y: 13 }, b: { x: 12, y: 13 } },
  { tool: 'du10x10', a: { x: 13, y: 13 }, b: { x: 18, y: 13 } },
  { tool: 'du10x10', a: { x: 22, y: 13 }, b: { x: 27, y: 13 } },
  { tool: 'du5x10', a: { x: 28, y: 13 }, b: { x: 35, y: 13 } },
  { tool: 'du10x20', a: { x: 22, y: 21 }, b: { x: 33, y: 21 } },
  { tool: 'du5x5', a: { x: 5, y: 21 }, b: { x: 16, y: 21 } },
  { tool: 'light', a: { x: 10, y: 11 }, b: { x: 10, y: 11 } },
  { tool: 'light', a: { x: 30, y: 11 }, b: { x: 30, y: 11 } },
  { tool: 'light', a: { x: 10, y: 19 }, b: { x: 10, y: 19 } },
  { tool: 'light', a: { x: 30, y: 19 }, b: { x: 30, y: 19 } },
  { tool: 'light', a: { x: 20, y: 24 }, b: { x: 20, y: 24 } },
  { tool: 'camera', a: { x: 20, y: 11 }, b: { x: 20, y: 11 } },
  { tool: 'camera', a: { x: 20, y: 19 }, b: { x: 20, y: 19 } },
];
const CN = {
  name: 'The Chain Next Door',
  blurb: 'Your city storage business is nearly full at fair rents. Then Vaultline, a national chain, starts building across the road. It will undercut you, and it answers every price cut you make with a deeper one. Hold on to your tenants and your income: by price, by service, by loyalty, or by a mix of all three.',
  goals: [
    { k: 'occ', v: 0.85, label: 'Occupancy at least 85%', fmt: 'pct' },
    { k: 'rollShare', v: 0.92, label: 'Paying rent at least 92% of where you started', fmt: 'pct' },
    { k: 'rep', v: 0.8, label: 'Reputation at least 80%', fmt: 'pct' },
  ],
  hold: 14, winFrom: 120, deadline: 180,
  fail: { cashBelow: -8000, cashDays: 14 },
  kitFail: [{ k: 'occ', v: 0.62, cmp: '<', days: 14, label: 'Occupancy under 62%', why: 'Occupancy stayed under 62% for 14 days: the business could no longer cover its costs' }],
  failText: 'Occupancy under 62% for 14 days, or cash after bills and debt below -$8,000 for 14 days, ends the run.',
  demand: 0.075,
};
function cnMake(seed) {
  const sim = baseSim('urban', seed), s = sim.s, rnd = seedRand(seed);
  prebuild(sim, CN_LAYOUT);
  s.open = true;
  const units = sim.objs('unit').slice().sort((a, b) => a.id - b.id);
  const share = 0.9 + rnd() * 0.05;
  for (const u of units) if (rnd() < share) addTenant(sim, u, sim.marketRent(u) * (0.97 + rnd() * 0.06), rnd, { sat: 0.72 + rnd() * 0.12 });
  Object.assign(s.exp, { security: 0.74, cleanliness: 0.82, service: 0.8 });
  const j = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const opens = j(24, 32);
  const events = [{ id: 'announce', day: 1, opens }, { id: 'retain', day: j(12, 18) }, { id: 'poach', day: opens + j(10, 18) }, { id: 'sponsor', day: j(70, 84) }, { id: 'office', day: j(100, 118) }];
  const projects = [
    { id: 'security', name: 'Security upgrade', cost: 3600, days: 8, desc: 'Four more cameras and brighter lights on every aisle. Shoppers and tenants feel safer.' },
    { id: 'refresh', name: 'Curb appeal refresh', cost: 2600, days: 6, desc: 'Repaint doors, reseal the drive aisles and replant the front. The place looks clean and cared for.' },
  ];
  const roll0 = Object.values(s.leases).reduce((a, L) => a + L.rent, 0);
  const kit = kitState({ seed, events, projects, base: { demand: CN.demand }, start: { cash: 12000, roll: roll0 }, extra: { rival: null, wars: 0 } });
  return finishSetup(sim, scenarioShell('chainnextdoor', CN, seed, kit), 12000);
}
const CN_CAMS = [[8, 11], [32, 11], [8, 19], [32, 19]], CN_LIGHTS = [[15, 11], [25, 11], [15, 19], [25, 19]];
function cnRival(sim) { const k = sim.s.scenario.kit; return k.rival != null ? sim.s.mkt.comp.find((c) => c.id === k.rival) : null; }
function cnDecision(sim, e) {
  const k = sim.s.scenario.kit;
  switch (e.id) {
    case 'announce': return { title: 'Vaultline is coming', who: 'Market watch', days: 2,
      text: `Vaultline, a national storage chain, opens across the road on about Day ${e.opens}. Chains like this open about 14% under market and fight for every shopper. It watches your prices: if you cut close to its level, it cuts again.`,
      opts: [{ label: 'Understood', sub: 'Plan your response: new-tenant rents (Business tab), service, loyalty and projects' }], def: 0 };
    case 'retain': return { title: 'Lock in your tenants before Vaultline opens?', who: 'Office', days: 5,
      text: 'Your tenants will get Vaultline flyers soon. You can reward them for staying now.',
      opts: [{ label: 'Loyalty rate: 5% off for current tenants', sub: 'Current rents drop 5% for good; tenants much happier' }, { label: 'Loyalty perks', sub: '$1,400 · free locks, a moving-day truck, thank-you notes; rents unchanged', cost: 1400 }, { label: 'Do nothing', sub: 'Keep the money' }], def: 2 };
    case 'poach': return { title: 'Vaultline is offering your tenants a free month', who: 'Office', days: 4,
      text: 'Several tenants have asked about Vaultline\'s "first month free to switch" mailer. The ones paying the most are the most tempted.',
      opts: [{ label: 'Match it for anyone who asks', sub: 'About $' + Math.round(k.poachCost || 0).toLocaleString('en-US') + ' in credits; those tenants stay', cost: Math.round(k.poachCost || 0) }, { label: 'Counter with ads', sub: '$800 · about +30% shoppers for 30 days', cost: 800 }, { label: 'Let them go', sub: 'No cost; several tenants will give notice' }], def: 2 };
    case 'sponsor': return { title: 'Sponsor the neighborhood street fair?', who: 'Business association', days: 5,
      text: 'Your name on the banners, a booth by the entrance and a mention in the local paper.',
      opts: [{ label: 'Sponsor it', sub: '$1,500 · about +25% shoppers for 45 days and a better name in town', cost: 1500 }, { label: 'Pass', sub: 'Keep the money' }], def: 1 };
    case 'office': { const n = Math.min(5, vacantReady(sim).filter((u) => u.size === '10x10' || u.size === '5x10').length); if (n < 2) return null;
      return { title: 'A business wants several units on a 12-month deal', who: 'Metro Medical Supply', days: 4,
        text: `They want ${n} of your empty 5x10 and 10x10 units for stock, at 10% off your asking rent, signed for a year.`,
        opts: [{ label: `Rent all ${n} at 10% off`, sub: 'Fills them now at a lower rent' }, { label: 'Decline', sub: 'Keep them for full-price shoppers' }], def: 1 }; }
  }
  return null;
}
function cnChoose(sim, id, i) {
  const s = sim.s, k = s.scenario.kit;
  if (id === 'announce') { const e = k.events.find((x) => x.id === 'announce'); const c = addRival(sim, { name: 'Vaultline Self Storage', opens: e.opens, strength: 0.3, price: 0.86, dist: 0.2 }); k.rival = c.id; k.nextRivalCheck = e.opens + 14; return 'Vaultline opens Day ' + e.opens; }
  if (id === 'retain') {
    if (i === 0) { for (const L of Object.values(s.leases)) { L.rent = Math.round(L.rent * 0.95); const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat + 0.14, 0, 1); } k.flags.loyal = true; return 'Loyalty rate applied'; }
    if (i === 1) { sim.money(-1400, 'service', 'Loyalty perks'); for (const tn of Object.values(s.tenants)) tn.sat = clamp(tn.sat + 0.16, 0, 1); k.flags.perks = true; return 'Loyalty perks handed out'; }
    return 'No loyalty offer';
  }
  if (id === 'poach') {
    const c = cnRival(sim), at = poachTargets(sim);
    if (i === 0) { const cost = Math.round(k.poachCost || 0); if (cost) sim.money(-cost, 'service', 'Matched free-month credits'); for (const tn of at) tn.sat = clamp(tn.sat + 0.12, 0, 1); return `Credits given to ${at.length} tenants`; }
    if (i === 1) { sim.money(-800, 'marketing', 'Counter-advertising'); addMod(sim, { k: 'demand', mult: 1.3, until: sim.day + 29, label: 'Counter ads' }); }
    let n = 0; for (const tn of at) if (kitRand(k) < 0.7 && scheduleMoveOut(sim, tn)) n++;
    return n ? `${n} tenants gave notice` : 'No one left';
  }
  if (id === 'sponsor') { if (i === 0) { sim.money(-1500, 'marketing', 'Street fair sponsorship'); addMod(sim, { k: 'demand', mult: 1.25, until: sim.day + 44, label: 'Street fair' }); s.exp.service = clamp(s.exp.service + 0.06, 0, 1); s.exp.value = clamp(s.exp.value + 0.04, 0, 1); return 'Sponsored'; } return 'Passed'; }
  if (id === 'office') {
    if (i !== 0) return 'Declined';
    const pool = vacantReady(sim).filter((u) => u.size === '10x10' || u.size === '5x10').slice(0, 5); const rnd = () => kitRand(k);
    for (const u of pool) addTenant(sim, u, sim.askFor(u) * 0.9, rnd, { newLease: true, sat: 0.8, tag: 'office' });
    ensureCustomerAccounts(s); sim.markDirty(); return `${pool.length} units rented to Metro Medical`;
  }
}
function poachTargets(sim) { // tenants paying above the rival's price (plus a little) are the ones the mailer tempts
  const s = sim.s, c = cnRival(sim), cp = c ? c.price : 0.86;
  const k = s.scenario.kit, cap = k.poachN || (k.poachN = 5 + Math.floor(kitRand(k) * 3)); // the mailer tempts the least happy of the tenants paying well above Vaultline
  return Object.values(s.tenants).filter((tn) => { const L = s.leases[tn.lease]; if (!L || tn.leaving || L.status !== 'current') return false; const u = s.objects[L.unit]; return u && L.rent / sim.marketRent(u) > cp + 0.05 && tn.sat < 0.9; }).sort((a, b) => a.sat - b.sat || a.id - b.id).slice(0, cap);
}
function cnOnDay(sim, day) {
  const s = sim.s, k = s.scenario.kit, c = cnRival(sim);
  const pe = k.events.find((x) => x.id === 'poach'); if (pe && !pe.fired) k.poachCost = poachTargets(sim).length * 0.5 * (s.leases && Object.values(s.leases).reduce((a, L) => a + L.rent, 0) / Math.max(1, Object.keys(s.leases).length));
  if (!c || day < c.opens) return;
  if (day >= k.nextRivalCheck) {
    k.nextRivalCheck = day + 14;
    const r = askRatio(sim), rep = sim.reputation();
    if (r <= c.price + 0.04 && r < 0.95 && c.price > 0.7) { c.price = Math.round((c.price - 0.04) * 100) / 100; c.strength = Math.min(0.42, Math.round((c.strength + 0.02) * 100) / 100); k.wars++; k.lastCut = day; kitLog(sim, `Vaultline answered your prices: now ${pctTxt(1 - c.price)} under market`, 'bad'); sim.emit('drama', { k: 'pricewar', title: 'Vaultline cut prices again', sub: `Now about ${pctTxt(1 - c.price)} under market.` }); }
    else if (day >= 105 && (k.lastCut == null || day - k.lastCut >= 28) && c.price < 0.92) { c.price = Math.round((c.price + 0.03) * 100) / 100; kitLog(sim, `Vaultline raised prices: now ${pctTxt(1 - c.price)} under market`, 'good'); }
    if (rep >= 0.84 && c.strength > 0.12) { c.strength = Math.round((c.strength - 0.03) * 100) / 100; kitLog(sim, 'Shoppers prefer your service: Vaultline is pulling fewer of them', 'good'); }
    else if (rep < 0.74 && c.strength < 0.42) { c.strength = Math.round((c.strength + 0.03) * 100) / 100; kitLog(sim, 'Shoppers are drifting to Vaultline', 'bad'); }
  }
}
function cnProjectDone(sim, id) {
  const s = sim.s;
  if (id === 'security') { const cre = s.creative; s.creative = true; for (const [x, y] of CN_CAMS) sim.dispatch({ type: 'build', tool: 'camera', f: 0, a: { x, y }, b: { x, y } }); for (const [x, y] of CN_LIGHTS) sim.dispatch({ type: 'build', tool: 'light', f: 0, a: { x, y }, b: { x, y } }); s.creative = cre; s.orders = s.orders.filter((o) => o.st === 'construction' && !o.objs.every((id) => s.objects[id]?.cstate === 'operating')); sim.rebuild(); s.exp.security = clamp(s.exp.security + 0.08, 0, 1); }
  if (id === 'refresh') { for (const d of s.dirt) d.fill(0); s.exp.cleanliness = clamp(s.exp.cleanliness + 0.1, 0, 1); s.exp.comfort = clamp((s.exp.comfort ?? 0.8) + 0.08, 0, 1); for (const tn of Object.values(s.tenants)) tn.sat = clamp(tn.sat + 0.05, 0, 1); }
}
function cnMetric(sim, k) { if (k === 'rollShare') { const r0 = sim.s.scenario.kit.start.roll || 1; return sim.rentRollPaying() / r0; } }
function cnUpcoming(sim) { const c = cnRival(sim), k = sim.s.scenario.kit, day = sim.day; if (!c) return []; if (day < c.opens) return [{ day: c.opens, text: `Day ${c.opens}: Vaultline opens (${pctTxt(1 - c.price)} under market)`, urgent: c.opens - day <= 5 }]; return [{ day: k.nextRivalCheck, text: `Day ${k.nextRivalCheck}: Vaultline reviews its prices (now ${pctTxt(1 - c.price)} under)`, urgent: false }]; }
function cnScore(sim) {
  const k = sim.s.scenario.kit, share = cnMetric(sim, 'rollShare'), c = cnRival(sim), notes = [];
  let stars = 1; const full = share >= 1.0, calm = k.wars === 0;
  notes.push(full ? `Paying rent ${pctTxt(share)} of where you started.` : `Paying rent ${pctTxt(share)} of the start; 100% earns a star.`);
  notes.push(calm ? 'You never set off a price war.' : `Vaultline cut ${k.wars} time${k.wars > 1 ? 's' : ''} in response to you; no price war earns a star.`);
  stars += (full ? 1 : 0) + (calm ? 1 : 0);
  return { stars, notes };
}

// ---------------------------------------------------------------- registration + menu data
const LOSS_TIPS = {
  grandopening: 'Lease-up is a race between filling units and keeping rent high enough for the loan. Ads and the opening push fill faster; very low asking rents lock in for good.',
  stormseason: 'Storms come with 3 days\' warning. Broken lights and a stuck gate cost reputation fast: fix them quickly, prepare for the big storm, and decide early between insurance and storm-proofing.',
  chainnextdoor: 'Cutting close to Vaultline\'s price makes it cut again. Holding tenants with service and loyalty, and pricing a little above the chain, usually beats a race to the bottom.',
};
export const KIT_SCENARIOS = {
  grandopening: { ...GO, make: goMake, decision: goDecision, choose: goChoose, onDay: goOnDay, score: goScore, tip: LOSS_TIPS.grandopening, cash0: 12000 },
  stormseason: { ...SS, make: ssMake, decision: ssDecision, choose: ssChoose, onDay: ssOnDay, upcoming: ssUpcoming, metric: ssMetric, score: ssScore, tip: LOSS_TIPS.stormseason, cash0: 8000 },
  chainnextdoor: { ...CN, make: cnMake, decision: cnDecision, choose: cnChoose, onDay: cnOnDay, upcoming: cnUpcoming, projectDone: cnProjectDone, metric: cnMetric, score: cnScore, tip: LOSS_TIPS.chainnextdoor, cash0: 12000 },
};
for (const [id, d] of Object.entries(KIT_SCENARIOS)) registerKit(id, d);
export function makeKitScenario(id, seed) { const d = KIT_SCENARIOS[id]; return d ? d.make(seed == null ? runSeed() : seed >>> 0) : null; }
