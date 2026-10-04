// Maple Street tutorial (GDD §5-7). Beats are real property needs with deterministic milestone checks.
// Authored world events (a keen prospect, a failing light, a move-out) use the normal simulation paths.
import { TOOLS } from './data.js';

const unitByNum = (sim, n) => sim.objs('unit').find((u) => u.num === n);
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
const readyUnit = (sim, pred = () => true) => newUnits(sim, (u) => u.cstate === 'ready' && pred(u))[0];
const TAB = (v) => `#tabs [data-v="${v}"]`, CAT = (v) => `.cats [data-v="${v}"]`, TOOL = (v) => `[data-a="tool"][data-v="${v}"]`;
const CONFIRM = '#abar [data-a="confirm"]', PLAY = '#speed [data-v="1"]', FAST = '#speed [data-v="4"]';
const COMMISSION = `[data-cmd*='"type":"commission"']`;

// Standard build sequence: open Build -> category -> tool -> place at the marker -> Confirm.
// `placed` = the order exists (later steps become meaningful once it does).
function buildSteps({ cat, catName, tool, toolName, place, placeD = '', cell, f = 0, placed, extra = [], after }) {
  const past = (sim, ui) => placed(sim) || toolIs(ui, tool);
  const steps = [
    { t: `Open <b>Build</b>`, d: 'Tap <b>Build</b> in the bottom bar.', sel: TAB('build'), done: (sim, ui) => tabIs(ui, 'build') || past(sim, ui) },
    { t: `Choose <b>${catName}</b>`, d: `In the Build panel, tap the <b>${catName}</b> category along the top. Swipe the category row sideways if you don't see it.`, sel: CAT(cat), done: (sim, ui) => catIs(ui, cat) || past(sim, ui) },
    { t: `Pick <b>${toolName}</b>`, d: `Tap the <b>${toolName}</b> card. The action bar opens at the bottom with the price.`, sel: TOOL(tool), done: past },
    ...extra,
    { t: place, d: placeD + ' The ring on the map marks the spot. The preview turns <b>green</b> when valid, <b>amber</b> if it will build but can\'t earn yet, <b>red</b> if it can\'t go there - the action bar says why.', cell, f, done: (sim, ui) => placed(sim) || planOk(ui, tool) },
    { t: 'Tap <b>Confirm</b>', d: 'Check the cost and "cash after" line in the action bar, then tap <b>Confirm</b>. You can undo within 30 minutes for a full refund.', sel: CONFIRM, done: placed },
  ];
  // A later build group only counts as progressing once the previous group is placed.
  return after ? steps.map((st) => ({ ...st, done: (sim, ui) => placed(sim) || (after(sim) && st.done(sim, ui)) })) : steps;
}
const waitBuild = (label, doneFn) => ({ t: label || 'Let construction finish', d: 'Construction takes game hours. Tap <b>4x</b> at the top to speed up. A progress ring shows over the site.', sel: FAST, done: doneFn });
const commissionStep = (pred, doneFn) => ({ t: 'Tap a new unit, then <b>Commission</b>', d: 'Tap one of the finished units on the map. In its panel tap <b>Commission whole order</b> (or <b>Commission unit</b>) to put it on the market.', obj: (sim) => { const u = readyUnit(sim, pred); return u && u.id; }, sel: COMMISSION, done: doneFn });

export const BEATS = [
  { id: 'welcome', chapter: 'Take Control', title: 'Welcome to Maple Street Storage',
    body: 'You own a small, working self-storage property. Most units are rented. Time is <b>paused</b> until you start the clock, so explore freely.',
    why: 'Everything on the map is real: customers drive in, open doors, use carts and pay rent. Each tutorial step tells you exactly where to tap.',
    steps: [
      { t: 'Look around the property', d: '<b>Drag</b> to pan (two fingers on a phone). <b>Pinch</b> or use the <b>+</b> / <b>−</b> buttons on the right to zoom. The curved arrows rotate the view.', done: (sim, ui) => ui && ui.tutLooked },
      { t: 'Tap <b>Look around</b> when ready', d: 'It\'s the yellow button below.', sel: '.tut [data-a="tutNext"]', done: (sim) => sim.s.tut.flags.welcome },
    ],
    button: 'Look around', check: (sim) => sim.s.tut.flags.welcome },
  { id: 'makeready', chapter: 'Take Control', title: 'Turn over Unit 107',
    body: 'A tenant moved out of Unit 107. It must be cleaned and checked (a <b>make-ready</b>) before it can rent again.',
    why: 'Vacant units earn nothing until they are rent-ready. Make-ready is the most common job on a storage property.',
    focus: (sim) => ({ obj: unitByNum(sim, 107).id }),
    steps: [
      { t: 'Tap <b>Unit 107</b>', d: 'It\'s on the drive-up row on the left, under the amber broom pin (the ring points at it). Tap the unit itself.', obj: (sim) => unitByNum(sim, 107).id, done: (sim, ui) => (ui && ui.sel === unitByNum(sim, 107).id) || !!(sim.s.tasks.find((t) => t.type === 'makeready' && t.obj === unitByNum(sim, 107).id) || {}).assigned || unitByNum(sim, 107).commercial === 'ready' },
      { t: 'Tap <b>Start Owner Make-Ready</b>', d: 'In the unit panel that opened, tap the big <b>Start Owner Make-Ready</b> button at the top. The Owner (you) walks over to do the job.', sel: `[data-cmd*='"ownerMakeReady"']`, done: (sim) => !!(sim.s.tasks.find((t) => t.type === 'makeready' && t.obj === unitByNum(sim, 107).id) || {}).assigned || unitByNum(sim, 107).commercial === 'ready' },
      { t: 'Start the clock: tap <b>1x</b>', d: 'The speed controls are at the <b>top right</b>. <b>1x</b> is normal, <b>2x</b> and <b>4x</b> are faster, the pause icon stops time.', sel: PLAY, done: (sim) => running(sim) || unitByNum(sim, 107).commercial === 'ready' },
      { t: 'Watch the Owner finish', d: 'The Owner walks from the office to Unit 107. The pin fills as work progresses (about 2-3 game hours). Use <b>4x</b> to hurry.', obj: (sim) => unitByNum(sim, 107).id, done: (sim) => unitByNum(sim, 107).commercial === 'ready' || !!unitByNum(sim, 107).lease },
    ],
    check: (sim) => unitByNum(sim, 107).commercial === 'ready' || !!unitByNum(sim, 107).lease },
  { id: 'lease', chapter: 'Take Control', title: 'Rent-ready units can lease',
    body: 'Unit 107 is on the market. A prospect is driving over to the office to rent it.',
    why: 'Prospects compare your asking rent with the market. Price higher and fewer sign; price lower and you fill faster but earn less. Change asking rents later in <b>Business &rarr; Asking rents</b>.',
    enter: (sim) => { const t = sim.s.t; const m = t % 1440; const at = m < 8.5 * 60 ? t - m + 8.5 * 60 : m > 17 * 60 ? t - m + 1440 + 8.5 * 60 : t + 45; sim.schedule({ kind: 'prospect', size: '5x10', climate: false, keen: true }, at); },
    steps: [
      { t: 'Keep time running', d: 'If paused, tap <b>1x</b> or faster at the top right. The office opens at 8:30 AM.', sel: PLAY, done: (sim) => running(sim) || sim.s.agents.some((a) => a.kind === 'cust' && a.vt === 'prospect') || !!sim.s.milestones.first_lease_after_turnover },
      { t: 'Watch for the prospect', d: 'A car enters through the gate at the bottom, parks by the <b>Office</b> (lower left) and the customer walks inside.', done: (sim) => sim.s.agents.some((a) => a.kind === 'cust' && a.vt === 'prospect') || !!sim.s.milestones.first_lease_after_turnover },
      { t: 'They sign a lease', d: 'At the counter they pick a unit. A green <b>+$/mo</b> pop shows the new rent, and the feed on the right logs the lease.', done: (sim) => !!sim.s.milestones.first_lease_after_turnover },
    ],
    check: (sim) => !!sim.s.milestones.first_lease_after_turnover },
  { id: 'money', chapter: 'Take Control', title: 'Money without a spreadsheet',
    body: 'Your first new lease is signed. Here\'s where to see how the business is doing.',
    why: 'Rent bills <b>monthly</b> on each lease\'s anniversary, while operating costs are charged <b>daily</b>. A quiet week can look negative while the business is healthy - watch the <b>rent roll</b> and <b>occupancy</b>.',
    focus: () => ({ tab: 'business' }),
    steps: [
      { t: 'Open <b>Business</b>', d: 'Tap <b>Business</b> in the bottom bar (the bar-chart icon).', sel: TAB('business'), done: (sim, ui) => sim.s.tut.flags.businessOpened },
      { t: 'Read the cards, then tap <b>Got it</b>', d: '<b>Rent roll</b> is monthly rent from all leases. <b>Occupancy</b> is the share of units leased. Scroll down to the <b>Operating statement</b> for the last 30 days: rent in, costs out. Tap <b>Got it</b> on this card when done.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => sim.s.tut.flags.moneyAck },
    ],
    button: 'Got it', buttonWhen: (sim) => sim.s.tut.flags.businessOpened, flag: 'moneyAck',
    check: (sim) => sim.s.tut.flags.businessOpened && sim.s.tut.flags.moneyAck },
  { id: 'expand', chapter: 'Add Capacity', title: 'Maple Street is full',
    body: 'Every unit is leased and prospects are still asking. Build a new row of drive-up units on the empty grass east of the main aisle.',
    why: 'Drive-up units are cheap and simple: they only need a <b>drive aisle</b> in front of their doors. New units earn nothing until built <b>and</b> commissioned.',
    focus: () => ({ tool: 'du10x10', cell: { x: 13, y: 22 } }),
    steps: [
      ...buildSteps({ cat: 'units', catName: 'Units', tool: 'du10x10', toolName: 'Drive-Up 10x10', cell: { x: 13, y: 21 }, placed: (sim) => ordered(sim, 'du10x10'),
        place: '<b>Drag</b> a row down the grass beside the main aisle', placeD: 'Press on the grass touching the east edge of the main aisle, just below the cross aisle, and drag straight down about 8 cells. Doors must face the aisle - tap <b>Flip doors</b> if they don\'t.' }),
      waitBuild('Let construction finish', (sim) => newUnits(sim).some((u) => u.cstate !== 'construction') || !!sim.s.milestones.first_expansion),
      commissionStep(() => true, (sim) => !!sim.s.milestones.first_expansion),
    ],
    check: (sim) => !!sim.s.milestones.first_expansion },
  { id: 'repair', chapter: 'Keep the Property Working', title: 'A hallway light has failed',
    body: 'The main hallway in the interior building just went dark. Dark hallways feel unsafe and customers notice.',
    why: 'Equipment wears out over time. Failures create jobs in the queue (<b>Operate &rarr; Jobs</b>). The Owner can fix simple things; a Tech or vendor handles the rest.',
    enter: (sim) => { const L = hallLight(sim); if (L) { sim.wear(L, L.cond - 0.1); sim.ensureRepairTask(L); sim.markDirty(); } },
    focus: (sim) => { const L = hallLight(sim); return { obj: L && L.id, view: 0 }; },
    steps: [
      { t: 'Look inside: tap <b>F1</b>', d: 'On the right-hand rail, <b>EXT</b> shows roofs; <b>F1</b> lifts the roof so you see inside floor 1.', sel: '#floors [data-v="0"]', done: (sim, ui) => (ui && ui.rend && ui.rend.view === 0) || !!(repairTask(sim, hallLight(sim)) || {}).assigned || !!sim.s.milestones.first_repair },
      { t: 'Tap the broken <b>light</b>', d: 'It\'s in the middle of the main hallway, under the red wrench pin (the ring marks it).', obj: (sim) => hallLight(sim) && hallLight(sim).id, done: (sim, ui) => (ui && hallLight(sim) && ui.sel === hallLight(sim).id) || !!(repairTask(sim, hallLight(sim)) || {}).assigned || !!sim.s.milestones.first_repair },
      { t: 'Tap <b>Send Owner</b>', d: 'In the light\'s panel, tap <b>Send Owner</b>. If the Owner is busy, the job waits its turn.', sel: `[data-cmd*='"ownerTask"']`, done: (sim) => !!(repairTask(sim, hallLight(sim)) || {}).assigned || !!sim.s.milestones.first_repair },
      { t: 'Let the Owner fix it', d: 'Keep time running. The Owner walks in through the wide door and repairs the light (sparks when done).', sel: PLAY, done: (sim) => !!sim.s.milestones.first_repair },
    ],
    check: (sim) => !!sim.s.milestones.first_repair },
  { id: 'hire', chapter: 'Keep the Property Working', title: 'The Owner is the bottleneck',
    body: 'Unit 203 just moved out and the loading area is dirty. Two jobs, and the Owner can only do one at a time.',
    why: '<b>Hiring adds service capacity.</b> Porters clean and turn over units; Techs repair equipment; Clerks run the counter; Managers handle routine decisions. Each has a daily wage.',
    enter: (sim) => { const u = unitByNum(sim, 203); if (u && u.lease) { const L = sim.s.leases[u.lease]; const tn = sim.s.tenants[L.tenant]; tn.leaving = true; sim.schedule({ kind: 'moveout', tenant: tn.id, unit: u.id }, sim.s.t + 20); } for (let x = 18; x <= 21; x++) sim.s.dirt[0][15 * sim.s.W + x] = 0.7; },
    focus: () => ({ tab: 'operate' }),
    steps: [
      { t: 'Open <b>Operate</b>', d: 'Tap <b>Operate</b> in the bottom bar (the person icon; the red badge counts waiting jobs).', sel: TAB('operate'), done: (sim, ui) => tabIs(ui, 'operate') || sim.s.staff.some((x) => x.role === 'porter') },
      { t: 'Tap <b>Hire Porter</b>', d: 'Scroll down to <b>Staff</b> in the Operate panel and tap <b>Hire Porter</b>. The price shows the daily wage.', sel: `[data-cmd*='"role":"porter"']`, done: (sim) => sim.s.staff.some((x) => x.role === 'porter') },
      { t: 'Watch the Porter work', d: 'Keep time running. The Porter walks out of the office and picks up the cleaning or the make-ready on their own.', sel: PLAY, done: (sim) => !!sim.s.milestones.first_delegated },
    ],
    check: (sim) => !!sim.s.milestones.first_delegated },
  { id: 'grad', chapter: 'Graduation', title: 'Maple Street graduates',
    body: 'You turned over a unit, leased it, read the money, expanded, fixed a failure and hired help. Maple Street is yours now. From here the market pushes back: seasons, competitors and reviews.',
    why: 'Optional <b>lessons</b> (interior carts, security, climate, building up, collections, loans) are offered when the situation comes up, or anytime from <b>Growth &rarr; Lessons</b>. A <b>report card</b> arrives every 30 days in <b>Business</b>.',
    steps: [{ t: 'Tap <b>Keep playing</b>', d: 'The tutorial closes and every tool is unlocked.', sel: '.tut [data-a="tutNext"]', done: (sim) => sim.s.tut.flags.grad }],
    button: 'Keep playing', check: (sim) => sim.s.tut.flags.grad },
];

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
      { t: 'Turn on the <b>Security</b> overlay', d: 'Scroll to <b>Overlays</b> in the Operate panel and tap <b>Security</b>. Covered ground glows; uncovered ground stays dark.', sel: '[data-a="overlay"][data-v="security"]', done: (sim, ui) => (ui && ui.rend && ui.rend.overlay === 'security') || ordered(sim, 'camera') || ordered(sim, 'light') },
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
      ...buildSteps({ cat: 'interior', catName: 'Interior', tool: 'iu5x5', toolName: 'Interior 5x5', cell: { x: 16, y: 8 }, f: 0, after: (sim) => built(sim, 'light'), placed: (sim) => newUnits(sim, (u) => u.env === 'climate').length > 0,
        place: '<b>Drag</b> a column along the corridor\'s west side', placeD: 'On <b>F1</b>, press on the empty floor just left of the west corridor at the top, and drag straight down to the bottom. Unit doors must open onto the corridor.',
        extra: [{ t: 'Turn <b>Climate on</b>', d: 'In the action bar at the bottom, tap <b>Climate off</b> so it reads <b>Climate on</b>.', sel: '#abar [data-a="climate"]', done: (sim, ui) => (ui && ui.climate && ui.tool === 'iu5x5') || newUnits(sim, (u) => u.env === 'climate').length > 0 }] })
        .map((st, i) => i === 0 ? { ...st, t: 'Open <b>Build</b> again (units)', done: (sim, ui) => (tabIs(ui, 'build') && built(sim, 'light')) || toolIs(ui, 'iu5x5') || newUnits(sim, (u) => u.env === 'climate').length > 0 } : st),
      waitBuild('Let construction finish', (sim) => newUnits(sim, (u) => u.env === 'climate').some((u) => u.cstate !== 'construction') || !!sim.s.milestones.first_climate),
      commissionStep((u) => u.env === 'climate', (sim) => !!sim.s.milestones.first_climate),
    ],
    check: (sim) => !!sim.s.milestones.first_climate },
  { id: 'up', chapter: 'Lesson', offer: (sim) => ((sim.lostRecent(30).noReady || 0) + (sim.lostRecent(30).noSize || 0)) >= 8 && sim.objs('unit').length > 26, title: 'Land pressure: build vertically',
    body: 'Build a <b>two-floor</b> building on the empty land to the east. Each piece is one step; the rings show where.',
    why: 'Two floors double the rentable area per cell of land. Floor 2 customers need an <b>elevator</b>, and carts take elevator space, so place it next to the hallway near the door.',
    focus: () => ({ cell: { x: 33, y: 11 } }),
    steps: [
      ...buildSteps({ cat: 'roads', catName: 'Roads & Loading', tool: 'aisle', toolName: 'Drive Aisle', cell: { x: 33, y: 16 }, placed: (sim) => ordered(sim, 'aisle'), place: '<b>Drag</b> east from the end of the cross aisle', placeD: 'Press on the grass right where the cross aisle ends (east of the interior building) and drag east about 10 cells, the same 3 rows tall as the cross aisle.' }),
      ...buildSteps({ cat: 'buildings', catName: 'Buildings', tool: 'shell2', toolName: 'Building Shell (2 floors)', cell: { x: 33, y: 10 }, after: (sim) => built(sim, 'aisle'), placed: (sim) => ordered(sim, 'shell2'), place: '<b>Drag</b> a rectangle north of the new aisle', placeD: 'Drag a rectangle about 9 wide by 9 tall on the grass directly above the new aisle, so its south wall touches the aisle.' }).slice(0).map((st, i) => i === 0 ? { ...st, done: (sim, ui) => (tabIs(ui, 'build') && ordered(sim, 'aisle')) || ordered(sim, 'shell2') || toolIs(ui, 'shell2') } : st),
      { t: 'Build a <b>Hallway</b> on floor 1', d: 'Tap <b>F1</b> on the right rail. Then <b>Build &rarr; Interior &rarr; Hallway</b> and drag a line north-south through the middle of the shell to its south wall, then <b>Confirm</b>.', sel: TOOL('hall'), cell: { x: 33, y: 10 }, f: 0, done: (sim) => ordered(sim, 'hall') },
      { t: 'Add a <b>Wide Sliding Door</b>', d: '<b>Build &rarr; Interior &rarr; Wide Sliding Door</b>. Tap the hallway\'s end on the south wall, then <b>Confirm</b>.', sel: TOOL('doorWide'), cell: { x: 33, y: 14 }, done: (sim) => ordered(sim, 'doorWide') },
      { t: 'Add a <b>Loading Zone</b>', d: '<b>Build &rarr; Roads & Loading &rarr; Loading Zone</b>. Drag 3 cells on the new aisle right below the door, then <b>Confirm</b>.', sel: TOOL('loading'), cell: { x: 33, y: 15 }, done: (sim) => ordered(sim, 'loading') },
      { t: 'Switch to <b>F2</b> and build its hallway', d: 'Tap <b>F2</b> on the right rail. <b>Build &rarr; Interior &rarr; Hallway</b>, drag the same line as floor 1, then <b>Confirm</b>.', sel: '#floors [data-v="1"]', cell: { x: 33, y: 10 }, f: 1, done: (sim) => built(sim, 'hall', 1) },
      { t: 'Add an <b>Elevator</b>', d: '<b>Build &rarr; Interior &rarr; Elevator</b>. Tap the cell right beside the hallway near the door, then <b>Confirm</b>. It serves both floors.', sel: TOOL('elevator'), cell: { x: 34, y: 13 }, done: (sim) => ordered(sim, 'elevator') },
      { t: 'Light <b>both</b> hallways', d: '<b>Build &rarr; Access & Security &rarr; Light</b>. Tap the hallway on F2, <b>Confirm</b>; switch to <b>F1</b> and do the same.', sel: TOOL('light'), cell: { x: 33, y: 9 }, done: (sim) => built(sim, 'light', 0) && built(sim, 'light', 1) },
      { t: 'Build units on <b>F2</b>', d: 'Tap <b>F2</b>. <b>Build &rarr; Interior &rarr; Interior 5x5</b> and drag a column along one side of the hallway, then <b>Confirm</b>. Repeat on the other side if you like.', sel: '#floors [data-v="1"]', cell: { x: 32, y: 10 }, f: 1, done: (sim) => newUnits(sim, (u) => (u.f || 0) > 0).length > 0 },
      waitBuild('Let construction finish', (sim) => newUnits(sim, (u) => (u.f || 0) > 0).some((u) => u.cstate !== 'construction') || !!sim.s.milestones.first_upper),
      commissionStep((u) => (u.f || 0) > 0, (sim) => !!sim.s.milestones.first_upper),
    ],
    check: (sim) => !!sim.s.milestones.first_upper },

  { id: 'collections', chapter: 'Lesson', title: 'When rent goes unpaid', generic: true,
    body: 'An account is falling behind. Unpaid rent climbs a ladder: past due, delinquent (locked out), lien, notice, then auction.',
    why: 'You set the policies (late fee, overlocks, automatic notices, auction or clean-out) and handle the exceptions. A payment plan often saves the tenant and the money.',
    offer: (sim) => Object.values(sim.s.leases).some((L) => ['delinquent', 'lien'].includes(L.status)),
    steps: [
      { t: 'Open <b>Business</b>', d: 'Tap <b>Business</b> in the bottom bar.', sel: TAB('business'), done: (sim, ui) => tabIs(ui, 'business') || ctx(sim).flags.collAck },
      { t: 'Find <b>Collections</b>', d: 'Scroll down to the <b>Collections</b> ladder. Each rung counts accounts at that stage; the list below has actions for each account (notice, plan, waive, unlock).', sel: '.ladder', done: (sim) => ctx(sim).flags.collAck },
      { t: 'Tap <b>Got it</b>', d: 'Or act on an account first. The button is on this card.', sel: '.tut [data-a="tutNext"]', lbl: 'Got it', done: (sim) => ctx(sim).flags.collAck },
    ],
    button: 'Got it', flag: 'collAck', check: (sim) => ctx(sim).flags.collAck },
  { id: 'financing', chapter: 'Lesson', title: 'Paying for growth', generic: true,
    body: 'Expansion costs more than a month of rent. A term loan spreads it over 60 months; the credit line covers short gaps.',
    why: 'The bank approves loans whose payments stay under 45% of your rent roll. Loan buttons show the monthly payment and your cash after, before you commit. Borrow when new units will earn more than the payment.',
    offer: (sim) => sim.day >= (ctx(sim).gradDay || 0) + 12 || sim.s.cash < 3000,
    steps: [
      { t: 'Open <b>Business</b>', d: 'Tap <b>Business</b> in the bottom bar.', sel: TAB('business'), done: (sim, ui) => tabIs(ui, 'business') || ctx(sim).flags.finAck },
      { t: 'Find <b>Financing</b>', d: 'Tap the <b>Financing</b> shortcut. Each option shows the payment and cash after. Take an optional loan, or tap <b>Continue without borrowing</b> on this lesson.', sel: '.loanopts button', lbl: 'Optional loan', done: (sim) => ctx(sim).flags.finAck },
      { t: 'Continue without borrowing', d: 'Borrowing is optional. Use the button on this lesson.', sel: '.tut [data-a="tutNext"]', lbl: 'Continue', done: (sim) => ctx(sim).flags.finAck },
    ],
    button: 'Continue without borrowing', flag: 'finAck', check: (sim) => ctx(sim).flags.finAck },
];
export const lessonById = (id) => LESSONS.find((l) => l.id === id);

// Current step index: one past the last completed step (so completing a later step implies earlier ones).
export function curBeat(sim) { return sim.s.lesson ? lessonById(sim.s.lesson.id) : sim.s.tut.on ? BEATS[sim.s.tut.beat] : null; }
export function stepState(sim, ui) {
  const b = curBeat(sim); if (!b || !b.steps) return { b, cur: -1, done: [] };
  const done = b.steps.map((st) => { try { return !!st.done(sim, ui); } catch (e) { return false; } });
  let last = -1; for (let i = 0; i < done.length; i++) if (done[i]) last = i;
  return { b, cur: Math.min(last + 1, b.steps.length - 1), done, all: last === b.steps.length - 1 };
}

// Tool unlocks are problem-earned in the tutorial (GDD §42). Sandbox: everything.
const UNLOCK = [
  [4, ['aisle', 'du5x5', 'du5x10', 'du10x10', 'du10x20', 'demolish', 'walk', 'parking']],
  [5, ['light']],
]; // everything else unlocks at graduation
export function toolUnlocked(sim, tool) {
  const s = sim.s; if (!s.tut.on) return true;
  if (tool === 'office' || tool === 'gate') return false;
  for (const [beat, tools] of UNLOCK) if (tools.includes(tool)) return s.tut.beat >= beat;
  return false;
}
export function unlockBeat(tool) { for (const [beat, tools] of UNLOCK) if (tools.includes(tool)) return beat; return BEATS.length - 1; }

export function installTutorial(sim) {
  sim.onTick = (S) => { tutorialTick(S); lessonTick(S); };
}
export function tutorialTick(sim) {
  const s = sim.s; if (!s.tut.on || s.tut.done) return;
  const b = BEATS[s.tut.beat]; if (!b) return;
  if (!s.tut.entered) { s.tut.entered = true; s.tut.enteredAt = s.t; if (b.enter) b.enter(sim); sim.emit('tut_beat', { beat: s.tut.beat }); }
  if (b.check(sim)) {
    sim.emit('tut_done', { beat: s.tut.beat });
    s.tut.beat++; s.tut.entered = false; s.tut.idMark = s.nextId;
    if (s.tut.beat >= BEATS.length) { s.tut.done = true; s.tut.on = false; s.tut.gradDay = sim.day; sim.milestone('graduated'); }
  }
}

export const lessonAllowed = (sim, L) => L && (L.generic || (sim.s.market.id === 'maple' && !sim.s.mirror && sim.s.tut && sim.s.tut.done && sim.s.mode === 'tutorial'));
export function lessonTick(sim) {
  const s = sim.s; if ((s.tut && s.tut.on) || s.scenario) return;
  const ls = s.lesson;
  if (ls) {
    const b = lessonById(ls.id); if (!b) { s.lesson = null; return; }
    if (!ls.entered) { ls.entered = true; if (b.enter) b.enter(sim); sim.emit('tut_beat', { lesson: ls.id }); }
    if (b.check(sim)) { s.lessonsDone = s.lessonsDone || {}; s.lessonsDone[ls.id] = sim.day; s.lesson = null; sim.emit('lesson_done', { id: ls.id, title: b.title }); }
    return;
  }
  // offers: at most one at a time, checked hourly, never during tutorial
  if (sim.mod % 60 !== 0 || s.creative) return;
  if (s.mode === 'tutorial' && !(s.tut && s.tut.done)) return;
  s.lessonsDone = s.lessonsDone || {}; s.lessonsSeen = s.lessonsSeen || {};
  if (s.lessonOffer) return;
  for (const L of LESSONS) if (!s.lessonsDone[L.id] && !s.lessonsSeen[L.id] && lessonAllowed(sim, L) && L.offer && L.offer(sim)) { s.lessonOffer = L.id; sim.emit('lesson_offer', { id: L.id }); break; }
}
