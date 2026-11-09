import { tutorialUnit } from './unitnumbering.js';
import { careerEligibility } from './career.js';
// Maple Street tutorial (GDD §5-7). Beats are real property needs with deterministic milestone checks.
// Authored world events (a keen prospect, a failing light, a move-out) use the normal simulation paths.
import { TOOLS, ROLES, BILLING_CYCLE_DAYS } from './data.js';
import { verticalDone, verticalLayout, shaftHallState, upRouteQuote } from './blueprint.js';
import { investmentEvidence, demandEvidenceText } from './economics.js';
import { creditNeeded, creditProjection, outlook, cents } from './finance.js';
import { actIIProgress, investmentText, gradProgress } from './investmentprogress.js';

const unitByRole = (sim, role) => tutorialUnit(sim, role);
const createdSince = (sim, type, t) => sim.objs(type).some((o) => o.cstate === 'operating' && o.id > (ctx(sim).idMark || 0));

// Each beat has an intro, a "why" note, and an ordered checklist of steps. Steps are UI guidance only:
// they read sim + UI state (never write), so determinism rests on beat.check alone. The first step whose
// `done` is false (after the last done one) is current: the coach ring points at its `sel` (DOM), `obj` or
// `cell` (map), and its `d` text says exactly where to tap.
export const ctx = (sim) => sim.s.lesson || sim.s.tut; // a running lesson has its own marks/flags
const since = (sim, pred) => Object.values(sim.s.objects).some((o) => o.id > (ctx(sim).idMark || 0) && pred(o));
const built = (sim, tool, f) => (ctx(sim).built || []).some((b) => b.id >= (ctx(sim).idMark || 0) && b.tool === tool && (f == null || b.f === f));
const ordered = (sim, tool) => built(sim, tool);
const newUnits = (sim, pred = () => true) => sim.objs('unit').filter((u) => u.id > (ctx(sim).idMark || 0) && pred(u));
const tabIs = (ui, t) => ui && ui.tab === t;
const toolIs = (ui, k) => ui && ui.tool === k;
const catIs = (ui, c) => ui && ui.tab === 'build' && ui.cat === c;
const planOk = (ui, k) => ui && ui.tool === k && ui.plan && ui.plan.status === 'valid';
const running = (sim) => sim.s.speed > 0;
const hallLight = (sim) => sim.objs('light').find((l) => l.x === 20 && l.y === 8);
const repairTask = (sim, o) => o && sim.s.tasks.find((t) => t.obj === o.id && t.type !== 'makeready');
const TAB = (v) => `#tabs [data-v="${v}"]`, CAT = (v) => `.cats [data-v="${v}"]`, TOOL = (v) => `[data-a="tool"][data-v="${v}"]`;
const CONFIRM = '#abar [data-a="confirm"]', PLAY = '#speed [data-v="1"]', FAST = '#speed [data-v="4"]';

// Standard build sequence: open Build -> category -> tool -> place at the marker -> Confirm.
// `placed` = the order exists (later steps become meaningful once it does).
// `review` steps sit between the placement and Confirm: they need the placement review bar (e.g. its Climate toggle).
function buildSteps({ cat, catName, tool, toolName, place, placeD = '', cell, f = 0, end = cell, axis, climate = false, placed, extra = [], review = [], after }) {
  const past = (sim, ui) => placed(sim) || toolIs(ui, tool);
  const steps = [
    { t: `Open <b>Build</b>`, d: 'Tap <b>Build</b> in the bottom bar.', sel: TAB('build'), done: (sim, ui) => tabIs(ui, 'build') || past(sim, ui) },
    { t: `Choose <b>${catName}</b>`, d: `In the Build panel, tap the <b>${catName}</b> category along the top. Swipe the category row sideways if you don't see it.`, sel: CAT(cat), done: (sim, ui) => catIs(ui, cat) || past(sim, ui) },
    { t: `Pick <b>${toolName}</b>`, d: `Tap the <b>${toolName}</b> card. The action bar opens at the bottom with the price.`, sel: TOOL(tool), done: past },
    ...extra,
    { placement: {tool, a:cell, b:end, f, axis, climate}, t: place, d: placeD + ' Follow the highlighted footprint from Start here to End here, or tap Use suggested placement. The preview turns <b>green</b> when valid, <b>amber</b> if it will build but can\'t earn yet, <b>red</b> if it can\'t go there - the action bar says why.', cell, f, done: (sim, ui) => placed(sim) || planOk(ui, tool) },
    ...review.map((st) => ({ placement: {tool, a:cell, b:end, f, axis, climate}, ...st })),
    { placement: {tool, a:cell, b:end, f, axis, climate}, t: 'Tap <b>Confirm</b>', d: 'Check the cost and "cash after" line in the action bar, then tap <b>Confirm</b>. You can undo within 30 minutes for a full refund.', sel: CONFIRM, done: placed },
  ];
  // A later build group only counts as progressing once the previous group is placed.
  return after ? steps.map((st) => ({ ...st, done: (sim, ui) => placed(sim) || (after(sim) && st.done(sim, ui)) })) : steps;
}
// Beat 5 (Asking rents): the UI records `pricingSeen` whenever Business -> Pricing is shown during the tutorial (read-only,
// like `businessOpened`), so Pricing opened earlier, e.g. during the money beat, counts. Guidance never touches rents.
const rentsShowing = (ui) => tabIs(ui, 'business') && ui.sectionChoice?.tab === 'business' && ui.sectionChoice?.label === 'Asking rents';
const pricingSeen = (sim) => !!sim.s.tut.flags.pricingSeen;
// Live figures for Beat 5's story: operating units, how many are leased, how many are vacant. Coach cards show the
// current step's text (not the beat body) on every screen, so the steps carry the short form as an {occupancy} token,
// filled in by tutorialText() when the card is built (step texts stay plain strings).
const occLine = (sim) => { const o = sim.occupancy(), vac = o.n - o.occ; return vac ? `<b>${o.occ} of ${o.n}</b> units are leased and <b>${vac}</b> ${vac === 1 ? 'is' : 'are'} vacant.` : `All <b>${o.n}</b> units are leased.`; };
const pricingStory = (sim) => `${occLine(sim)} Prospects keep asking about space. Before you decide Maple Street needs more units, check what new customers pay.`;
// Act II (campaign Unit 5). Beat 6 explains the build status and "cash after" once a green preview is showing (Got it).
// Beat 7 shows the failure as a queued job in Operate -> Jobs before it is assigned (at 4x a sent Owner finishes in about
// a real second, so the queue is shown first). The UI records `jobsSeen` (read-only, like `pricingSeen`); the card gives the
// job's length from the live job ({repairHours}). The existing tap-the-light, Send Owner and fix steps follow unchanged. Beat 8 explains every role and wage on a paused Got-it card after the hire; only the Porter is required.
const flag = (sim, f) => !!sim.s.tut.flags[f];
const jobsShowing = (ui) => tabIs(ui, 'operate') && ui.sectionChoice?.tab === 'operate' && ui.sectionChoice?.label === 'Work queue';
const fixed = (sim) => !!sim.s.milestones.first_repair;
const sent = (sim) => !!(repairTask(sim, hallLight(sim)) || {}).assigned;
const repairHours = (sim) => { const t = repairTask(sim, hallLight(sim)), h = t ? sim.taskHours(t) : null; return h ? `about <b>${h} game hour${h === 1 ? '' : 's'}</b>` : 'a short time'; };
const wage = (r) => { const w = ROLES[r].wage; return `$${w % 1 ? w.toFixed(2) : w}/day`; };
const porterHired = (sim) => sim.s.staff.some((x) => x.role === 'porter');
// The move-out Beat 8 authors arrives 20 game minutes after the beat starts; the act does not end with it still on the way.
const moveoutQueued = (sim) => { const u = unitByRole(sim, 'mapleInteriorMoveout'), L = u && u.lease && sim.s.leases[u.lease]; return !!L && sim.s.visits.some((v) => v.kind === 'moveout' && v.tenant === L.tenant); };
// Act III (campaign Unit 6) reuses real customer movement, complaint, overlay and climate systems.
const interiorTenant = (sim) => Object.values(sim.s.tenants).find((t) => { const L = sim.s.leases[t.lease], u = L && sim.s.objects[L.unit]; return u && u.access === 'interior'; });
const interiorUnitFor = (sim, tn = interiorTenant(sim)) => { const L = tn && sim.s.leases[tn.lease]; return L && sim.s.objects[L.unit]; };
const scheduleInteriorVisit = (sim, delay = 30) => { const tn = interiorTenant(sim), u = interiorUnitFor(sim, tn); if (tn && u) sim.schedule({ kind: 'bigaccess', tenant: tn.id, unit: u.id }, sim.s.t + delay); };
const feedbackShowing = (ui) => !!ui && ui.tab === 'feedback';
const darkFeedback = (sim) => { const at = sim.s.tut.enteredAt ?? -Infinity; return sim.s.thoughts.findLast ? sim.s.thoughts.findLast((t) => t.kind === 'bad' && t.text === 'The hallway is dark.' && t.t >= at) : [...sim.s.thoughts].reverse().find((t) => t.kind === 'bad' && t.text === 'The hallway is dark.' && t.t >= at); };
const feedbackSat = (sim) => { const tn = interiorTenant(sim); return tn ? `${Math.round((tn.sat ?? 0) * 100)}%` : 'not available'; };
const tutBuiltEver = (sim, tools) => (sim.s.tut.built || []).some((b) => tools.includes(b.tool));
const securityImproved = (sim) => tutBuiltEver(sim, ['camera', 'light']);
const securityArmed = (ui) => !!ui && (ui.tool === 'camera' || ui.tool === 'light');
const securityImprovementDone = (sim) => { const ids = (sim.s.tut.built || []).filter((b) => ['camera', 'light'].includes(b.tool)).map((b) => b.id); return ids.length > 0 && !sim.s.orders.some((o) => ids.includes(o.id) && o.st === 'construction'); };
const hvacPresent = (sim) => sim.objs('hvac').some((o) => o.cstate === 'operating') || (sim.s.tut.built || []).some((b) => b.tool === 'hvac');
const westLightPresent = (sim) => sim.objs('light').some((o) => (o.f || 0) === 0 && o.x === 17 && o.y === 8 && o.cstate === 'operating') || (sim.s.tut.built || []).some((b) => b.tool === 'light' && b.f === 0 && b.id >= (sim.s.tut.act3Mark || 0));
const climatePresent = (sim) => sim.objs('unit').some((u) => u.env === 'climate') || (sim.s.tut.built || []).some((b) => b.tool === 'iu5x5');
const climateDemandLine = (sim) => { const n = sim.lostRecent(14).noClimate || 0; return n > 0 ? `<b>${n}</b> shopper${n === 1 ? '' : 's'} left in the last 14 days because climate control was unavailable.` : 'Some shoppers specifically ask for climate control. Maple Street does not serve that demand yet.'; };
// Climate units need the HVAC Plant and light ordered in this beat/lesson to be finished first. While one is still under
// construction the units steps show the existing 'ordered' prerequisite wait (UI.resolveStep) in climate wording, ringed on 4x,
// instead of a drag that can only preview amber while the placement review holds time. Read-only; null once nothing is pending.
const climateWait = (placed) => (sim) => {
  if (placed(sim)) return null;
  const mark = ctx(sim).idMark || 0, pending = [...sim.objs('hvac'), ...sim.objs('light')].filter((o) => o.id >= mark && o.cstate === 'construction');
  if (!pending.length) return null;
  const names = ['hvac', 'light'].filter((k) => pending.some((o) => o.type === k)).map((k) => k === 'hvac' ? 'HVAC Plant' : 'light'), both = names.length > 1;
  return { state: 'ordered', t: `Let the ${names.join(' and ')} finish`, d: `Climate units need a <b>finished</b> HVAC Plant and a <b>working</b> corridor light. ${both ? 'The HVAC Plant and light are' : `The ${names[0]} is`} still under construction. Tap <b>4x</b> to run time. This step continues by itself when ${both ? 'they are' : 'it is'} built.` };
};
const waitBuild = (label, doneFn) => ({ t: label || 'Let construction finish', d: 'Construction takes game hours. Tap <b>4x</b> at the top to speed up. A progress ring shows over the site.', sel: FAST, done: doneFn });
// Act IV Beat 13 (campaign Unit 7a): one connected upstairs unit on the existing interior building. The player orders the
// Go Vertical package (structure only, or the full copy if they choose and can pay), then places one F2 hallway, light
// and unit. Completion is objective: any working, accessible, rent-ready upstairs unit, however it was built. Read-only
// helpers; every money figure is read live from the current quote and position (nothing here is a fixed price).
const interiorShell = (sim) => sim.objs('shell').filter((o) => o.cstate === 'operating' && (o.floors || 1) < 2).sort((a, b) => a.id - b.id)[0] || sim.objs('shell').sort((a, b) => a.id - b.id)[0] || null;
const verticalOrder = (sim) => sim.s.orders.find((o) => o.vertical && o.st === 'construction');
const upstairsUnits = (sim) => sim.objs('unit').filter((u) => (u.f || 0) >= 1);
export const upstairsReady = (sim) => upstairsUnits(sim).some((u) => u.cstate === 'operating' && !u.blocked && !(u.missing && u.missing.length) && (u.commercial === 'ready' || !!u.lease));
const upperFloorDone = (sim) => !verticalOrder(sim) && sim.objs('shell').some((o) => (o.floors || 1) >= 2) && sim.objs('elevator').some((e) => e.cstate === 'operating');
const verticalStarted = (sim) => !!verticalOrder(sim) || upperFloorDone(sim) || upstairsUnits(sim).length > 0;
const hallF2 = (sim) => { const h = sim.s.hall && sim.s.hall[1]; if (!h) return 'missing'; let ordered = false; for (const v of h) { if (v === 1) return 'built'; if (v) ordered = true; } return ordered ? 'ordered' : 'missing'; };
const lightF2 = (sim) => sim.objs('light').some((l) => (l.f || 0) >= 1);
const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
// The structure-only quote for the next floor of the interior building, or null once that floor exists or cannot be quoted.
const verticalQuote = (sim) => { const sh = interiorShell(sim); if (!sh || (sh.floors || 1) >= 2 || verticalStarted(sim)) return null; const q = sim.verticalPlan(sh.id, { fitout: false }); return q && q.ok ? q : null; };
const minFitout = () => 2 * TOOLS.hall.costPerCell + TOOLS.light.cost + TOOLS.iu5x10.cost; // two hallway cells, one light, one Interior 5x10, from the price list
const verticalShort = (sim) => { const q = verticalQuote(sim); return q ? Math.max(0, q.cost + minFitout() - sim.financialPosition().available) : 0; };
const verticalMoneyLine = (sim) => {
  const q = verticalQuote(sim); if (!q) return '';
  const av = sim.financialPosition().available, gap = verticalShort(sim);
  return ` <b>Structure only:</b> ${usd(q.cost)} for reinforcement, the second floor and the freight elevator. One hallway, light and unit add about ${usd(minFitout())}. Available after bills and reserve: <b>${usd(av)}</b>.` +
    (gap > 0 ? ` That is <b>${usd(gap)}</b> short. Let time run: rent comes in and this quote stays current. You do not need to borrow for this beat.` : '');
};
// Rendered step text (U7a-r1): beat bodies are not shown on phone cards, so the live figures ride in the step titles.
// Empty once the floor is ordered or built. Every figure is the current quote and position.
const verticalMoneyTag = (sim) => {
  const q = verticalQuote(sim); if (!q) return '';
  const gap = verticalShort(sim);
  return ` <span class="tut-money" data-qa="tut-vertical-money">Structure only <b>${usd(q.cost)}</b> · one unit about <b>${usd(minFitout())}</b> · available <b>${usd(sim.financialPosition().available)}</b>${gap > 0 ? ` · <b>${usd(gap)} short</b>` : ''}</span>`;
};
// Act IV Beat 14 (campaign Unit 7b): one real account falls behind, the approved S2 "returned payment". A current lease
// whose most recent bill was actually collected (its ledger line, exact amount, at nextBill - 30) at least 15 days ago
// has that one payment returned through the normal money path, and the lease takes exactly the state billLease would
// have produced had that bill been missed. Nothing is invented: the reversal nets the collected bill to $0 and only the
// rent the tenant really owes can be collected later. No RNG draw, no policy change; once per tutorial (guarded by flag).
const dayAt = (t) => Math.floor(t / 1440) + 1;
const RETURNED = 'Returned payment - Unit ';
export function act4Eligible(sim) {
  const s = sim.s, day = sim.day, roles = new Set(Object.values(s.unitRoles || {}));
  const lastRent = (L, num) => { const note = `Rent - Unit ${num}`; for (let i = s.ledger.length - 1; i >= 0; i--) { const x = s.ledger[i]; if (x.cat === 'rent' && x.note === note) return x; } return null; };
  const out = [];
  for (const L of Object.values(s.leases)) {
    const u = s.objects[L.unit]; if (!u || L.status !== 'current' || roles.has(L.unit)) continue;
    const x = lastRent(L, u.num); if (!x) continue;
    const bill = dayAt(x.t); // the verified prior payment: this lease's latest bill, collected in full
    if (bill !== L.nextBill - BILLING_CYCLE_DAYS || bill < L.start || Math.abs(x.amt - L.rent) >= 0.005 || day - bill < 15) continue;
    out.push({ L, u, bill });
  }
  return out.sort((a, b) => a.bill - b.bill || a.u.num - b.u.num);
}
export function authorAct4Account(sim) {
  const s = sim.s, f = s.tut.flags; if (f.act4Account != null) return { ok: false, dup: true };
  const pick = act4Eligible(sim)[0]; if (!pick) return { ok: false, none: true }; // wait for a genuine account; never fabricate one
  const { L, u, bill } = pick, late = sim.day - bill, pol = s.policies;
  sim.money(-L.rent, 'rent', RETURNED + u.num);
  L.status = 'pastdue'; L.balance = L.rent; L.fees = 0; L.dueSince = bill; L.feeDone = false; // as billLease on a missed bill
  if (late >= 5 && pol.lateFee > 0) { L.feeDone = true; L.fees = pol.lateFee; } // the fee billLease adds at 5 days
  if (late >= 15) { L.status = 'delinquent'; if (pol.overlock) { u.overlock = true; sim.emit('overlock', { unit: u.id, x: u.x, y: u.y, f: u.f || 0 }); } }
  f.act4Account = L.id;
  sim.emit('pastdue', { unit: u.id });
  return { ok: true, lease: L.id, unit: u.num, bill, late };
}
const act4Authored = (sim) => sim.s.tut.flags.act4Account != null;
// Beat 14 completes only after the player has actually looked at Collections with the authored account on the books: the UI
// sets act4Seen (persistent, read-only) when the ladder is on screen during Beat 14. Early payment does not skip the inspection.
const act4Seen = (sim) => act4Authored(sim) && !!sim.s.tut.flags.act4Seen;
// Live story of that account for the rendered step text (beat bodies are not shown on phone cards).
const act4Line = (sim) => {
  const s = sim.s, id = s.tut.flags.act4Account; if (id == null) return '';
  const r = [...s.ledger].reverse().find((x) => x.note && x.note.startsWith(RETURNED));
  const num = r ? r.note.slice(RETURNED.length) : null, who = num ? `Unit ${num}` : 'One tenant', L = s.leases[id];
  const head = r ? `${who}’s ${usd(-r.amt)} rent payment came back on Day ${dayAt(r.t)}.` : `${who}’s rent payment came back.`;
  const now = !L ? 'The account has since closed.' : L.status === 'current' ? 'The tenant has since paid in full; the account is current.'
    : `Now <b>${sim.stageOf(L)}</b>, <b>${usd(sim.owed(L))}</b> owed${s.objects[L.unit]?.overlock ? ', locked out' : ''}.`;
  return ` <span class="tut-money" data-qa="tut-act4-account">${head} ${now}</span>`;
};
// Act IV Beat 15 (campaign Unit 7c, D3 Option 2, P1 inspection-only): a read-only financing review of the real, unbuilt
// upper-floor route. Every figure is computed from the current state; nothing here orders, charges, borrows or saves.
// The term-loan figures come from a disposable copy with the tutorial loan lock lifted on the copy only.
const quoteCache = new WeakMap();
const routeQuote = (sim) => { const k = `${sim.s.structV}:${sim.s.nextId}`, o = quoteCache.get(sim); if (o?.k === k) return o.q; const q = upRouteQuote(sim); quoteCache.set(sim, { k, q }); return q; };
export function financingReview(sim) {
  const s = sim.s, q = routeQuote(sim), now = sim.financialPosition(), roll = cents(sim.rentRoll());
  if (!q.ok) return { ok: false, reason: q.reason, now, roll };
  const ctx = { spend: q.total, extraDaily: q.dailyCost }, after = sim.financialPosition(ctx), gap = Math.max(0, cents(-after.available));
  const room = Math.max(0, Math.floor(sim.creditLimit() - s.loan.bal)), needed = creditNeeded(sim, ctx);
  const credit = { limit: sim.creditLimit(), owed: cents(s.loan.bal), room, needed, projection: needed ? creditProjection(sim, needed, ctx) : null };
  const c = new sim.constructor(JSON.parse(JSON.stringify(s))); c.ensure(); c.s.tut.done = true; c.s.tut.on = false;
  const { rate, months } = c.loanTerms(), limit = c.loanLimit(), amount = gap > 0 ? Math.max(5000, Math.ceil(gap / 5000) * 5000) : 0;
  const loan = { lockedHere: sim.loanLimit() === 0, limit, rate, months, amount, approved: amount > 0 && amount <= limit };
  if (amount) {
    loan.pmt = c.loanPmt(amount, rate, months); loan.share = roll ? loan.pmt / roll : null; loan.totalPaid = cents(loan.pmt * months); loan.interest = cents(loan.totalPaid - amount);
    if (loan.approved && c.dispatch({ type: 'borrow', amt: amount }).ok) loan.after = c.financialPosition(ctx); // the copy only
  }
  const ev = investmentEvidence(sim, { creates: q.units.map((u) => ({ type: 'unit', size: u.size, env: u.env })) });
  return { ok: true, q, now, after, gap, credit, loan, roll, demand: { evidence: ev, text: demandEvidenceText(ev) }, saving: outlook(sim) };
}
const finSeen = (sim) => !!sim.s.tut.flags.finSeen;
const finLine = (sim) => { const R = financingReview(sim); if (!R.ok) return ''; return ` <span class="tut-money" data-qa="tut-fin-money">Upper-floor route ${usd(R.q.total)} · available ${usd(R.now.available)}${R.gap ? ` · ${usd(R.gap)} short` : ''}</span>`; };

const hallWait = (placed) => (sim) => placed(sim) || hallF2(sim) !== 'ordered' ? null : { state: 'ordered', t: 'Let the F2 hallway finish', d: 'The upstairs hallway is still under construction. Lights and unit doors need a <b>finished</b> hallway. Tap <b>4x</b> to run time; this step continues by itself.' };

// Generic chapter break: a paused card with a deliberate Continue. Continue (flag = id) releases the owner reviews held
// during the act; the break completes, and the next act's first beat enters, only once none of them is still waiting.
function chapterBreak({ id, ...rest }) {
  const go = (sim) => !!sim.s.tut.flags[id];
  return { id, ...rest, pause: true, brk: true, flag: id, button: 'Continue', buttonWhen: (sim) => !go(sim),
    steps: [
      { t: 'Tap <b>Continue</b> when you\'re ready', d: 'Time stays paused. You can stop here and come back later. The next act starts after you continue.', sel: '.tut [data-a="tutNext"]', lbl: 'Continue', done: go },
      { t: 'Answer the waiting owner requests', d: 'Requests that waited during this act appear now, one at a time. Time stays paused. The next act starts once they are answered.', sel: '[data-a="requests"]', lbl: 'Requests', done: (sim) => go(sim) && sim.releasedPending() === 0 },
    ],
    check: (sim) => go(sim) && sim.releasedPending() === 0 };
}

export const BEATS = [
  // Act I "Take Over" (campaign Unit 4): beats 1-5, then the Act I chapter break.
  { id: 'welcome', act: 'I', chapter: 'Take Over', title: 'Welcome to Maple Street Storage',
    body: 'You own a small, working self-storage property. Most units are rented. Time is <b>paused</b> until you start the clock, so explore freely. The clock controls are at the top left: <b>Pause</b>, <b>1x</b>, <b>2x</b> and <b>4x</b>.',
    why: 'Everything on the map is real: customers drive in, open doors, use carts and pay rent. Each tutorial step tells you exactly where to tap.',
    steps: [
      { t: 'Look around the property', d: '<b>Drag</b> to pan (two fingers on a phone). <b>Pinch</b> to zoom. The curved arrows rotate the view. On the right-hand rail, <b>EXT</b> shows the roofs and <b>F1</b> looks inside a building.', done: (sim, ui) => ui && ui.tutLooked },
      { t: 'The clock (top left) is <b>paused</b>. Tap <b>Look around</b> when ready', d: 'Time stays paused until you start it. The clock controls are at the top left: <b>Pause</b>, <b>1x</b>, <b>2x</b> and <b>4x</b>. Then tap the yellow button below.', sel: '.tut [data-a="tutNext"]', done: (sim) => sim.s.tut.flags.welcome },
    ],
    button: 'Look around', check: (sim) => sim.s.tut.flags.welcome },
  { id: 'makeready', act: 'I', chapter: 'Take Over', title: 'Turn over Unit 107',
    body: 'A tenant moved out of Unit 107. It must be cleaned and checked (a <b>make-ready</b>) before it can rent again.',
    why: 'Vacant units earn nothing until they are rent-ready. Make-ready is the most common job on a storage property.',
    focus: (sim) => ({ obj: unitByRole(sim, 'mapleTurnover').id }),
    steps: [
      { t: 'Tap <b>Unit 107</b>', d: 'It\'s on the drive-up row on the left, under the amber broom pin (the ring points at it). Tap the unit itself.', obj: (sim) => unitByRole(sim, 'mapleTurnover').id, done: (sim, ui) => (ui && ui.sel === unitByRole(sim, 'mapleTurnover').id) || !!(sim.s.tasks.find((t) => t.type === 'makeready' && t.obj === unitByRole(sim, 'mapleTurnover').id) || {}).assigned || unitByRole(sim, 'mapleTurnover').commercial === 'ready' },
      { t: 'Tap <b>Owner Make-Ready</b>', d: 'In the unit panel that opened, tap the <b>Owner Make-Ready</b> button at the top. The Owner (you) walks over to do the job.', sel: `[data-cmd*='"ownerMakeReady"']`, done: (sim) => !!(sim.s.tasks.find((t) => t.type === 'makeready' && t.obj === unitByRole(sim, 'mapleTurnover').id) || {}).assigned || unitByRole(sim, 'mapleTurnover').commercial === 'ready' },
      { t: 'Start the clock: tap <b>1x</b>', d: 'At <b>1x</b>, a day takes <b>24 real seconds</b>; <b>2x</b> takes 12 seconds and <b>4x</b> takes 6. Tap <b>Pause</b> whenever you want to inspect or plan.', sel: PLAY, done: (sim) => running(sim) || unitByRole(sim, 'mapleTurnover').commercial === 'ready' },
      { t: 'Watch the Owner finish', d: 'The Owner walks from the office to Unit 107. The pin fills as work progresses (about 2-3 game hours). Use <b>4x</b> to hurry.', obj: (sim) => unitByRole(sim, 'mapleTurnover').id, done: (sim) => unitByRole(sim, 'mapleTurnover').commercial === 'ready' || !!unitByRole(sim, 'mapleTurnover').lease },
    ],
    check: (sim) => unitByRole(sim, 'mapleTurnover').commercial === 'ready' || !!unitByRole(sim, 'mapleTurnover').lease },
  { id: 'lease', act: 'I', chapter: 'Take Over', title: 'Rent-ready units can lease',
    body: 'Unit 107 is on the market. A prospect is driving over to the office to rent it.',
    why: 'Prospects compare your asking rent with the market. Price higher and fewer sign; price lower and you fill faster but earn less.',
    enter: (sim) => { const t = sim.s.t; const m = t % 1440; const at = m < 8.5 * 60 ? t - m + 8.5 * 60 : m > 17 * 60 ? t - m + 1440 + 8.5 * 60 : t + 45; sim.schedule({ kind: 'prospect', size: '5x10', climate: false, keen: true }, at); },
    steps: [
      { t: 'Keep time running', d: 'If paused, tap <b>1x</b> or faster. The office opens at 8:30 AM.', sel: PLAY, done: (sim) => running(sim) || sim.s.agents.some((a) => a.kind === 'cust' && a.vt === 'prospect') || !!sim.s.milestones.first_lease_after_turnover },
      { t: 'Watch for the prospect', d: 'A car enters through the gate at the bottom, parks by the <b>Office</b> (lower left) and the customer walks inside.', done: (sim) => sim.s.agents.some((a) => a.kind === 'cust' && a.vt === 'prospect') || !!sim.s.milestones.first_lease_after_turnover },
      { t: 'They sign a lease', d: 'At the counter they pick a unit. A green <b>+$/mo</b> pop shows the new rent, and the feed on the right logs the lease.', done: (sim) => !!sim.s.milestones.first_lease_after_turnover },
    ],
    check: (sim) => !!sim.s.milestones.first_lease_after_turnover },
  { id: 'money', act: 'I', chapter: 'Take Over', title: 'Money without a spreadsheet',
    body: 'Your first new lease is signed. Here\'s where to see how the business is doing.',
    why: 'Rent bills <b>monthly</b> on each lease\'s anniversary, while operating costs accrue <b>daily at 7:00 AM</b> and settle weekly. A quiet week can look negative while the business is healthy - watch the <b>rent roll</b> and <b>occupancy</b>.',
    focus: () => ({ tab: 'business' }),
    steps: [
      { t: 'Open <b>Business</b>', d: 'Tap <b>Business</b> in the bottom bar (the bar-chart icon).', sel: TAB('business'), done: (sim, ui) => sim.s.tut.flags.businessOpened },
      { t: 'Read the cards, then tap <b>Got it</b>', d: '<b>Rent roll</b> is monthly rent from all leases. <b>Occupancy</b> is the share of units leased. Choose <b>Statement</b> in the section selector for the last 30 days: rent in, costs out. Tap <b>Got it</b> on this card when done.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => sim.s.tut.flags.moneyAck },
    ],
    button: 'Got it', buttonWhen: (sim) => sim.s.tut.flags.businessOpened, flag: 'moneyAck',
    check: (sim) => sim.s.tut.flags.businessOpened && sim.s.tut.flags.moneyAck },
  // Beat 5: read-only Asking rents comprehension. No rent change is asked for or made; Got it needs Pricing seen.
  { id: 'pricing', act: 'I', chapter: 'Take Over', title: 'What should new tenants pay?',
    body: pricingStory,
    why: 'Asking rent is what a <b>new lease</b> pays. Price higher and fewer prospects sign; price lower and units fill faster but earn less each month. Signed leases keep their rent.',
    steps: [
      { t: 'Open <b>Business</b>', d: '{occupancy} Before you add units, check what new tenants pay. Tap <b>Business</b> in the bottom bar.', sel: TAB('business'), done: (sim, ui) => tabIs(ui, 'business') || pricingSeen(sim) },
      { t: 'Choose <b>Pricing</b>', d: '{occupancy} Before you add units, check what new tenants pay. In the Business panel, open the section selector at the top and choose <b>Pricing</b>. It shows your <b>Asking rents</b>.', sel: '.sheet [data-section-picker]', section: ['business', 'Asking rents', 'Pricing'], lbl: 'Choose Pricing', done: (sim, ui) => rentsShowing(ui) || pricingSeen(sim) },
      { t: 'Asking rents apply to <b>future leases</b>', d: 'Each row is a unit size with your asking rent, the market rent and how many are vacant. Changing an asking rent only affects <b>leases signed after the change</b>. Tenants with signed leases keep their current rent. You don\'t need to change anything now. Tap <b>Got it</b> on this card when you\'re ready.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => sim.s.tut.flags.pricingAck },
    ],
    button: 'Got it', buttonWhen: pricingSeen, flag: 'pricingAck',
    check: (sim) => pricingSeen(sim) && !!sim.s.tut.flags.pricingAck },
  // Act I chapter break: paused, nothing authored pending. Continue releases held owner reviews (still paused); the next
  // act's first beat enters only after they are answered (or retired as stale).
  chapterBreak({ id: 'actI_break', act: 'I', chapter: 'Take Over', next: 'Act II · Stabilize', title: 'You have control of Maple Street',
    body: 'The basics are working: units turn over, prospects sign leases, and rent comes in every month. <b>Maple Street is paused.</b> This is a good place to stop. Next, in <b>Act II · Stabilize</b>, demand keeps growing and you learn to grow without losing control of operations.',
    why: 'What you learned in Act I: a vacant unit needs a make-ready before it can lease; work takes game time; <b>Pause</b> and the speeds run the clock; prospects become tenants by signing leases; leases bring in rent every month; cash alone doesn\'t show how the business is doing; and asking rents set what <b>future</b> leases pay.' }),
  // Act II "Stabilize" (campaign Unit 5): beats 6-8, then the Act II chapter break.
  { id: 'expand', act: 'II', chapter: 'Stabilize', title: 'Maple Street is full',
    body: 'Every unit is leased and prospects are still asking. Build a new row of drive-up units on the empty grass east of the main aisle.',
    why: 'Expansion is a <b>capital decision</b>: build when demand is proven, not before. Drive-up units are cheap and simple: they only need a <b>drive aisle</b> in front of their doors. Construction takes cash now and game time to finish. Eligible units open for rental automatically when construction finishes.',
    focus: () => ({ tool: 'du10x10', cell: { x: 13, y: 22 } }),
    steps: (() => {
      const placed = (sim) => ordered(sim, 'du10x10');
      const steps = buildSteps({ cat: 'units', catName: 'Units', tool: 'du10x10', toolName: 'Drive-Up 10x10', cell: { x: 13, y: 21 }, end: { x: 13, y: 28 }, axis: 'y', placed,
        place: '<b>Drag</b> a row down the grass beside the main aisle', placeD: 'Press on the grass touching the east edge of the main aisle, just below the cross aisle, and drag straight down about 8 cells. Doors must face the aisle - tap <b>Rotate</b> if they don\'t.' });
      // One added step between a green preview and Confirm: what the status colours and the "cash after" line mean.
      // Phones hide step details while the build review is open, so the title carries the colours and the cash line.
      const status = { placement: steps[steps.length - 1].placement, cell: steps[steps.length - 1].cell, f: 0, t: '<b>Green</b>: ready to build. <b>Amber</b>: can\'t earn yet. <b>Red</b>: can\'t go there. Check <b>cash after</b>', d: '<b>Green</b>: it can be built and can earn. <b>Amber</b>: it can be built but can\'t earn yet (for example, the doors don\'t reach an aisle). <b>Red</b>: it can\'t go there; the action bar says why. The action bar also shows the <b>cost</b> and your <b>cash after</b> construction, so you see what this row leaves in the bank. Tap <b>Got it</b> on this card.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', compactReview: true, done: (sim) => placed(sim) || flag(sim, 'buildStatusAck') };
      return [...steps.slice(0, -1), status, steps[steps.length - 1]];
    })().concat([waitBuild('Let construction finish and the units open', (sim) => !!sim.s.milestones.first_expansion)]),
    button: 'Got it', flag: 'buildStatusAck', buttonWhen: (sim, ui) => !flag(sim, 'buildStatusAck') && !ordered(sim, 'du10x10') && planOk(ui, 'du10x10'),
    check: (sim) => !!sim.s.milestones.first_expansion },
  { id: 'repair', act: 'II', chapter: 'Stabilize', title: 'A hallway light has failed',
    body: 'The main hallway in the interior building just went dark. Dark hallways feel unsafe and customers notice.',
    why: 'Equipment wears out over time. Each failure becomes a <b>job</b> in the work queue (<b>Operate &rarr; Jobs</b>), with the hours of work it needs. The Owner does one job at a time and fixes simple things; a Tech or vendor handles the rest.',
    enter: (sim) => { const L = hallLight(sim); if (L) { sim.wear(L, L.cond - 0.1); sim.ensureRepairTask(L); sim.markDirty(); } },
    // Ring only: entering this beat never moves the camera or changes the floor view, so the F1 step is a real tap.
    focus: (sim) => { const L = hallLight(sim); return { obj: L && L.id }; }, keepCamera: true,
    steps: [
      { t: 'Look inside: tap <b>F1</b>', d: 'On the right-hand rail, <b>EXT</b> shows roofs; <b>F1</b> lifts the roof so you see inside floor 1.', sel: '#floors [data-v="0"]', done: (sim, ui) => (ui && ui.rend && ui.rend.view === 0) || sent(sim) || fixed(sim) },
      // The failure is already a job: look at it in the queue first (time is paused while the panel is open), then assign it.
      { t: 'Open <b>Operate</b> to see the job', d: 'The broken light is now a job in the work queue. Tap <b>Operate</b> in the bottom bar (the person icon).', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || flag(sim, 'jobsSeen') || sent(sim) || fixed(sim) },
      { t: 'Choose <b>Jobs</b>', d: 'In the Operate panel, open the section selector at the top and choose <b>Jobs</b>. It lists every job waiting or in progress.', sel: '.sheet [data-section-picker]', section: ['operate', 'Work queue', 'Jobs'], lbl: 'Choose Jobs', done: (sim, ui) => jobsShowing(ui) || flag(sim, 'jobsSeen') || sent(sim) || fixed(sim) },
      { t: 'Jobs wait in a <b>queue</b>', d: 'Each job shows who has it and the hours of work it needs. <b>Repair Light</b> needs {repairHours} of on-site work, plus walking time, and nobody has it yet. The Owner does one job at a time; anything else waits its turn. Tap <b>Got it</b> on this card.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => flag(sim, 'jobsAck') || sent(sim) || fixed(sim) },
      { t: 'Tap <b>Back to map</b>', d: 'Time stays paused while the panel is expanded. Tap <b>Back to map</b> at the top of the panel to see the hallway again.', sel: '.sheet [data-a="sheetGrow"][aria-expanded="true"]', lbl: 'Back to map', done: (sim, ui) => !(ui && ui.sheetTall && ui.tab) || (ui && hallLight(sim) && ui.sel === hallLight(sim).id) || sent(sim) || fixed(sim) },
      { t: 'Tap the broken <b>light</b>', d: 'It\'s in the middle of the main hallway, under the orange wrench pin (the ring marks it).', clearMapTap: true, obj: (sim) => hallLight(sim) && hallLight(sim).id, done: (sim, ui) => (ui && hallLight(sim) && ui.sel === hallLight(sim).id) || sent(sim) || fixed(sim) },
      { t: 'Tap <b>Send Owner</b>', d: 'In the light\'s panel, tap <b>Send Owner</b>. If the Owner is busy, the job waits its turn.', sel: `[data-cmd*='"ownerTask"']`, done: (sim) => sent(sim) || fixed(sim) },
      { t: 'Let the Owner fix it', d: 'Keep time running. The Owner walks in through the wide door and repairs the light (sparks when done). The job leaves the queue when it\'s finished.', sel: PLAY, run: true, done: fixed },
    ],
    button: 'Got it', flag: 'jobsAck', buttonWhen: (sim) => flag(sim, 'jobsSeen') && !flag(sim, 'jobsAck') && !sent(sim) && !fixed(sim),
    check: (sim) => !!sim.s.milestones.first_repair },
  { id: 'hire', act: 'II', chapter: 'Stabilize', title: 'The Owner is the bottleneck',
    body: 'Unit 203 just moved out and the loading area is dirty. Two jobs, and the Owner can only do one at a time.',
    why: `<b>Hiring adds service capacity at an ongoing cost.</b> Each role has a daily wage and its own work: a <b>Porter</b> (${wage('porter')}) cleans and turns over units; a <b>Tech</b> (${wage('tech')}) repairs equipment; a <b>Clerk</b> (${wage('clerk')}) runs the office counter; a <b>Manager</b> (${wage('manager')}) handles routine decisions. Only the Porter is needed now.`,
    enter: (sim) => { const u = unitByRole(sim, 'mapleInteriorMoveout'); if (u && u.lease) { const L = sim.s.leases[u.lease]; const tn = sim.s.tenants[L.tenant]; tn.leaving = true; sim.schedule({ kind: 'moveout', tenant: tn.id, unit: u.id }, sim.s.t + 20); } for (let x = 18; x <= 21; x++) sim.s.dirt[0][15 * sim.s.W + x] = 0.7; },
    focus: () => ({ tab: 'operate' }),
    steps: [
      { t: 'Open <b>Operate</b>', d: 'Tap <b>Operate</b> in the bottom bar (the person icon; the red badge counts waiting jobs).', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || sim.s.staff.some((x) => x.role === 'porter') },
      { t: 'Tap <b>Hire Porter</b>', d: 'In the Operate panel, choose <b>Hire</b> in the section selector at the top, then tap <b>Hire Porter</b>. The button shows the daily wage.', sel: `[data-cmd*='"role":"porter"']`, done: (sim) => sim.s.staff.some((x) => x.role === 'porter') },
      // Explained, never required: read while the Hire list (with every role and wage) is still open and time is paused.
      { t: `Other roles: <b>Tech</b> ${wage('tech')}, <b>Clerk</b> ${wage('clerk')}, <b>Manager</b> ${wage('manager')}`, d: `Each role adds a different kind of capacity for its daily wage: a <b>Tech</b> repairs equipment, a <b>Clerk</b> runs the office counter and a <b>Manager</b> handles routine decisions. They are listed under the Porter. You don't need them now. Tap <b>Got it</b> on this card.`, sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => flag(sim, 'rolesAck') || !!sim.s.milestones.first_delegated },
      { t: 'Watch the Porter work', d: 'Keep time running. The Porter walks out of the office and picks up the cleaning or the make-ready on their own.', sel: PLAY, run: true, done: (sim) => !!sim.s.milestones.first_delegated },
    ],
    button: 'Got it', flag: 'rolesAck', buttonWhen: (sim) => porterHired(sim) && !flag(sim, 'rolesAck') && !sim.s.milestones.first_delegated,
    // A Porter already on staff counts once delegated work happens (never fire and re-hire). The act ends after the authored move-out arrives.
    check: (sim) => !!sim.s.milestones.first_delegated && !moveoutQueued(sim) },
  // Act II chapter break: paused; Continue releases owner reviews held during Act II, then Act III begins.
  chapterBreak({ id: 'actII_break', act: 'II', chapter: 'Stabilize', next: 'Act III · Improve', title: 'Maple Street is stable again', progress: actIIProgress,
    body: 'The new row is open, the hallway light works and a Porter shares the work with you. <b>Maple Street is paused.</b> This is a good place to stop. Next, in <b>Act III · Improve</b>, you follow a customer through the property, read real feedback and use diagnostic overlays before investing again.',
    why: 'What you learned in Act II: expansion solves a capacity problem; construction costs cash now and takes time; equipment needs maintenance; the Owner can only do so much each day; staff add capacity for a daily wage; and each role does different work.' }),

  // Act III "Improve" (campaign Unit 6): diagnose the customer experience, then improve what the evidence shows.
  { id: 'interior_customer', act: 'III', chapter: 'Improve', title: 'Follow an interior customer',
    body: 'Drive-up customers stop at their doors. Interior customers use the loading area, grab a cart and carry their things through the building.',
    why: 'The physical route matters: <b>vehicle → loading stall → cart → wide door → hallway → unit</b>. If that chain is awkward, customers feel it even when every unit is rentable.',
    enter: (sim) => { sim.s.tut.act3Mark ||= sim.s.nextId; scheduleInteriorVisit(sim, 30); },
    steps: [
      { t: 'Inspect the <b>Main Loading Corral</b>', d: 'Tap the cart corral below the interior building. Its panel shows how many carts are available and their condition.', obj: (sim) => sim.objs('corral')[0] && sim.objs('corral')[0].id, done: (sim) => flag(sim, 'corralInspected') },
      { t: 'Close the panel and watch the route', d: 'A tenant is on the way. Keep time running and watch the path from parking to cart to the wide door and the interior unit.', sel: PLAY, run: true, done: (sim) => !!sim.s.milestones.first_cart_trip },
    ],
    check: (sim) => flag(sim, 'corralInspected') && !!sim.s.milestones.first_cart_trip },

  { id: 'feedback', act: 'III', chapter: 'Improve', title: 'Customers tell you what the map cannot',
    body: 'A real customer experience has exposed a service problem. Read the report before deciding what to spend.',
    why: 'Customer feedback records what happened at that moment. <b>Satisfaction</b> is the broader result of repeated access, convenience, cleanliness, security, climate, service and value experiences.',
    enter: (sim) => {
      const L = hallLight(sim);
      // Author the condition, not the complaint: the normal visitor path must create the dark-hall report itself.
      if (L && sim.works(L)) { sim.wear(L, Math.max(0, L.cond - 0.19)); sim.ensureRepairTask(L); }
      scheduleInteriorVisit(sim, 30);
    },
    steps: [
      { t: 'Let the customer experience the property', d: 'Keep time running. The report is created only if the normal customer path actually encounters the problem.', sel: PLAY, run: true, done: darkFeedback },
      { t: 'Open <b>Operate</b>', d: 'Open <b>Operate</b>, then choose <b>Customer feedback</b>.', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || feedbackShowing(ui) },
      { t: 'Open <b>Customer feedback</b>', d: 'Tap <b>Customer feedback</b>. The report describes what happened, why it mattered and what to check next.', sel: '[data-a="feedback"]', done: (sim, ui) => feedbackShowing(ui) },
      { t: 'Read the complaint and the satisfaction dimension', d: 'The report is from the real visit you just watched. This interior tenant is currently at <b>{feedbackSat}</b> satisfaction. Read the complaint before you improve the property, then tap <b>Got it</b>.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => flag(sim, 'feedbackAck') },
    ],
    button: 'Got it', flag: 'feedbackAck', buttonWhen: (sim, ui) => !!darkFeedback(sim) && feedbackShowing(ui) && !flag(sim, 'feedbackAck'),
    check: (sim) => !!darkFeedback(sim) && flag(sim, 'feedbackAck') },

  { id: 'overlays', act: 'III', chapter: 'Improve', title: 'Diagnose before you build',
    body: 'One complaint is useful. An overlay shows whether the same problem exists elsewhere across the property.',
    why: 'The <b>Security</b> overlay combines lighting and camera coverage. Red crosses are dark and unwatched; stripes or dots show partial coverage; an unmarked area has both.',
    ownsRequest: (sim, c) => c && c.key === 'secrisk',
    steps: [
      { t: 'Open <b>Operate</b>', d: 'Open Operate and choose <b>Overlays</b>.', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || flag(sim, 'securityOverlaySeen') },
      { t: 'Turn on the <b>Security</b> overlay', d: 'Use <b>Overlays → Security</b>. Look for red crosses, stripes and dots rather than guessing where coverage is weak.', sel: '[data-a="overlay"][data-v="security"]', done: (sim, ui) => (ui && ui.rend && ui.rend.overlay === 'security') || flag(sim, 'securityOverlaySeen') },
      { t: 'Tap <b>Back to map</b>', d: 'Time stays paused while the panel is expanded. Tap <b>Back to map</b> at the top of the panel to see the coverage marks across the property.', sel: '.sheet [data-a="sheetGrow"][aria-expanded="true"]', lbl: 'Back to map', done: (sim, ui) => !(ui && ui.sheetTall && ui.tab) || flag(sim, 'securityOverlaySeen') },
      { t: 'Inspect the coverage map', d: 'Red cross = dark and unwatched. Stripe = lit only. Dot = camera only. No mark = lit and on camera. Tap <b>Got it</b> after you have inspected the map.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => flag(sim, 'securityOverlaySeen') },
      { t: 'Turn the <b>Security</b> overlay off', d: 'Tap <b>Security</b> again. The diagnostic layer should disappear and the normal property view should return.', sel: '[data-a="overlay"][data-v="security"]', done: (sim, ui) => flag(sim, 'securityOverlaySeen') && ((!ui || !ui.rend || ui.rend.overlay !== 'security') || sim.works(hallLight(sim)) || !!(repairTask(sim, hallLight(sim)) || {}).assigned) },
      { t: 'Tap <b>Back to map</b>', d: 'Time stays paused while the panel is expanded. Tap <b>Back to map</b> at the top of the panel to see the hallway again.', sel: '.sheet [data-a="sheetGrow"][aria-expanded="true"]', lbl: 'Back to map', done: (sim, ui) => !(ui && ui.sheetTall && ui.tab) || (ui && hallLight(sim) && ui.sel === hallLight(sim).id) || sim.works(hallLight(sim)) || !!(repairTask(sim, hallLight(sim)) || {}).assigned },
      { t: 'Repair the dark hallway', d: 'The complaint came from the hallway light. Tap that failed light on the map; the wrench pin marks it.', obj: (sim) => hallLight(sim) && hallLight(sim).id, done: (sim, ui) => sim.works(hallLight(sim)) || (ui && hallLight(sim) && ui.sel === hallLight(sim).id) || !!(repairTask(sim, hallLight(sim)) || {}).assigned },
      { t: 'Send the <b>Owner</b>', d: 'Use the light panel to send the Owner. You are fixing the problem the customer actually experienced before adding anything else.', sel: `[data-cmd*='\"ownerTask\"']`, done: (sim) => sim.works(hallLight(sim)) || !!(repairTask(sim, hallLight(sim)) || {}).assigned },
      { t: 'Let the hallway repair finish', d: 'Run time until the light works again. Then use the overlay evidence to decide whether Maple Street needs more coverage.', sel: PLAY, run: true, done: (sim) => sim.works(hallLight(sim)) },
      // Improve one weak spot: a normal build sequence. Navigation steps fall back to the outcome, so an earlier tutorial-built
      // camera/light still counts (no duplicate); the outcome step has no tab target, so an open Build panel never completes it.
      { t: 'Turn the <b>Security</b> overlay back on', d: 'Before you build, use <b>Operate → Overlays → Security</b> again. It stays on while you use Build, so you can see the red crosses (dark and unwatched) while you choose where the camera goes.', sel: '[data-a="overlay"][data-v="security"]', done: (sim, ui) => (ui && ui.rend && ui.rend.overlay === 'security') || securityArmed(ui) || securityImproved(sim) },
      { t: 'Improve one weak spot: open <b>Build</b>', d: 'Use <b>Build → Access & Security</b>. Add a Camera or Light where the overlay showed a weakness. If you already added one during the tutorial, that improvement counts; do not build a duplicate.', sel: TAB('build'), done: (sim, ui) => tabIs(ui, 'build') || securityArmed(ui) || securityImproved(sim) },
      { t: 'Choose <b>Access & Security</b>', d: 'In the Build panel, tap the <b>Access & Security</b> category along the top. Swipe the category row sideways if you don\'t see it.', sel: CAT('security'), done: (sim, ui) => catIs(ui, 'security') || securityArmed(ui) || securityImproved(sim) },
      { t: 'Pick <b>Camera</b> or <b>Light</b>', d: 'Tap the <b>Camera</b> card (a <b>Light</b> works too). The action bar opens at the bottom with the price.', sel: TOOL('camera'), done: (sim, ui) => securityArmed(ui) || securityImproved(sim) },
      { t: 'Place it on a weak spot and <b>Confirm</b>', d: 'Hold and drag onto an area the Security overlay showed as dark or unwatched, check the action bar, then tap <b>Confirm</b>.', sel: CONFIRM, done: securityImproved },
      { t: 'Let the improvement finish', d: 'Run time until the improvement is operating. The goal is evidence → diagnosis → improvement, not building for its own sake.', sel: PLAY, run: true, done: securityImprovementDone },
    ],
    button: 'Got it', flag: 'securityOverlaySeen', buttonWhen: (sim, ui) => ui && ui.rend && ui.rend.overlay === 'security' && !(ui.sheetTall && ui.tab) && !flag(sim, 'securityOverlaySeen'),
    check: (sim) => sim.works(hallLight(sim)) && securityImprovementDone(sim) },

  { id: 'climate', act: 'III', chapter: 'Improve', title: 'Serve a customer need Maple Street misses',
    body: (sim) => `${climateDemandLine(sim)} The unused west corridor can become climate-controlled space.`,
    why: 'Climate space earns a premium because it serves a different need. It requires <b>HVAC capacity</b>, a <b>lit interior route</b> and units built with <b>Climate on</b>.',
    steps: [
      { t: '12A · Read the climate demand', d: '{climateDemand} Build only because the customer need is real, not because a tool is unlocked. Tap <b>Got it</b>.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => flag(sim, 'climateDemandAck') },
      ...buildSteps({ cat: 'utilities', catName: 'Utilities', tool: 'hvac', toolName: 'HVAC Plant', cell: { x: 14, y: 8 }, placed: hvacPresent,
        place: '<b>12B · Add HVAC capacity</b>', placeD: 'Place the HVAC Plant on the grass strip just west of the interior building, touching the building.' }).map((st, i) => i === 0 ? { ...st, t: '12B · Open <b>Build</b> for HVAC' } : st),
      ...buildSteps({ cat: 'security', catName: 'Access & Security', tool: 'light', toolName: 'Light', cell: { x: 17, y: 8 }, f: 0, after: hvacPresent, placed: westLightPresent,
        place: '<b>12C · Light the west corridor</b>', placeD: 'On <b>F1</b>, place a light in the west corridor so customers have a lit route to the new units.' }).map((st, i) => i === 0 ? { ...st, t: '12C · Prepare the climate corridor', done: (sim, ui) => westLightPresent(sim) || (hvacPresent(sim) && tabIs(ui, 'build')) } : st),
      ...buildSteps({ cat: 'units', catName: 'Units', tool: 'iu5x5', toolName: 'Interior 5x5', cell: { x: 16, y: 5 }, end: { x: 16, y: 11 }, axis: 'y', climate: true, f: 0, after: westLightPresent, placed: climatePresent,
        place: 'Build climate units along the west corridor', placeD: 'On <b>F1</b>, place the units along the west side of the corridor with their doors facing the hallway.',
        review: [{ t: 'Turn <b>Climate on</b>', d: 'In the action bar, tap <b>Climate off</b> so it reads <b>Climate on</b>.', sel: '#abar [data-a="climate"]', done: (sim, ui) => (ui && ui.climate && ui.tool === 'iu5x5') || climatePresent(sim) }] })
        .map((st, i) => i === 0 ? { ...st, t: 'Build the climate units', done: (sim, ui) => climatePresent(sim) || (westLightPresent(sim) && tabIs(ui, 'build')) } : st).map((st) => ({ ...st, prereq: climateWait(climatePresent) })),
      waitBuild('Let construction finish and the climate units open', (sim) => !!sim.s.milestones.first_climate || sim.objs('unit').some((u) => u.env === 'climate' && u.cstate === 'operating')),
    ],
    button: 'Got it', flag: 'climateDemandAck', buttonWhen: (sim) => !flag(sim, 'climateDemandAck'),
    check: (sim) => !!sim.s.milestones.first_climate || sim.objs('unit').some((u) => u.env === 'climate' && u.cstate === 'operating') },

  chapterBreak({ id: 'actIII_break', act: 'III', chapter: 'Improve', next: 'Act IV · Grow', title: 'Maple Street works better because you listened', progress: investmentText,
    body: 'You followed a customer, read what went wrong, diagnosed the property with an overlay and invested in a customer need. <b>Maple Street is paused.</b> This is a good place to stop before Act IV.',
    why: 'What you learned in Act III: customers experience the physical route through the property; feedback records real events; satisfaction summarizes repeated service; overlays turn hidden systems into visible evidence; improvements should answer a diagnosed problem; and different products serve different demand.' }),

  // Act IV "Grow" (campaign Unit 7). Beat 13: the existing building grows one floor. Objective-driven; no camera focus.
  { id: 'vertical', act: 'IV', chapter: 'Grow', title: 'Connect a second floor',
    body: (sim) => `Maple Street still has open land, and building out is cheaper here. But land is the scarce thing at most storage sites, so learn how a second floor connects while one unit is enough to try it.${verticalMoneyLine(sim)}`,
    why: 'An upstairs unit only works when the whole route connects: <b>gate → loading → entrance → elevator → upstairs unit</b>. The freight elevator comes with the new floor; the hallway, light and unit are yours to place. One working unit is the goal, not a full floor, and upstairs units are not guaranteed to rent.',
    steps: [
      { t: 'Let rent cover the new floor{verticalMoney}', d: 'The structure-only quote plus one hallway, light and unit is more than Maple Street can spend after bills and reserve. Tap <b>4x</b> to let rent come in; the figures update as it does, and this step continues by itself when the quote fits. You do not need to borrow.', sel: FAST, run: true, done: (sim) => verticalShort(sim) === 0 || verticalStarted(sim) },
      { t: 'Tap the <b>interior building</b>{verticalMoney}', d: 'Close any open panel with <b>×</b>, then tap the large interior building on the map. Its panel shows its floors.', obj: (sim) => interiorShell(sim) && interiorShell(sim).id,
        done: (sim, ui) => !!ui && ((interiorShell(sim) && ui.sel === interiorShell(sim).id) || !!ui.verticalReview) || verticalStarted(sim) },
      { t: 'Tap <b>Plan next floor</b>{verticalMoney}', d: 'In the building panel, tap <b>Plan next floor</b>. The review lists every cost before anything is charged.', sel: '[data-a="verticalReview"]', done: (sim, ui) => (!!ui && !!ui.verticalReview) || verticalStarted(sim) },
      { t: 'Choose <b>structure only</b>{verticalMoney}', d: 'Untick <b>Copy this floor’s unit layout and lighting</b>. You will add one hallway, light and unit yourself, which costs far less than copying the whole floor.', sel: '[data-vertical-option="fitout"]',
        done: (sim, ui) => (!!ui && !!ui.verticalReview && ui.verticalReview.fitout === false) || verticalStarted(sim) },
      { t: 'Tap <b>Confirm</b>{verticalMoney}', d: 'Check the cost and the cash after, then tap <b>Confirm</b>. Nothing is charged before this.', sel: '[data-a="verticalConfirm"]', done: verticalStarted },
      waitBuild('Let the new floor and elevator finish', (sim) => upperFloorDone(sim) || upstairsUnits(sim).length > 0),
      ...buildSteps({ cat: 'interior', catName: 'Interior', tool: 'hall', toolName: 'Hallway', cell: { x: 17, y: 5 }, end: { x: 17, y: 6 }, f: 1, after: upperFloorDone,
        placed: (sim) => hallF2(sim) !== 'missing' || upstairsUnits(sim).length > 0,
        place: 'Tap <b>F2</b>, then drag a short hallway from the elevator', placeD: 'Tap <b>F2</b> on the right rail. Start on the floor just below the new elevator and drag two cells down. Upstairs units open onto a hallway.' })
        .map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> (F2 hallway)' } : st),
      ...buildSteps({ cat: 'security', catName: 'Access & Security', tool: 'light', toolName: 'Light', cell: { x: 17, y: 6 }, f: 1, after: (sim) => hallF2(sim) !== 'missing',
        placed: (sim) => lightF2(sim) || upstairsReady(sim), place: 'Tap the new <b>F2</b> hallway to light it', placeD: 'On <b>F2</b>, tap the new hallway. Customers will not use a dark corridor.' })
        .map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> again (Light)' } : st).map((st) => ({ ...st, prereq: hallWait((sim) => lightF2(sim) || upstairsReady(sim)) })),
      ...buildSteps({ cat: 'units', catName: 'Units', tool: 'iu5x10', toolName: 'Interior 5x10', cell: { x: 18, y: 5 }, f: 1, axis: 'y', after: lightF2,
        placed: (sim) => upstairsUnits(sim).length > 0, place: 'Place one <b>Interior 5x10</b> facing the F2 hallway', placeD: 'On <b>F2</b>, tap the floor just right of the new hallway. The unit door must face the hallway.' })
        .map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> again (unit)' } : st).map((st) => ({ ...st, prereq: hallWait((sim) => upstairsUnits(sim).length > 0) })),
      waitBuild('Let the upstairs unit open', upstairsReady),
    ],
    check: upstairsReady },

  // Act IV Beat 14: collections, the existing lesson contract (LESSONS.collections) on one real returned payment.
  { id: 'collections', act: 'IV', chapter: 'Grow', title: 'When rent goes unpaid',
    body: 'An account is falling behind. Unpaid rent climbs a ladder: past due, delinquent (locked out), lien, notice, then auction.',
    why: 'You set the policies (late fee, overlocks, automatic notices, auction or clean-out) and handle the exceptions. A payment plan often saves the tenant and the money.',
    tick: (sim) => { if (!act4Authored(sim) && sim.s.speed > 0) authorAct4Account(sim); }, // arrives with running time, never during manual Pause
    ownsRequest: (sim, c) => !!c && sim.s.tut.flags.act4Account != null && c.key === 'lien' + sim.s.tut.flags.act4Account,
    steps: [
      { t: 'Let time run until a payment comes back', d: 'No tenant has a paid rent bill old enough yet. Tap <b>4x</b>; this step continues by itself once one does. The tutorial only uses a real payment; it never invents rent.', sel: FAST, run: true, done: act4Authored },
      { t: 'Open <b>Business</b>{act4Account}', d: 'Tap <b>Business</b> in the bottom bar.', sel: TAB('business'), done: (sim, ui) => (act4Authored(sim) && tabIs(ui, 'business')) || act4Seen(sim) },
      { t: 'Find <b>Collections</b>{act4Account}', d: 'In the Business panel, choose <b>Collections</b> in the section selector to reach the ladder. Each rung counts accounts at that stage; the list below has actions for each account (notice, plan, waive, unlock).', sel: '.ladder', done: act4Seen },
      { t: 'Tap <b>Got it</b>', d: 'Or act on an account first. The button is on this card.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => act4Seen(sim) && !!ctx(sim).flags.collAck },
    ],
    button: 'Got it', flag: 'collAck', buttonWhen: act4Seen, check: (sim) => act4Seen(sim) && !!ctx(sim).flags.collAck },
  // Beat 15 (D3 Option 2, P1 inspection-only): the live quote of the unbuilt upper-floor route, the money, the demand evidence
  // and the ways to pay, then a free decision. Declining completes it; borrowing is neither offered nor required here.
  { id: 'financing', act: 'IV', chapter: 'Grow', title: 'Can Maple afford to build up?', review: 'fin',
    body: 'Maple Street could add a second building with an upstairs floor on its open land. Today it costs more than Maple can spend and still keep its reserve. A loan or the credit line could cover the gap, but being able to borrow does not make a project worth doing.',
    why: 'A term loan is long-term capital: you repay it every month for years, whether or not the new units rent. The credit line is for short gaps in cash. Judge a project by the money you have, the demand you can see and the payments you would owe.',
    steps: [
      { t: 'Review the upper-floor project{finMoney}', d: 'Tap <b>Review the project</b> on this card. It prices the route at today’s costs and compares the ways to pay. Nothing is ordered, charged or borrowed.', sel: '.tut [data-a="finReview"]', lbl: 'Review the project', done: finSeen },
      { t: 'Decide, then tap <b>Continue without borrowing</b>{finMoney}', d: 'Borrowing is not required, and declining has no penalty. You can reopen the review first. The button is on this card and in the review.', sel: '.tut [data-a="tutNext"]', lbl: 'Continue', done: (sim) => finSeen(sim) && !!sim.s.tut.flags.finAck },
    ],
    button: 'Continue without borrowing', flag: 'finAck', buttonWhen: finSeen, check: (sim) => finSeen(sim) && !!sim.s.tut.flags.finAck },
  chapterBreak({ id: 'actIV_break', act: 'IV', chapter: 'Grow', next: 'Graduation', title: 'You are managing Maple Street now',
    body: 'You connected a second floor, followed a returned payment through Collections and weighed financing against what Maple can afford. <b>Maple Street is paused.</b> One final review remains before the property is fully yours.',
    why: 'What you learned in Act IV: vertical growth needs connected infrastructure; larger growth needs planning; unpaid rent moves through staged decisions and can escalate; borrowing adds capital but creates repayment obligations; and financing should be judged against the project’s need and Maple’s capacity.' }),

  // Paused graduation (campaign Unit 3): entering this beat pauses time and keeps it paused; the player restarts it.
  { id: 'grad', chapter: 'Graduation', title: 'Maple Street is yours', pause: true, progress: gradProgress, // live Investment Progress + upcoming transition (Option A)
    body: 'You’ve taken Maple Street from a property you barely knew into one you can operate, diagnose, improve and grow. You understand how customers, staff, buildings and money fit together. There is still plenty to master, but the property is yours now. <b>Maple Street is paused.</b> Take your time, look around, and start the clock when you’re ready.',
    why: 'Deeper <b>lessons</b> on building up, collections and financing are offered when the situation comes up, or anytime from <b>Growth &rarr; Lessons</b>. A <b>report card</b> arrives every 30 days in <b>Business</b>.',
    steps: [{ t: 'Tap <b>Finish tutorial</b>', d: 'The tutorial closes and every tool is unlocked. Time stays paused until you choose a speed.', sel: '.tut [data-a="tutNext"]', done: (sim) => sim.s.tut.flags.grad }],
    button: 'Finish tutorial', check: (sim) => sim.s.tut.flags.grad },

];

// Campaign progression is identified by stable beat ids (sim.s.tut.beatId), never by position alone.
// `tut.beat` is kept as the derived position so older readers and older builds still work; `tut.beatAt`
// records the position the id was synced at. Rules: a numeric position written without its id (an older
// build, a legacy save or a test) wins and the id follows it; once BEATS are reordered, the id wins.
// Never reuse or rename a beat id: a retired id maps forward here.
export const BEAT_ALIASES = {};
// A save loaded without a beat id predates ids (before campaign Unit 1) and is positioned in the original 8-beat layout.
// (At run time, a position written without an id is a position in the current layout, as before.)
export const LEGACY_BEATS = ['welcome', 'makeready', 'lease', 'money', 'expand', 'repair', 'hire', 'actII_break'];
const OLD_EXPAND_AT = 4;
const PRE_ACT4_GRAD_AT = 15; // Unit 6 ended here: active saves at that old graduation resume from the Act III break (D4 precedent), so Act IV is not skipped.
const PRE_ACT3_GRAD_AT = 10; // Unit 5 ended here; active saves at that old graduation resume from the Act II break (D4). // `expand` sat here, and began with the Asking rents stop, until Beat 5 took that stop over (Unit 4)
// An `expand` save from before Unit 4: unless the Drive-Up 10x10 row was ordered or the expansion already opened, the
// player resumes at Beat 5 (`pricing`, short and read-only, so nothing is completed for them); otherwise at `expand`.
// Needs the whole state (orders, milestones): null when only the tutorial record is at hand (the load-time sync).
function oldExpandTarget(s) {
  if (!s || !s.milestones) return null;
  const t = s.tut, row = (t.built || []).some((b) => b.tool === 'du10x10' && b.id >= (t.idMark || 0));
  return row || s.milestones.first_expansion ? 'expand' : 'pricing';
}
export function beatIndex(id) {
  if (typeof id !== 'string') return -1;
  const seen = new Set(); while (BEAT_ALIASES[id] && !seen.has(id)) { seen.add(id); id = BEAT_ALIASES[id]; }
  return BEATS.findIndex((b) => b.id === id);
}
// Read-only: the current tutorial position for any tut state (falls back to the numeric position).
export function tutBeatIndex(s) {
  const t = s && s.tut; if (!t) return -1;
  const r = resolveBeat(s); return r === null ? beatIndex('expand') : r;
}
// The current position, or null for an old `expand` save, which needs the whole state to resolve.
function resolveBeat(s) {
  const t = s.tut;
  const i = beatIndex(t.beatId);
  if (i < 0) return t.beat;
  if (Number.isInteger(t.beat) && t.beat !== t.beatAt) return t.beat; // position changed without the id
  if (t.beatId === 'expand' && t.beatAt === OLD_EXPAND_AT && t.beat === OLD_EXPAND_AT) { const to = oldExpandTarget(s); return to ? beatIndex(to) : null; }
  if (t.beatId === 'grad' && t.beatAt === PRE_ACT3_GRAD_AT && t.beat === PRE_ACT3_GRAD_AT) return beatIndex('actII_break'); // D4: do not skip Act III
  if (t.beatId === 'grad' && t.beatAt === PRE_ACT4_GRAD_AT && t.beat === PRE_ACT4_GRAD_AT) return beatIndex('actIII_break'); // same rule: do not skip Act IV
  return i;
}
// Mutating sync, used when a game is loaded and on each tutorial tick. Only an active tutorial carries an id.
// `s` (the whole state) is passed on ticks; at load only the tutorial record is, and an old `expand` save then waits
// untouched for the first tick, where its orders and milestones decide between `pricing` and `expand`.
export function syncTutBeat(t, s) {
  if (!t || !t.on || t.done) return;
  if (!s && t.beatId == null && Number.isInteger(t.beat) && LEGACY_BEATS[t.beat]) { // loading a save from before beat ids
    t.beatId = LEGACY_BEATS[t.beat]; t.beatAt = t.beatId === 'expand' ? OLD_EXPAND_AT : beatIndex(t.beatId);
    t.beat = t.beatId === 'expand' ? OLD_EXPAND_AT : t.beatAt; // old expand: the first tick decides pricing or expand
    if (t.beatId === 'expand') return;
  }
  const i = resolveBeat(s && s.tut === t ? s : { tut: t });
  if (!Number.isInteger(i) || !BEATS[i]) return; // unknown or not yet resolvable: leave untouched
  if (BEATS[i].id === 'pricing' && t.beatId === 'expand') t.entered = false; // an old expand save resumes at Beat 5: enter it
  if (BEATS[i].id === 'actII_break' && t.beatId === 'grad') t.entered = false; // D4 migration from the old graduation
  if (BEATS[i].id === 'actIII_break' && t.beatId === 'grad') t.entered = false; // the same migration from the Act III-era graduation
  t.beat = i; t.beatId = BEATS[i].id; t.beatAt = i;
}

// A beat or lesson may declare `ownsRequest(sim, c)`: that owner request is the lesson's own content and is shown, not held.
export function beatOwnsRequest(sim, c) {
  const s = sim.s, b = s.lesson ? lessonById(s.lesson.id) : s.tut && s.tut.on && !s.tut.done ? BEATS[tutBeatIndex(s)] : null;
  return !!(b && b.ownsRequest && b.ownsRequest(sim, c));
}
// Optional lessons: offered when the situation comes up (or anytime from Growth -> Lessons) after graduation.
// Maple-specific lessons (coordinates) run only on the original Maple Street layout.
export const LESSONS = [
  { id: 'interior', chapter: 'Lesson', offer: (sim) => sim.day >= (sim.s.tut.gradDay || 0) + 2, title: 'How interior customers move',
    body: 'Interior customers can\'t drive to their door. They park at the loading stalls and bring a <b>cart</b> inside.',
    why: 'The path is <b>vehicle &rarr; loading stall &rarr; cart &rarr; wide door &rarr; hallway &rarr; unit</b>. If the corral runs out of carts, customers wait or carry by hand, and satisfaction drops.',
    enter: (sim) => { const tn = Object.values(sim.s.tenants).find((t) => { const u = sim.s.objects[sim.s.leases[t.lease].unit]; return u.access === 'interior'; }); if (tn) sim.schedule({ kind: 'bigaccess', tenant: tn.id, unit: sim.s.leases[tn.lease].unit }, sim.s.t + 30); },
    focus: (sim) => ({ obj: sim.objs('corral')[0] && sim.objs('corral')[0].id }),
    steps: [
      { t: 'Tap the <b>Main Loading Corral</b>', d: 'It\'s the yellow cart rack just below the interior building\'s wide door (the ring marks it). Close any open panel first with the <b>×</b>.', obj: (sim) => sim.objs('corral')[0] && sim.objs('corral')[0].id, done: (sim) => ctx(sim).flags.corralInspected },
      { t: 'Read the corral panel', d: 'It shows carts parked, the target stock, and cart condition. Close it with <b>×</b> when done.', done: (sim, ui) => ctx(sim).flags.corralInspected && (!ui || ui.sel == null) || !!sim.s.milestones.first_cart_trip },
      { t: 'Watch a customer use a cart', d: 'A tenant arrives in about 30 minutes. Keep time running (<b>2x</b> helps) and watch them grab a cart and roll it through the wide door.', sel: PLAY, done: (sim) => !!sim.s.milestones.first_cart_trip },
    ],
    check: (sim) => ctx(sim).flags.corralInspected && !!sim.s.milestones.first_cart_trip },
  { id: 'quality', chapter: 'Lesson', offer: (sim) => sim.s.exp.security < 0.66 || sim.day >= (sim.s.tut.gradDay || 0) + 6, title: 'Coverage you can see',
    body: 'Customers rate you on lighting and cameras. Find the blind spots, then cover one.',
    why: 'Security coverage feeds your <b>Reputation</b>, which affects how many prospects sign. Overlays show hidden systems: security, carts, HVAC, cleanliness and power.',
    steps: [
      { t: 'Open <b>Operate</b>', d: 'Tap <b>Operate</b> in the bottom bar.', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || (ui && ui.rend && ui.rend.overlay === 'security') || since(sim, (o) => o.type === 'camera' || o.type === 'light') || ordered(sim, 'camera') || ordered(sim, 'light') },
      { t: 'Turn on the <b>Security</b> overlay', d: 'In the Operate panel, choose <b>Overlays</b> in the section selector, then tap <b>Security</b>. Covered ground glows; uncovered ground stays dark.', sel: '[data-a="overlay"][data-v="security"]', done: (sim, ui) => (ui && ui.rend && ui.rend.overlay === 'security') || ordered(sim, 'camera') || ordered(sim, 'light') },
      ...buildSteps({ cat: 'security', catName: 'Access & Security', tool: 'camera', toolName: 'Camera', cell: { x: 22, y: 14 }, placed: (sim) => ordered(sim, 'camera') || ordered(sim, 'light'),
        place: '<b>Tap</b> the apron beside the loading stalls to place it', placeD: 'Tap the concrete just right of the loading stalls, below the interior building. A Light works too if you prefer.' }),
      waitBuild('Let the installer finish', (sim) => since(sim, (o) => (o.type === 'camera' || o.type === 'light') && o.cstate === 'operating')),
    ],
    check: (sim) => createdSince(sim, 'camera') || createdSince(sim, 'light') },
  { id: 'climate', chapter: 'Lesson', offer: (sim) => (sim.lostRecent(14).noClimate || 0) >= 2, title: 'Climate demand is worth serving',
    body: 'About a third of prospects want climate control and you have none. The interior building has an unused <b>west corridor</b>: fill it with climate units.',
    why: 'Climate units rent for more but need three things: an <b>HVAC Plant</b> beside the building (capacity), a <b>light</b> in the hallway, and units built with <b>Climate on</b>.',
    focus: () => ({ cell: { x: 16, y: 8 }, view: 0 }),
    steps: [
      ...buildSteps({ cat: 'utilities', catName: 'Utilities', tool: 'hvac', toolName: 'HVAC Plant', cell: { x: 14, y: 8 }, placed: (sim) => ordered(sim, 'hvac'),
        place: '<b>Tap</b> the grass just west of the interior building', placeD: 'Tap the grass strip between the main aisle and the interior building\'s west wall, about halfway up. It must touch the building.' }).map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> (HVAC first)' } : st),
      ...buildSteps({ cat: 'security', catName: 'Access & Security', tool: 'light', toolName: 'Light', cell: { x: 17, y: 8 }, f: 0, after: (sim) => built(sim, 'hvac'), placed: (sim) => built(sim, 'light'),
        place: 'Tap <b>F1</b> on the right, then <b>tap</b> the west corridor', placeD: 'Tap <b>F1</b> on the right rail to see inside. The west corridor is the narrow dark hallway on the left side of the building; tap its middle.' }).map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> again (Light)', done: (sim, ui) => (tabIs(ui, 'build') && ordered(sim, 'hvac')) || built(sim, 'light') || toolIs(ui, 'light') } : st),
      ...buildSteps({ cat: 'units', catName: 'Units', tool: 'iu5x5', toolName: 'Interior 5x5', cell: { x: 16, y: 5 }, end: { x: 16, y: 11 }, axis: 'y', climate: true, f: 0, after: (sim) => built(sim, 'light'), placed: (sim) => newUnits(sim, (u) => u.env === 'climate').length > 0,
        place: '<b>Drag</b> a column along the corridor\'s west side', placeD: 'On <b>F1</b>, press on the empty floor just left of the west corridor at the top, and drag straight down to the bottom. Unit doors must open onto the corridor.',
        review: [{ t: 'Turn <b>Climate on</b>', d: 'In the action bar at the bottom, tap <b>Climate off</b> so it reads <b>Climate on</b>.', sel: '#abar [data-a="climate"]', done: (sim, ui) => (ui && ui.climate && ui.tool === 'iu5x5') || newUnits(sim, (u) => u.env === 'climate').length > 0 }] })
        .map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> again (units)', done: (sim, ui) => (tabIs(ui, 'build') && built(sim, 'light')) || toolIs(ui, 'iu5x5') || newUnits(sim, (u) => u.env === 'climate').length > 0 } : st).map((st) => ({ ...st, prereq: climateWait((sim) => newUnits(sim, (u) => u.env === 'climate').length > 0) })),
      waitBuild('Let construction finish and the climate units open', (sim) => !!sim.s.milestones.first_climate),
    ],
    check: (sim) => !!sim.s.milestones.first_climate },
  { id: 'up', chapter: 'Lesson', revalidate: true, offer: (sim) => ((sim.lostRecent(30).noReady || 0) + (sim.lostRecent(30).noSize || 0)) >= 8 && sim.objs('unit').length > 26 && nearlyFull(sim) && upOfferEvidence(sim), title: 'Build a working two-floor property',
    body: 'The blueprint shows the whole layout. Use suggested placement to prepare each piece, or hold and drag from Start to End. Nothing is charged until Confirm.',
    why: 'Customers need a connected route: gate → loading → entrance → elevator → upstairs unit. Markers follow the building you actually place.',
    focus: (sim) => { const l=verticalLayout(sim); return l ? {cell:{x:l.sh.x+l.sh.w/2,y:l.sh.y+l.sh.h/2}} : null; },
    steps: [
      ...[
        ['aisle','Connected drive aisle','roads','Connect the highlighted access strip to the existing aisle.'],
        ['shell2','Two-floor building footprint','buildings','Use the outlined footprint: 9 × 9 cells. Review its dimensions and access before Confirm.'],
        ['hall','F1 hallway','interior','The hallway must reach the highlighted entrance wall.'],
        ['doorWide','Wide entrance','interior','Place the door at the hallway end, facing the highlighted loading area.'],
        ['loading','Loading zone','roads','Place the three highlighted loading cells outside the entrance.'],
        ['hall2','F2 hallway','interior','Switch to F2; follow the highlighted line on this same building.'],
        ['elevator','Elevator','interior','Place the shaft beside both hallways, near the entrance.'],
        ['lights','Light both hallways','security','Place a light in each highlighted hallway: F1 and F2.'],
        ['units','F2 units','interior','Place units beside this hallway. Suggested placement faces their doors toward it.'],
      ].map(([blueprint,t,cat,d]) => ({blueprint,cat,t,d:d+' Use suggested placement, review, then Confirm. You can also place manually.',done:(sim)=>verticalDone(sim,blueprint),
        // The shaft needs BUILT hallways beside it on both floors: an ordered hallway means waiting, not placing;
        // a missing hallway outranks waiting, because time alone cannot fix it.
        // An elevator committed early (allowed) does not complete the step: it waits for those hallways the same way.
        prereq:blueprint==='elevator'?(sim)=>{const st=shaftHallState(sim);if(!st||verticalDone(sim,'elevator'))return null;const miss=st.indexOf('missing'),f=miss>=0?miss:st.findIndex(x=>x!=='built');const l=verticalLayout(sim);return f<0?null:{state:st[f],floor:f+1,states:st,committed:sim.objs('elevator').some(o=>o.x>=l.sh.x&&o.x<l.sh.x+l.sh.w&&o.y>=l.sh.y&&o.y<l.sh.y+l.sh.h)};}:null})),
      {t:'Finish construction and check access',d:'Run time to finish construction. Recheck my layout lists any missing connection, lighting or power.',blueprint:'finished',sel:FAST,done:(sim)=>verticalDone(sim,'finished')},
      {t:'Let the upstairs units open',d:'Keep time running. Finished units open automatically after their access, lighting, power and elevator checks pass.',sel:FAST,done:(sim)=>verticalDone(sim,'commissioned')},
    ],
    check:(sim)=>verticalDone(sim,'commissioned') },

  { id: 'collections', chapter: 'Lesson', title: 'When rent goes unpaid', generic: true,
    body: 'An account is falling behind. Unpaid rent climbs a ladder: past due, delinquent (locked out), lien, notice, then auction.',
    why: 'You set the policies (late fee, overlocks, automatic notices, auction or clean-out) and handle the exceptions. A payment plan often saves the tenant and the money.',
    offer: (sim) => Object.values(sim.s.leases).some((L) => ['delinquent', 'lien'].includes(L.status)),
    steps: [
      { t: 'Open <b>Business</b>', d: 'Tap <b>Business</b> in the bottom bar.', sel: TAB('business'), done: (sim, ui) => tabIs(ui, 'business') || ctx(sim).flags.collAck },
      { t: 'Find <b>Collections</b>', d: 'In the Business panel, choose <b>Collections</b> in the section selector to reach the ladder. Each rung counts accounts at that stage; the list below has actions for each account (notice, plan, waive, unlock).', sel: '.ladder', done: (sim) => ctx(sim).flags.collAck },
      { t: 'Tap <b>Got it</b>', d: 'Or act on an account first. The button is on this card.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => ctx(sim).flags.collAck },
    ],
    button: 'Got it', flag: 'collAck', check: (sim) => ctx(sim).flags.collAck },
  { id: 'financing', chapter: 'Lesson', title: 'Paying for growth', generic: true,
    body: 'Expansion costs more than a month of rent. A term loan spreads it over 60 months; the credit line covers short gaps.',
    why: 'The bank approves loans whose payments stay under 45% of your rent roll. Loan buttons show the monthly payment and your cash after, before you commit. Borrow when new units will earn more than the payment.',
    // Financing is opened explicitly from Lessons or a purchase review, never from a cash/day timer.
    offer: () => false,
    steps: [
      { t: 'Open <b>Business</b>', d: 'Tap <b>Business</b> in the bottom bar.', sel: TAB('business'), done: (sim, ui) => tabIs(ui, 'business') || ctx(sim).flags.finAck },
      { t: 'Find <b>Financing</b>', d: 'Choose <b>Financing</b> in the Business section selector. Review a small credit draw or a term loan; quotes show the debt and cash after. Borrowing is optional. You can tap <b>Continue without borrowing</b> on this lesson.', sel: '[data-a="creditReview"]', lbl: 'Optional credit review', done: (sim) => ctx(sim).flags.finAck },
      { t: 'Continue without borrowing', d: 'Borrowing is optional. Use the button on this lesson.', sel: '.tut [data-a="tutNext"]', lbl: 'Continue', done: (sim) => ctx(sim).flags.finAck },
    ],
    button: 'Continue without borrowing', flag: 'finAck', check: (sim) => ctx(sim).flags.finAck },
];
export const lessonById = (id) => LESSONS.find((l) => l.id === id);
// The automatic two-floor offer waits only while BOTH hold: a product shoppers were lost for still has rent-ready
// vacancies, and no product has full Growth Readiness demand support. Evidence is economics.js investmentEvidence
// (per size|env product); no new evidence rule. Growth -> Lessons always lists the lesson regardless.
// Property-wide floor for the automatic offer: the coach's own "nearly full" boundary (ui.js coachHint). Below it the coach
// tells the player to rent vacant units before expanding, so the offer must not contradict it.
const nearlyFull = (sim) => { const oc = sim.occupancy(); return oc.n >= 4 && oc.pct >= 0.95; };
function upOfferEvidence(sim) { const P = investmentEvidence(sim).products; return P.some((p) => p.demandSupported) || !P.some((p) => p.losses > 0 && p.readyVacancies > 0); }
// A pending offer from a `revalidate` lesson is shown (and holds time) only while its offer still stands.
export const offerStands = (sim, id) => { const L = lessonById(id); return !!L && (!L.revalidate || !!L.offer(sim)); };
// Card header and Tutorial-list group. Act beats read "Act I · Take Over · Beat 3" (beats numbered across the campaign,
// chapter breaks not counted); the not-yet-migrated remainder keeps its chapter with "Part n of N".
export const beatGroup = (b) => b.act ? `Act ${b.act} · ${b.chapter}` : b.chapter;
// Between-beat banner, numbered like the card header: chapter breaks are not counted as beats.
export function beatDoneLabel(i) {
  const b = BEATS[i]; if (!b) return '';
  const n = BEATS.slice(0, i + 1).filter((x) => !x.brk).length, total = BEATS.filter((x) => !x.brk).length;
  return b.brk && b.act ? `Act ${b.act} complete` : `Beat ${n} of ${total} complete`;
}
export function beatHeader(i) {
  const b = BEATS[i]; if (!b) return '';
  const n = BEATS.slice(0, i + 1).filter((x) => !x.brk).length, total = BEATS.filter((x) => !x.brk).length;
  return b.brk ? `${beatGroup(b)} · Chapter break` : b.act ? `${beatGroup(b)} · Beat ${n}` : `${b.chapter} · Part ${n} of ${total}`;
}

// Current step index: one past the last completed step (so completing a later step implies earlier ones).
export function tutorialText(sim, value, live = {}) { // `live`: per-card cache, so one card reads each live figure once
  return typeof value === 'string' ? value.replace(/\{occupancy\}/g, () => occLine(sim)).replace(/\{repairHours\}/g, () => repairHours(sim)).replace(/\{feedbackSat\}/g, () => feedbackSat(sim)).replace(/\{climateDemand\}/g, () => climateDemandLine(sim)).replace(/\{verticalMoney\}/g, () => (live.vm ??= verticalMoneyTag(sim))).replace(/\{act4Account\}/g, () => (live.a4 ??= act4Line(sim))).replace(/\{finMoney\}/g, () => (live.fin ??= finLine(sim))).replace(/Unit (107|203)\b/g, (_, n) => {
    const u = unitByRole(sim, n === '107' ? 'mapleTurnover' : 'mapleInteriorMoveout');
    return u ? `Unit ${u.num}` : 'the tutorial unit';
  }) : value;
}
export function curBeat(sim) {
  const b=sim.s.lesson ? lessonById(sim.s.lesson.id) : sim.s.tut.on ? BEATS[tutBeatIndex(sim.s)] : null;
  if(!b)return null;
  const live = {}, text = value => tutorialText(sim, value, live);
  return {...b,title:text(b.title),body:text(typeof b.body === 'function' ? b.body(sim) : b.body)+(b.progress ? b.progress(sim) : ''),steps:b.steps?.map(st=>({...st,t:text(st.t),d:text(st.d)}))};
}
// Beat 13 guidance inside the Go Vertical review (U7a-r1): the coach card and ring are hidden while a modal is open, so
// the review shows the current step itself. Only for Beat 13's own review steps; null everywhere else.
export function verticalReviewGuide(sim, ui) {
  const b = curBeat(sim); if (!b || b.id !== 'vertical' || sim.s.lesson || !ui || !ui.verticalReview) return null;
  const { cur } = stepState(sim, ui), st = b.steps[cur]; if (!st || !st.sel) return null;
  const target = st.sel === '[data-vertical-option="fitout"]' ? 'fitout' : st.sel === '[data-a="verticalConfirm"]' ? 'confirm' : null;
  if (!target) return null;
  return { target, header: `${beatHeader(tutBeatIndex(sim.s))} · Step ${cur + 1} of ${b.steps.length}`, t: st.t, d: st.d };
}
// A navigation step whose destination is already showing is complete: never ask the player to tap what is selected.
export function alreadyShowing(st, ui) {
  if (!ui || !st || !st.sel) return false;
  const tab = /^#tabs \[data-v="(\w+)"\]$/.exec(st.sel); if (tab) return ui.tab === tab[1] && ui.sel == null;
  const cat = /^\.cats \[data-v="(\w+)"\]$/.exec(st.sel); if (cat) return catIs(ui, cat[1]) && ui.sel == null;
  return false;
}
// The current step is the first incomplete one. Steps carry their own progress fallbacks, so later progress still
// completes earlier steps, but an unmet earlier step (e.g. a lesson restored after reload) is never skipped.
export function stepState(sim, ui) {
  const b = curBeat(sim); if (!b || !b.steps) return { b, cur: -1, done: [] };
  const done = b.steps.map((st) => { try { return !!st.done(sim, ui) || alreadyShowing(st, ui); } catch (e) { return false; } });
  const missing = done.indexOf(false);
  return { b, cur: missing < 0 ? done.length - 1 : missing, done, all: missing < 0 };
}

// Tool unlocks are problem-earned in the tutorial (GDD §42). Sandbox: everything.
const UNLOCK = [
  ['expand', ['aisle', 'du5x5', 'du5x10', 'du10x10', 'du10x20', 'demolish', 'walk', 'parking']],
  ['repair', ['light']],
  ['overlays', ['camera']],
  ['climate', ['hvac', 'iu5x5', 'iu5x10', 'iu10x10', 'iu10x20']],
  ['vertical', ['hall']], // Act IV Beat 13: the upstairs hallway (the elevator comes inside the Go Vertical package)
]; // everything else unlocks at graduation
export function toolUnlocked(sim, tool) {
  const s = sim.s; if (!s.tut.on) return true;
  if (tool === 'office' || tool === 'gate') return false;
  for (const [id, tools] of UNLOCK) if (tools.includes(tool)) return tutBeatIndex(s) >= beatIndex(id);
  return false;
}
export function unlockBeat(tool) { for (const [id, tools] of UNLOCK) if (tools.includes(tool)) return beatIndex(id); return BEATS.length - 1; }

export function installTutorial(sim) {
  sim.onTick = (S) => { tutorialTick(S); lessonTick(S); };
}
// A pausing beat (graduation) holds time at 0 from the moment it becomes current until it completes.
function holdPause(sim) { if (sim.s.speed !== 0) { sim.s.speed = 0; sim.emit('speed', { v: 0, beat: true }); } }
export function tutorialTick(sim) {
  const s = sim.s; if (!s.tut.on || s.tut.done) { if (s.tut) { delete s.tut.beatId; delete s.tut.beatAt; } return; } // a finished or skipped tutorial carries no id
  syncTutBeat(s.tut, s);
  const b = BEATS[s.tut.beat]; if (!b) return;
  if (b.pause) holdPause(sim);
  if (b.brk && s.tut.flags[b.flag]) sim.releaseHeld({ chapter: true }); // after Continue, still paused: held reviews come out first
  if (!s.tut.entered) { s.tut.entered = true; s.tut.enteredAt = s.t; if (b.enter) b.enter(sim); sim.emit('tut_beat', { beat: s.tut.beat }); }
  if (b.tick) b.tick(sim); // a beat's own once-guarded state (Beat 14's returned payment); runs while the beat is current
  if (b.check(sim)) {
    const lesson = { interior_customer: 'interior', overlays: 'quality', climate: 'climate', collections: 'collections', financing: 'financing' }[b.id];
    if (lesson) { s.lessonsDone ||= {}; s.lessonsDone[lesson] ||= sim.day; }
    sim.emit('tut_done', { beat: s.tut.beat });
    s.tut.beat++; s.tut.entered = false; s.tut.idMark = s.nextId;
    if (s.tut.beat >= BEATS.length) { s.tut.done = true; s.tut.on = false; s.tut.gradDay = sim.day; delete s.tut.beatId; delete s.tut.beatAt; sim.releaseHeld(); sim.milestone('graduated'); }
    else { s.tut.beatId = BEATS[s.tut.beat].id; s.tut.beatAt = s.tut.beat; if (BEATS[s.tut.beat].pause) holdPause(sim); }
  }
}

export const lessonAllowed = (sim, L) => L && careerEligibility(sim.s).eligible && (L.generic || (sim.s.market.id === 'maple' && !sim.s.mirror && sim.s.tut && sim.s.tut.done && sim.s.mode === 'tutorial'));
export function lessonTick(sim) {
  const s = sim.s; if ((s.tut && s.tut.on) || !careerEligibility(s).eligible) return;
  const ls = s.lesson;
  if (ls) {
    const b = lessonById(ls.id); if (!b) { s.lesson = null; return; }
    if (!lessonAllowed(sim, b)) return;
    if (!ls.entered) { ls.entered = true; if (b.enter) b.enter(sim); sim.emit('tut_beat', { lesson: ls.id }); }
    if (b.check(sim)) { s.lessonsDone = s.lessonsDone || {}; s.lessonsDone[ls.id] = sim.day; s.lesson = null; sim.releaseHeld(); sim.emit('lesson_done', { id: ls.id, title: b.title }); }
    return;
  }
  // A pending `revalidate` offer that no longer stands is withdrawn, not marked seen. This runs on every poll, including
  // the paused-frame poll and the poll at load, so the clock never has to advance to retire it.
  if (s.lessonOffer && !offerStands(sim, s.lessonOffer) && lessonById(s.lessonOffer)) s.lessonOffer = null;
  // offers: at most one at a time, checked hourly, never during tutorial
  if (sim.mod % 60 !== 0 || s.creative) return;
  if (s.mode === 'tutorial' && !(s.tut && s.tut.done)) return;
  const lessonsDone = s.lessonsDone || {}, lessonsSeen = s.lessonsSeen || {};
  if (s.lessonOffer) return;
  for (const L of LESSONS) if (!lessonsDone[L.id] && !lessonsSeen[L.id] && lessonAllowed(sim, L) && L.offer && L.offer(sim)) { s.lessonOffer = L.id; sim.emit('lesson_offer', { id: L.id }); break; }
}
