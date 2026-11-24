// Harborview Rate Reset (HV-2): a working-harbor storage business on the scenario kit (scenariokit.js).
// The yard sits at the foot of a fishing pier. Legacy rents are stale; the fishing crews who rent the gear
// lockers are the oldest and cheapest tenants; boat owners need covered storage when they haul out each fall.
// Goal (owner decision R1, Nov 24 2026): monthly lease rent from the 44 ORIGINAL units +15%, occupancy 92%,
// both held 14 mornings by Day 100. Boat bays are an optional investment: they add cash and stars, and an
// empty bay counts against occupancy, but bay rent never counts toward the rent goal.
//
// Everything acts through existing systems: rent notices (never applied rent, bills or accounts), the normal
// move-out risk and conversations, scheduled ready-to-sign shoppers, kit decisions/projects/mods, lights and
// cameras, and the engine's ordinary break-in consequence (Sim.breakIn).
import { registerKit, kitState, kitRand, addMod, kitLog } from './scenariokit.js';
import { customerHistory } from './customeraccounts.js';
import { MIN_PER_DAY } from './data.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const plural = (n, w, ws = w + 's') => `${n} ${n === 1 ? w : ws}`;

export const HV_GROUPS = { crew: 'Fishing crew', bayside: 'Bayside Charters', boat: 'Boat owner', resident: 'Resident' };
export const HV_CREWS = 12;
export const HV_RUSH = { from: 25, to: 45 };   // haul-out: boat owners pull their boats for winter
export const HV_WINTER = { from: 46, mult: 0.6 }; // the winter lull: fewer shoppers until the deadline
export const HV_BAYS = { aisle: { a: { x: 25, y: 10 }, b: { x: 34, y: 11 } }, bays: { a: { x: 26, y: 9 }, b: { x: 33, y: 9 } } };
const COOP_MIN = 3, COOP_CAP = 0.05, PATROL = 400, MARINA = 600;

export function isHarborview(s) { return !!(s && s.scenario && s.scenario.id === 'ratereset' && s.scenario.kit); }
// Display label for a lease's customer group (Harborview only; null elsewhere so other scenarios show nothing).
export function harborGroup(s, L) {
  if (!isHarborview(s) || !L) return null;
  if (L.kitTag && HV_GROUPS[L.kitTag]) return HV_GROUPS[L.kitTag];
  return s.objects[L.unit]?.size === '10x20' ? HV_GROUPS.boat : HV_GROUPS.resident;
}
const kitOf = (sim) => sim.s.scenario.kit;
const crewLeases = (s) => Object.values(s.leases).filter((L) => L.kitTag === 'crew');
const boatLeases = (s) => Object.values(s.leases).filter((L) => s.objects[L.unit]?.size === '10x20');
const bayUnits = (sim) => sim.objs('unit').filter((u) => u.size === '10x20' && u.cstate === 'operating');
// SI-1: thieves look at the unit's door frontage (every door cell must be lit or watched), never a footprint corner.
function isDark(sim, u) { return sim.doorExposed(u); }
function note(s, L, text, day) { const tn = s.tenants[L.tenant], a = tn && s.customerAccounts?.[tn.accountId]; if (a) customerHistory(a, day, 'scenario', text, L.id); }

// ---------------------------------------------------------------- setup (called by makeRateReset after the yard is let)
// Tags 12 longest-held 5x10 leases as fishing crews and 3 adjacent leased 10x10s as Bayside Charters, schedules the
// haul-out shoppers, and returns the kit scenario record. rnd is the start's seeded stream.
export function harborviewSetup(sim, def, V, roll0, seed, rnd) {
  const s = sim.s;
  const yard = sim.objs('unit').map((u) => u.id).sort((a, b) => a - b);
  const lockers = Object.values(s.leases).filter((L) => s.objects[L.unit]?.size === '5x10').sort((a, b) => a.start - b.start || a.id - b.id).slice(0, HV_CREWS);
  for (const L of lockers) L.kitTag = 'crew';
  const tens = sim.objs('unit').filter((u) => u.size === '10x10');
  const triples = [];
  for (const u of tens) {
    const row = tens.filter((v) => v.y === u.y && v.x >= u.x && v.x <= u.x + 4).sort((a, b) => a.x - b.x);
    if (row.length === 3 && row.every((v) => v.lease)) triples.push(row);
  }
  triples.sort((a, b) => a[0].y - b[0].y || a[0].x - b[0].x);
  const pick = triples.length ? triples[Math.floor(rnd() * triples.length)] : [];
  for (const u of pick) s.leases[u.lease].kitTag = 'bayside';
  const j = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const rushN = j(9, 11);
  for (let k = 0; k < rushN; k++) sim.schedule({ kind: 'prospect', size: '10x20', climate: false, keen: true }, sim.randomTime(HV_RUSH.from + Math.floor(k * (HV_RUSH.to - HV_RUSH.from) / rushN), 9, 16));
  const wave = j(60, 63);
  const events = [{ id: 'bayside', day: 6 }, { id: 'coop', day: 9999 }, { id: 'marina', day: 18 }, { id: 'watch', day: wave - 7, wave, hits: j(2, 3) }];
  const projects = [{ id: 'bays', name: 'Boat bays (4 x 10x20 and a back-lot aisle)', cost: 7500, days: 10, until: 30, state: 'hidden',
    desc: 'Four covered 10x20 drive-up bays on the back lot by the water, for boat owners hauling out. Bay rent does not count toward the rent goal; empty bays count against occupancy.' }];
  const crewUnits = Object.fromEntries(lockers.map((L) => [L.id, s.objects[L.unit].num]));
  const kit = kitState({ seed, events, projects, base: { demand: V.demand },
    start: { cash: def.cash, roll: roll0, yard, crew: lockers.length, crewUnits, bayside: pick.map((u) => u.lease), rushN },
    extra: { thefts: 0, crewGone: [] } });
  const v = Math.round(roll0 * (1 + def.rollUp) / 50) * 50;
  const goals = def.goals.map((g) => g.k === 'yardRoll' ? { ...g, v, label: `Monthly lease rent from your 44 original units at least ${money(v)} (start: ${money(roll0)})` } : { ...g });
  return { id: 'ratereset', name: def.name, v: 1, kit, goals, deadline: def.deadline, fail: { ...def.fail }, hold: def.hold, winFrom: def.winFrom, kitFail: [],
    status: 'active', badDays: 0, seed: s.seed, variant: V.id, variantLabel: V.label, roll0 };
}

// ---------------------------------------------------------------- the co-op: pending locker notices above 5%
function coopMatches(sim) {
  const s = sim.s, day = sim.day;
  return crewLeases(s).filter((L) => L.rentNotice && L.rentNotice.pct > COOP_CAP + 1e-9 && day < L.rentNotice.effectiveDay);
}
function coopCap(N) { return Math.min(N.rent, Math.round(N.previousRent * (1 + COOP_CAP))); }

// ---------------------------------------------------------------- decisions
function decision(sim, e) {
  const s = sim.s, k = kitOf(sim);
  switch (e.id) {
    case 'bayside': return { title: 'Bayside Charters asks for a winter rate lock', who: 'Bayside Charters', days: 5,
      text: 'Bayside runs the harbor’s fishing charters and rents 3 of your 10x10s for tackle and engines. They ask you to lock their current rents for six months. In return they will send two charter clients who need to store a boat for the winter.',
      opts: [{ label: 'Lock their rents for 6 months', sub: 'Their 3 units leave rent reviews for 6 months; 2 ready-to-sign 10x20 shoppers on Days 26-34' }, { label: 'Decline', sub: 'Their units stay reviewable like any other' }], def: 1 };
    case 'coop': {
      const m = coopMatches(sim); if (!m.length) return null;
      const extra = m.reduce((a, L) => a + L.rentNotice.rent - L.rentNotice.previousRent, 0), capped = m.reduce((a, L) => a + coopCap(L.rentNotice) - L.rentNotice.previousRent, 0);
      return { title: 'The fishing co-op wants your locker increases capped', who: 'Harbor Fishermen’s Co-op', days: 5,
        text: `${plural(m.length, 'fishing crew')} received notices raising their gear lockers by more than 5% (+${money(extra)}/mo in total). The co-op asks you to cap them at 5%. The notices have not taken effect yet; their bills are unchanged until each notice’s date.`,
        opts: [{ label: 'Agree to +5% for crews', sub: `Those notices become +5% (+${money(capped)}/mo instead of +${money(extra)}); crews a little happier` },
          { label: 'Pause crew increases this season', sub: `Cancel those notices and protect the current rent for 6 months, like “Hold for 6 months”` },
          { label: 'Keep the notices', sub: 'They take effect as sent; the crews are unhappy and some may leave when the new rent starts' }], def: 2 };
    }
    case 'marina': {
      const p = k.projects.find((x) => x.id === 'bays');
      if (!bayUnits(sim).length && !(p && (p.state === 'building' || p.state === 'done'))) { kitLog(sim, 'Harbor Marina asked about boat storage for the haul-out. You have none to offer.', 'warn'); return null; }
      return { title: 'Harbor Marina offers haul-out referrals', who: 'Harbor Marina', days: 5,
        text: 'The marina is hauling boats out for the winter and has nowhere to put them. For a referral fee it will send its members to you over the next few weeks.',
        opts: [{ label: `Pay the referral fee (${money(MARINA)})`, sub: 'About 6 more ready-to-sign 10x20 shoppers on Days 27-41', cost: MARINA }, { label: 'No thanks', sub: 'Keep the money' }], def: 1 };
    }
    case 'watch': {
      const dark = sim.objs('unit').filter((u) => u.lease && isDark(sim, u)), boats = dark.filter((u) => u.size === '10x20');
      const where = boats.length ? `${plural(boats.length, 'boat bay')} (${boats.map((u) => u.num).join(', ')}) ${boats.length === 1 ? 'is' : 'are'} dark and off camera.` : dark.length ? `${plural(dark.length, 'rented unit')} on your lot ${dark.length === 1 ? 'is' : 'are'} dark and off camera.` : 'Every rented unit on your lot is lit or on camera.';
      return { title: 'Outboard thefts on Pier Road', who: 'Pier Road Watch', days: 4,
        text: `Thieves are stripping outboard motors and boat gear along the harbor. Expect them on Pier Road around Day ${e.wave}. ${where} Lights ($200) and cameras ($500) on those spots deter them; the Security map marks dark spots with a cross.`,
        opts: [{ label: `Hire a night patrol (${money(PATROL)})`, sub: 'About half the thefts are stopped', cost: PATROL }, { label: 'We’ll handle it ourselves', sub: 'Add lights or cameras where the map shows dark spots, or take the risk' }], def: 1 };
    }
  }
  return null;
}
function choose(sim, id, i) {
  const s = sim.s, k = kitOf(sim), day = sim.day;
  if (id === 'bayside') {
    if (i !== 0) return 'Declined the rate lock';
    const Ls = k.start.bayside.map((lid) => s.leases[lid]).filter(Boolean);
    for (const L of Ls) { L.holdUntil = Math.max(L.holdUntil || 0, s.t + 180 * MIN_PER_DAY); const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat + 0.08, 0, 1); note(s, L, 'Rate locked for 6 months (Bayside Charters agreement)', day); }
    for (let n = 0; n < 2; n++) sim.schedule({ kind: 'prospect', size: '10x20', climate: false, keen: true }, sim.randomTime(26 + n * 8, 9, 16));
    k.flags.baysideLock = true;
    kitLog(sim, `Bayside rate lock: ${plural(Ls.length, 'unit')} protected for 6 months; 2 charter clients will look for boat storage on Days 26-34`, 'good');
    return 'Bayside rents locked';
  }
  if (id === 'coop') {
    const m = coopMatches(sim); k.flags.coop = ['agree', 'pause', 'keep'][i];
    if (i === 0) {
      let cut = 0;
      for (const L of m) { const N = L.rentNotice, cap = coopCap(N); cut += N.rent - cap; N.rent = cap; N.pct = Math.min(N.pct, COOP_CAP); sim.dropConvo('rate' + L.id); const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat + 0.04, 0, 1); note(s, L, `Rent notice revised to +5% (co-op agreement), effective Day ${N.effectiveDay}`, day); }
      kitLog(sim, `Co-op deal: ${plural(m.length, 'locker notice')} cut to +5% (${money(cut)}/mo less than sent, from each notice’s date)`, 'decision');
      return `${plural(m.length, 'notice')} revised to +5%`;
    }
    if (i === 1) {
      let cut = 0;
      for (const L of m) { cut += L.rentNotice.rent - L.rent; delete L.rentNotice; L.prevRent = null; L.holdUntil = s.t + 180 * MIN_PER_DAY; sim.dropConvo('rate' + L.id); const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat + 0.08, 0, 1); note(s, L, 'Rent increase cancelled; current rent protected for 6 months (co-op agreement)', day); }
      kitLog(sim, `Crew increases paused: ${plural(m.length, 'locker notice')} cancelled (${money(cut)}/mo you had notified), protected for 6 months`, 'decision');
      return `${plural(m.length, 'notice')} cancelled`;
    }
    for (const L of m) { const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat - 0.05, 0, 1); }
    kitLog(sim, `Co-op unhappy: ${plural(m.length, 'crew')} keep their notices. Some may leave when the new rent starts`, 'bad');
    return 'Notices stand';
  }
  if (id === 'marina') {
    if (i !== 0) return 'Declined the referrals';
    sim.money(-MARINA, 'marketing', 'Harbor Marina referral fee');
    for (let n = 0; n < 6; n++) sim.schedule({ kind: 'prospect', size: '10x20', climate: false, keen: true }, sim.randomTime(27 + n * 3 - (n > 3 ? 1 : 0), 9, 16));
    k.flags.marina = true; kitLog(sim, 'Harbor Marina will send about 6 members looking for boat storage on Days 27-41', 'good');
    return 'Referrals arranged';
  }
  if (id === 'watch') {
    const e = k.events.find((x) => x.id === 'watch');
    if (i === 0) { sim.money(-PATROL, 'service', 'Night patrol on Pier Road'); k.flags.patrol = true; kitLog(sim, `Night patrol hired for the theft wave around Day ${e.wave}`, 'good'); return 'Patrol hired'; }
    kitLog(sim, `Thefts expected around Day ${e.wave}: light or watch the dark spots on the Security map`, 'warn');
    return 'You will handle it';
  }
}

// ---------------------------------------------------------------- daily rules (7:00 batch)
function onDay(sim, day) {
  const s = sim.s, k = kitOf(sim);
  const p = k.projects.find((x) => x.id === 'bays');
  if (p && p.state === 'hidden' && day >= 8) { p.state = 'offered'; kitLog(sim, 'Boat-bay project available until Day 30 (Scenario card)', 'warn'); }
  if (day === HV_WINTER.from) { addMod(sim, { k: 'demand', mult: HV_WINTER.mult, until: 9999, label: 'Winter lull' }); kitLog(sim, 'Winter lull: fewer shoppers until spring', 'warn'); }
  // the co-op answers a few days after crews receive locker notices above 5%
  const ce = k.events.find((x) => x.id === 'coop');
  if (ce && !ce.fired && ce.day === 9999) {
    if (coopMatches(sim).length >= COOP_MIN) { ce.day = day + 2; kitLog(sim, `The fishing co-op has heard about your locker notices. It will answer on Day ${ce.day}`, 'warn'); }
    else if (!k.flags.coopFair && crewLeases(s).filter((L) => L.rentNotice).length >= COOP_MIN) { k.flags.coopFair = true; kitLog(sim, 'Fishing co-op: the +5% locker notices are fair', 'good'); }
  }
  // crews leaving (through the normal move-out path) are visible in the log
  for (const lid of Object.keys(k.start.crewUnits)) if (!s.leases[lid] && !k.crewGone.includes(+lid)) {
    k.crewGone.push(+lid); kitLog(sim, `A fishing crew left Unit ${k.start.crewUnits[lid]} (${k.crewGone.length} of ${k.start.crew} crews gone)`, 'bad');
  }
  // the outboard theft wave: dark, off-camera rented units, boat bays first, then the highest rents
  const we = k.events.find((x) => x.id === 'watch');
  if (we && day >= we.wave && day < we.wave + 3 && (k.waveDone || 0) < we.hits && day - (k.waveLast ?? -9) >= 1) {
    k.waveLast = day; k.waveDone = (k.waveDone || 0) + 1;
    if (k.flags.patrol && kitRand(k) < 0.5) { kitLog(sim, 'The night patrol turned thieves away from Pier Road', 'good'); return; }
    const pool = sim.objs('unit').filter((u) => u.lease && s.leases[u.lease] && s.tenants[s.leases[u.lease].tenant] && isDark(sim, u))
      .sort((a, b) => (b.size === '10x20') - (a.size === '10x20') || s.leases[b.lease].rent - s.leases[a.lease].rent || a.id - b.id);
    if (!pool.length) { kitLog(sim, 'Thieves came down Pier Road but found nothing dark to hit', 'good'); return; }
    const u = pool[Math.floor(kitRand(k) * Math.min(3, pool.length))];
    sim.breakIn(u, day, { title: `Theft at Unit ${u.num}`, sub: 'Outboard thieves hit units with dark, unwatched doors. Light or watch the whole door front.',
      text: (loss) => `Thieves cut the lock on Unit ${u.num} overnight. ${u.size === '10x20' ? 'The outboard motor and electronics' : 'About ' + money(loss) + ' of my gear'} ${u.size === '10x20' ? 'are' : 'is'} gone. What are you going to do about it?` });
    k.thefts++; kitLog(sim, `Theft at Unit ${u.num} (${harborGroup(s, s.leases[u.lease]) || 'tenant'}): door dark or not fully covered`, 'bad');
  }
}
function projectDone(sim, id) {
  if (id !== 'bays') return;
  const s = sim.s, cre = s.creative; s.creative = true;
  sim.dispatch({ type: 'build', tool: 'aisle', f: 0, ...HV_BAYS.aisle });
  sim.dispatch({ type: 'build', tool: 'du10x20', f: 0, ...HV_BAYS.bays });
  sim.dispatch({ type: 'commission', all: true });
  s.creative = cre; s.orders = s.orders.filter((o) => o.st === 'construction' && !o.objs.every((oid) => s.objects[oid]?.cstate === 'operating'));
  sim.markDirty(); sim.rebuild();
  for (const u of sim.objs('unit')) if (u.size === '10x20' && u.cstate === 'operating' && !u.lease) u.commercial = 'ready';
  kitLog(sim, `${plural(bayUnits(sim).length, 'boat bay')} open on the back lot. Set the 10x20 street rate before the haul-out`, 'good');
}
function metric(sim, key) {
  if (key !== 'yardRoll') return undefined;
  const s = sim.s, yard = new Set(kitOf(sim).start.yard);
  return Object.values(s.leases).reduce((a, L) => a + (yard.has(L.unit) ? L.rent : 0), 0);
}
function upcoming(sim) {
  const s = sim.s, k = kitOf(sim), day = sim.day, out = [];
  const ce = k.events.find((x) => x.id === 'coop'); if (ce && !ce.fired && ce.day !== 9999) out.push({ day: ce.day, text: `Day ${ce.day}: the fishing co-op answers your locker notices`, urgent: true });
  const p = k.projects.find((x) => x.id === 'bays');
  if (p && p.state === 'offered' && day <= p.until) out.push({ day: p.until, text: `Day ${p.until}: last day to start the boat-bay project`, urgent: p.until - day <= 5 });
  if (p && p.state === 'building') out.push({ day: p.doneDay, text: `Day ${p.doneDay}: boat bays open`, urgent: false });
  if (day <= HV_RUSH.to) out.push({ day: Math.max(day, HV_RUSH.from), text: day < HV_RUSH.from ? `Days ${HV_RUSH.from}-${HV_RUSH.to}: haul-out. Boat owners pay up to 1.25x market for a 10x20` : `Now to Day ${HV_RUSH.to}: haul-out. Boat owners pay up to 1.25x market for a 10x20`, urgent: false });
  if (day < HV_WINTER.from) out.push({ day: HV_WINTER.from, text: `Day ${HV_WINTER.from}: winter lull, fewer shoppers`, urgent: false });
  const we = k.events.find((x) => x.id === 'watch');
  if (we && we.fired && day < we.wave + 3) out.push({ day: we.wave, text: `Day ${we.wave}: outboard thieves expected on Pier Road`, urgent: we.wave - day <= 5 });
  return out;
}
function score(sim) {
  const s = sim.s, k = kitOf(sim), notes = [];
  const crews = crewLeases(s).length, boats = boatLeases(s), thefts = k.thefts;
  const fleet = crews >= HV_CREWS - 2, harbor = boats.length >= 3, quiet = thefts <= 1;
  notes.push(fleet ? `Fleet kept: ${crews} of ${k.start.crew} crews still rent lockers.` : `Fleet: ${crews} of ${k.start.crew} crews left; keeping ${HV_CREWS - 2} earns a star.`);
  notes.push(harbor ? `Boat business: ${boats.length} bays leased, ${money(boats.reduce((a, L) => a + L.rent, 0))}/mo.` : `Boat business: ${boats.length} bays leased; 3 earns a star.`);
  notes.push(quiet ? `Quiet winter: ${plural(thefts, 'theft')} on Pier Road.` : `${thefts} thefts on Pier Road; 1 or fewer earns a star.`);
  return { stars: 1 + Math.min(2, [fleet, harbor, quiet].filter(Boolean).length), notes };
}

export const HARBORVIEW_KIT = {
  name: 'Harborview Rate Reset',
  blurb: 'You just bought Harborview, the storage yard at the foot of a working fishing pier. Its office faces Pier Road; tenants come in through the west gate. Every lease is years old and cheap, most of all the fishing crews’ gear lockers, and the posted street rates are just as stale. Lift the rent on the yard you bought without losing the fleet. Boat owners need winter storage when they haul out each fall: building boat bays is optional. Winter brings fewer shoppers and outboard thieves.',
  goals: [{ k: 'yardRoll', v: 0, label: 'Monthly lease rent from your 44 original units 15% above your start', fmt: 'money' }, { k: 'occ', v: 0.92, label: 'Occupancy at least 92% (boat bays count)', fmt: 'pct' }],
  // winFrom 60 (HV-2 balance): goals count from Day 60, so the hold runs through the winter lull and the theft wave.
  hold: 14, winFrom: 60, deadline: 100, rollUp: 0.15, cash: 2500, perRun: true,
  fail: { cashBelow: -1500, cashDays: 14 },
  failText: 'Cash after bills and debt below -$1,500 for 14 days ends the run.',
  tip: 'The rent goal counts only the 44 units you bought, so rent reviews do the work. Crews push back on lockers above +5%; Bayside, the marina and boat bays are optional. Fewer shoppers come in winter, and thieves go for dark, off-camera units.',
  decision, choose, onDay, projectDone, metric, upcoming, score,
};
registerKit('ratereset', HARBORVIEW_KIT);
