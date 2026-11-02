import { tutorialUnit } from './unitnumbering.js';
import { careerEligibility } from './career.js';
// Maple Street tutorial (GDD §5-7). Beats are real property needs with deterministic milestone checks.
// Authored world events (a keen prospect, a failing light, a move-out) use the normal simulation paths.
import { TOOLS } from './data.js';
import { verticalDone, verticalLayout, shaftHallState } from './blueprint.js';

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
function buildSteps({ cat, catName, tool, toolName, place, placeD = '', cell, f = 0, end = cell, axis, climate = false, placed, extra = [], after }) {
  const past = (sim, ui) => placed(sim) || toolIs(ui, tool);
  const steps = [
    { t: `Open <b>Build</b>`, d: 'Tap <b>Build</b> in the bottom bar.', sel: TAB('build'), done: (sim, ui) => tabIs(ui, 'build') || past(sim, ui) },
    { t: `Choose <b>${catName}</b>`, d: `In the Build panel, tap the <b>${catName}</b> category along the top. Swipe the category row sideways if you don't see it.`, sel: CAT(cat), done: (sim, ui) => catIs(ui, cat) || past(sim, ui) },
    { t: `Pick <b>${toolName}</b>`, d: `Tap the <b>${toolName}</b> card. The action bar opens at the bottom with the price.`, sel: TOOL(tool), done: past },
    ...extra,
    { placement: {tool, a:cell, b:end, f, axis, climate}, t: place, d: placeD + ' Follow the highlighted footprint from Start here to End here, or tap Use suggested placement. The preview turns <b>green</b> when valid, <b>amber</b> if it will build but can\'t earn yet, <b>red</b> if it can\'t go there - the action bar says why.', cell, f, done: (sim, ui) => placed(sim) || planOk(ui, tool) },
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
const waitBuild = (label, doneFn) => ({ t: label || 'Let construction finish', d: 'Construction takes game hours. Tap <b>4x</b> at the top to speed up. A progress ring shows over the site.', sel: FAST, done: doneFn });

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
  { id: 'expand', chapter: 'Add Capacity', title: 'Maple Street is full',
    body: 'Every unit is leased and prospects are still asking. Build a new row of drive-up units on the empty grass east of the main aisle.',
    why: 'Asking rents set what each <b>new lease</b> pays; signed leases keep their rent. Drive-up units are cheap and simple: they only need a <b>drive aisle</b> in front of their doors. Eligible units open for rental automatically when construction finishes.',
    focus: () => ({ tool: 'du10x10', cell: { x: 13, y: 22 } }),
    steps: [
      ...buildSteps({ cat: 'units', catName: 'Units', tool: 'du10x10', toolName: 'Drive-Up 10x10', cell: { x: 13, y: 21 }, end: { x: 13, y: 28 }, axis: 'y', placed: (sim) => ordered(sim, 'du10x10'),
        place: '<b>Drag</b> a row down the grass beside the main aisle', placeD: 'Press on the grass touching the east edge of the main aisle, just below the cross aisle, and drag straight down about 8 cells. Doors must face the aisle - tap <b>Rotate</b> if they don\'t.' }),
      waitBuild('Let construction finish and the units open', (sim) => !!sim.s.milestones.first_expansion),
    ],
    check: (sim) => !!sim.s.milestones.first_expansion },
  { id: 'repair', chapter: 'Keep the Property Working', title: 'A hallway light has failed',
    body: 'The main hallway in the interior building just went dark. Dark hallways feel unsafe and customers notice.',
    why: 'Equipment wears out over time. Failures create jobs in the queue (<b>Operate &rarr; Jobs</b>). The Owner can fix simple things; a Tech or vendor handles the rest.',
    enter: (sim) => { const L = hallLight(sim); if (L) { sim.wear(L, L.cond - 0.1); sim.ensureRepairTask(L); sim.markDirty(); } },
    focus: (sim) => { const L = hallLight(sim); return { obj: L && L.id, view: 0 }; },
    steps: [
      { t: 'Look inside: tap <b>F1</b>', d: 'On the right-hand rail, <b>EXT</b> shows roofs; <b>F1</b> lifts the roof so you see inside floor 1.', sel: '#floors [data-v="0"]', done: (sim, ui) => (ui && ui.rend && ui.rend.view === 0) || !!(repairTask(sim, hallLight(sim)) || {}).assigned || !!sim.s.milestones.first_repair },
      { t: 'Tap the broken <b>light</b>', d: 'It\'s in the middle of the main hallway, under the orange wrench pin (the ring marks it).', obj: (sim) => hallLight(sim) && hallLight(sim).id, done: (sim, ui) => (ui && hallLight(sim) && ui.sel === hallLight(sim).id) || !!(repairTask(sim, hallLight(sim)) || {}).assigned || !!sim.s.milestones.first_repair },
      { t: 'Tap <b>Send Owner</b>', d: 'In the light\'s panel, tap <b>Send Owner</b>. If the Owner is busy, the job waits its turn.', sel: `[data-cmd*='"ownerTask"']`, done: (sim) => !!(repairTask(sim, hallLight(sim)) || {}).assigned || !!sim.s.milestones.first_repair },
      { t: 'Let the Owner fix it', d: 'Keep time running. The Owner walks in through the wide door and repairs the light (sparks when done).', sel: PLAY, done: (sim) => !!sim.s.milestones.first_repair },
    ],
    check: (sim) => !!sim.s.milestones.first_repair },
  { id: 'hire', chapter: 'Keep the Property Working', title: 'The Owner is the bottleneck',
    body: 'Unit 203 just moved out and the loading area is dirty. Two jobs, and the Owner can only do one at a time.',
    why: '<b>Hiring adds service capacity.</b> Porters clean and turn over units; Techs repair equipment; Clerks run the counter; Managers handle routine decisions. Each has a daily wage.',
    enter: (sim) => { const u = unitByRole(sim, 'mapleInteriorMoveout'); if (u && u.lease) { const L = sim.s.leases[u.lease]; const tn = sim.s.tenants[L.tenant]; tn.leaving = true; sim.schedule({ kind: 'moveout', tenant: tn.id, unit: u.id }, sim.s.t + 20); } for (let x = 18; x <= 21; x++) sim.s.dirt[0][15 * sim.s.W + x] = 0.7; },
    focus: () => ({ tab: 'operate' }),
    steps: [
      { t: 'Open <b>Operate</b>', d: 'Tap <b>Operate</b> in the bottom bar (the person icon; the red badge counts waiting jobs).', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || sim.s.staff.some((x) => x.role === 'porter') },
      { t: 'Tap <b>Hire Porter</b>', d: 'In the Operate panel, choose <b>Hire</b> in the section selector at the top, then tap <b>Hire Porter</b>. The button shows the daily wage.', sel: `[data-cmd*='"role":"porter"']`, done: (sim) => sim.s.staff.some((x) => x.role === 'porter') },
      { t: 'Watch the Porter work', d: 'Keep time running. The Porter walks out of the office and picks up the cleaning or the make-ready on their own.', sel: PLAY, done: (sim) => !!sim.s.milestones.first_delegated },
    ],
    check: (sim) => !!sim.s.milestones.first_delegated },
  // Paused graduation (campaign Unit 3): entering this beat pauses time and keeps it paused; the player restarts it.
  { id: 'grad', chapter: 'Graduation', title: 'Maple Street is yours', pause: true,
    body: 'You’ve taken Maple Street from a property you barely knew into one you can operate, improve and grow. You understand how customers, staff, buildings and money fit together. There is still plenty to master, but the property is yours now. <b>Maple Street is paused.</b> Take your time, look around, and start the clock when you’re ready.',
    why: 'Optional <b>lessons</b> (interior carts, security, climate, building up, collections, loans) are offered when the situation comes up, or anytime from <b>Growth &rarr; Lessons</b>. A <b>report card</b> arrives every 30 days in <b>Business</b>.',
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
export const LEGACY_BEATS = ['welcome', 'makeready', 'lease', 'money', 'expand', 'repair', 'hire', 'grad'];
const OLD_EXPAND_AT = 4; // `expand` sat here, and began with the Asking rents stop, until Beat 5 took that stop over (Unit 4)
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
      ...buildSteps({ cat: 'interior', catName: 'Interior', tool: 'iu5x5', toolName: 'Interior 5x5', cell: { x: 16, y: 5 }, end: { x: 16, y: 11 }, axis: 'y', climate: true, f: 0, after: (sim) => built(sim, 'light'), placed: (sim) => newUnits(sim, (u) => u.env === 'climate').length > 0,
        place: '<b>Drag</b> a column along the corridor\'s west side', placeD: 'On <b>F1</b>, press on the empty floor just left of the west corridor at the top, and drag straight down to the bottom. Unit doors must open onto the corridor.',
        extra: [{ t: 'Turn <b>Climate on</b>', d: 'In the action bar at the bottom, tap <b>Climate off</b> so it reads <b>Climate on</b>.', sel: '#abar [data-a="climate"]', done: (sim, ui) => (ui && ui.climate && ui.tool === 'iu5x5') || newUnits(sim, (u) => u.env === 'climate').length > 0 }] })
        .map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> again (units)', done: (sim, ui) => (tabIs(ui, 'build') && built(sim, 'light')) || toolIs(ui, 'iu5x5') || newUnits(sim, (u) => u.env === 'climate').length > 0 } : st),
      waitBuild('Let construction finish and the climate units open', (sim) => !!sim.s.milestones.first_climate),
    ],
    check: (sim) => !!sim.s.milestones.first_climate },
  { id: 'up', chapter: 'Lesson', offer: (sim) => ((sim.lostRecent(30).noReady || 0) + (sim.lostRecent(30).noSize || 0)) >= 8 && sim.objs('unit').length > 26, title: 'Build a working two-floor property',
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
// Card header and Tutorial-list group. Act beats read "Act I · Take Over · Beat 3" (beats numbered across the campaign,
// chapter breaks not counted); the not-yet-migrated remainder keeps its chapter with "Part n of N".
export const beatGroup = (b) => b.act ? `Act ${b.act} · ${b.chapter}` : b.chapter;
export function beatHeader(i) {
  const b = BEATS[i]; if (!b) return '';
  const n = BEATS.slice(0, i + 1).filter((x) => !x.brk).length, total = BEATS.filter((x) => !x.brk).length;
  return b.brk ? `${beatGroup(b)} · Chapter break` : b.act ? `${beatGroup(b)} · Beat ${n}` : `${b.chapter} · Part ${n} of ${total}`;
}

// Current step index: one past the last completed step (so completing a later step implies earlier ones).
export function tutorialText(sim, value) {
  return typeof value === 'string' ? value.replace(/\{occupancy\}/g, () => occLine(sim)).replace(/Unit (107|203)\b/g, (_, n) => {
    const u = unitByRole(sim, n === '107' ? 'mapleTurnover' : 'mapleInteriorMoveout');
    return u ? `Unit ${u.num}` : 'the tutorial unit';
  }) : value;
}
export function curBeat(sim) {
  const b=sim.s.lesson ? lessonById(sim.s.lesson.id) : sim.s.tut.on ? BEATS[tutBeatIndex(sim.s)] : null;
  if(!b)return null;
  const text = value => tutorialText(sim, value);
  return {...b,title:text(b.title),body:text(typeof b.body === 'function' ? b.body(sim) : b.body),steps:b.steps?.map(st=>({...st,t:text(st.t),d:text(st.d)}))};
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
  if (b.check(sim)) {
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
  // offers: at most one at a time, checked hourly, never during tutorial
  if (sim.mod % 60 !== 0 || s.creative) return;
  if (s.mode === 'tutorial' && !(s.tut && s.tut.done)) return;
  const lessonsDone = s.lessonsDone || {}, lessonsSeen = s.lessonsSeen || {};
  if (s.lessonOffer) return;
  for (const L of LESSONS) if (!lessonsDone[L.id] && !lessonsSeen[L.id] && lessonAllowed(sim, L) && L.offer && L.offer(sim)) { s.lessonOffer = L.id; sim.emit('lesson_offer', { id: L.id }); break; }
}
