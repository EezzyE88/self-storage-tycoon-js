// Maple Street tutorial (GDD §5-7). Beats are real property needs with deterministic milestone checks.
// Authored world events (a keen prospect, a failing light, a move-out) use the normal simulation paths.
import { TOOLS } from './data.js';

const unitByNum = (sim, n) => sim.objs('unit').find((u) => u.num === n);
const createdSince = (sim, type, t) => sim.objs(type).some((o) => o.cstate === 'operating' && o.id > (sim.s.tut.idMark || 0));

export const BEATS = [
  { id: 'welcome', chapter: 'Take Control', title: 'Welcome to Maple Street Storage.',
    body: 'The property is already open. Most units are rented. One unit needs to be turned over before it can rent again.<br><br><b>Take a look around. Time is paused until you\'re ready.</b>',
    button: 'Look around', check: (sim) => sim.s.tut.flags.welcome },
  { id: 'makeready', chapter: 'Take Control', title: 'Turn over Unit 107',
    body: 'Tap <b>Unit 107</b> on the drive-up row (it has an amber make-ready tag). Choose <b>Start Owner Make-Ready</b>, then press <b>1x</b>, <b>2x</b> or <b>4x</b> to let time run.',
    focus: (sim) => ({ obj: unitByNum(sim, 107).id }), check: (sim) => unitByNum(sim, 107).commercial === 'ready' || !!unitByNum(sim, 107).lease },
  { id: 'lease', chapter: 'Take Control', title: 'Rent-ready units can lease',
    body: 'Asking rent affects how strongly the market responds. There is no single perfect price. A prospect is on the way to the office - watch for them.',
    enter: (sim) => { const t = sim.s.t; const m = t % 1440; const at = m < 8.5 * 60 ? t - m + 8.5 * 60 : m > 17 * 60 ? t - m + 1440 + 8.5 * 60 : t + 45; sim.schedule({ kind: 'prospect', size: '5x10', climate: false, keen: true }, at); },
    check: (sim) => !!sim.s.milestones.first_lease_after_turnover },
  { id: 'money', chapter: 'Take Control', title: 'Money without a spreadsheet',
    body: 'Open <b>Business</b>. Rent bills <b>monthly</b> on each lease\'s anniversary, while operating costs are charged <b>daily</b>. A quiet week can look negative while the business is healthy.',
    focus: () => ({ tab: 'business' }), check: (sim) => sim.s.tut.flags.businessOpened },
  { id: 'expand', chapter: 'Add Capacity', title: 'Maple Street is full',
    body: 'Every unit is leased and prospects are still asking. Open <b>Build &rarr; Units &rarr; Drive-Up 10x10</b> and drag a short row along the grass <b>east of the main aisle</b> (doors face the aisle). Review the preview, confirm, let construction finish, then tap the row and <b>Commission</b>.',
    focus: () => ({ tool: 'du10x10', cell: { x: 13, y: 22 } }), check: (sim) => !!sim.s.milestones.first_expansion },
  { id: 'interior', chapter: 'Make Interior Storage Work', title: 'How interior customers move',
    body: 'Tap the <b>Main Loading Corral</b> by the interior building. Then watch an interior customer: <b>vehicle &rarr; loading stall &rarr; cart &rarr; wide door &rarr; hallway &rarr; unit</b>. If the corral runs empty, customers wait or carry by hand.',
    enter: (sim) => { const tn = Object.values(sim.s.tenants).find((t) => { const u = sim.s.objects[sim.s.leases[t.lease].unit]; return u.access === 'interior'; }); if (tn) sim.schedule({ kind: 'bigaccess', tenant: tn.id, unit: sim.s.leases[tn.lease].unit }, sim.s.t + 30); },
    focus: (sim) => ({ obj: sim.objs('corral')[0] && sim.objs('corral')[0].id }), check: (sim) => sim.s.tut.flags.corralInspected && !!sim.s.milestones.first_cart_trip },
  { id: 'repair', chapter: 'Keep the Property Working', title: 'A hallway light has failed',
    body: 'The main hallway in the interior building just went dark - you can see it. Tap the <b>light</b> inside and choose <b>Send Owner</b>. If the Owner is busy, the job waits in the queue.',
    enter: (sim) => { const L = sim.objs('light').find((l) => l.x === 20 && l.y === 8); if (L) { sim.wear(L, L.cond - 0.1); sim.ensureRepairTask(L); sim.markDirty(); } },
    focus: (sim) => { const L = sim.objs('light').find((l) => l.x === 20 && l.y === 8); return { obj: L && L.id, view: 0 }; }, check: (sim) => !!sim.s.milestones.first_repair },
  { id: 'hire', chapter: 'Keep the Property Working', title: 'The Owner is the bottleneck',
    body: 'Two jobs are waiting and the Owner can only work one at a time. <b>Hiring help adds service capacity.</b> Open <b>Operate &rarr; Staff</b> and hire a <b>Porter</b>, then watch them pick up work on their own.',
    enter: (sim) => { const u = unitByNum(sim, 203); if (u && u.lease) { const L = sim.s.leases[u.lease]; const tn = sim.s.tenants[L.tenant]; tn.leaving = true; sim.schedule({ kind: 'moveout', tenant: tn.id, unit: u.id }, sim.s.t + 20); } for (let x = 18; x <= 21; x++) sim.s.dirt[0][15 * sim.s.W + x] = 0.7; },
    focus: () => ({ tab: 'operate' }), check: (sim) => !!sim.s.milestones.first_delegated },
  { id: 'quality', chapter: 'Improve Quality', title: 'Coverage you can see',
    body: 'Customers notice lighting and cameras. In <b>Operate</b>, switch on the <b>Security</b> overlay to see blind spots, then add a <b>Camera</b> or <b>Light</b> (Build &rarr; Access & Security) where coverage is weak - the loading apron is a good start.',
    check: (sim) => createdSince(sim, 'camera') || createdSince(sim, 'light') },
  { id: 'climate', chapter: 'Add Climate', title: 'Climate demand is worth serving',
    body: 'About a third of prospects want climate control and you have none. The interior building has an unfinished west corridor. Place an <b>HVAC Plant</b> on the grass beside the building, add a <b>Light</b> in the west corridor, then build <b>Interior 5x5 or 5x10 with Climate on</b> facing that corridor and commission them.',
    focus: () => ({ cell: { x: 16, y: 8 }, view: 0 }), check: (sim) => !!sim.s.milestones.first_climate },
  { id: 'up', chapter: 'Build Up', title: 'Land pressure: build vertically',
    body: 'Two-floor buildings double rentable area per parcel cell, but floor 2 needs an <b>elevator</b> - and carts take elevator space. On the east expansion land: extend a drive aisle, build a <b>2-floor shell</b>, a loading zone and <b>wide door</b>, hallways on <b>both floors</b> (use the floor selector), an elevator beside the halls, lights, then upper-floor units. Commission them.',
    focus: () => ({ cell: { x: 34, y: 12 } }), check: (sim) => !!sim.s.milestones.first_upper },
  { id: 'grad', chapter: 'Graduation', title: 'Maple Street graduates',
    body: 'You built, leased, maintained, delegated, diagnosed and expanded. Maple Street is yours now - keep operating it, try preventive maintenance with a Tech, or start an Empty Lot from the menu.',
    button: 'Keep playing', check: (sim) => sim.s.tut.flags.grad },
];

// Tool unlocks are problem-earned in the tutorial (GDD §42). Sandbox: everything.
const UNLOCK = [
  [4, ['aisle', 'du5x5', 'du5x10', 'du10x10', 'du10x20', 'demolish', 'walk', 'parking']],
  [5, ['corral', 'loading', 'canopy', 'hall', 'doorStd', 'doorWide', 'iu5x5', 'iu5x10', 'iu10x10', 'iu10x20']],
  [6, ['light']],
  [8, ['camera', 'keypad', 'doorAuto']],
  [9, ['hvac', 'shell1', 'power']],
  [10, ['shell2', 'elevator', 'stairs', 'water', 'restroom', 'fountain']],
];
export function toolUnlocked(sim, tool) {
  const s = sim.s; if (!s.tut.on) return true;
  if (tool === 'office' || tool === 'gate') return false;
  for (const [beat, tools] of UNLOCK) if (tools.includes(tool)) return s.tut.beat >= beat;
  return true;
}
export function unlockBeat(tool) { for (const [beat, tools] of UNLOCK) if (tools.includes(tool)) return beat; return 0; }

export function installTutorial(sim) {
  sim.onTick = (S) => tutorialTick(S);
}
export function tutorialTick(sim) {
  const s = sim.s; if (!s.tut.on || s.tut.done) return;
  const b = BEATS[s.tut.beat]; if (!b) return;
  if (!s.tut.entered) { s.tut.entered = true; s.tut.enteredAt = s.t; if (b.enter) b.enter(sim); sim.emit('tut_beat', { beat: s.tut.beat }); }
  if (b.check(sim)) {
    sim.emit('tut_done', { beat: s.tut.beat });
    s.tut.beat++; s.tut.entered = false; s.tut.idMark = s.nextId;
    if (s.tut.beat >= BEATS.length) { s.tut.done = true; s.tut.on = false; sim.milestone('graduated'); }
  }
}
