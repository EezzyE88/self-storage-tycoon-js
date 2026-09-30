// Authored starting properties (GDD §5 Maple Street, §4 Empty Lot). Builds plain state directly.
import { newState, Sim, productKey } from './sim.js';
import { G, BILLING_CYCLE_DAYS, NAMES_FIRST, NAMES_LAST, MARKETS } from './data.js';

// MX: when set (to the map width), the authored layout is built mirrored left-to-right (acquired facilities)
let MX = 0;
const mx = (x, w = 1) => (MX ? MX - 1 - x - (w - 1) : x), md = (d) => (MX && d ? [-d[0], d[1]] : d);
function put(s, o) {
  const id = s.nextId++; o = { ...o };
  if (MX && o.x != null) { o.x = mx(o.x, o.w || 1); if (o.dir) o.dir = md(o.dir); if (o.door) o.door = { x: mx(o.door.x), y: o.door.y, dir: md(o.door.dir) }; }
  s.objects[id] = { id, cstate: 'operating', cond: 1, f: 0, ...o }; return s.objects[id];
}
function span(x0, x1) { return MX ? [mx(x1), mx(x0)] : [x0, x1]; }
function paint(s, x0, y0, x1, y1, g) { [x0, x1] = span(x0, x1); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.ground[y * s.W + x] = g; }
function hall(s, f, x0, y0, x1, y1) { [x0, x1] = span(x0, x1); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.hall[f][y * s.W + x] = 1; }

export function makeMaple(seed = 20260929, { mirror = false } = {}) {
  const s = newState({ mode: 'tutorial', seed, market: 'maple' });
  MX = mirror ? s.W : 0; if (mirror) s.mirror = true;
  try { return buildMaple(s, seed); } finally { MX = 0; }
}
function buildMaple(s, seed) {
  let r = seed >>> 0; const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const p = s.parcel; // x0=2 y0=2 x1=41 y1=29
  // --- access: gate + main aisle
  paint(s, 10, p.y1, 12, p.y1 + 1, G.ASPHALT);
  paint(s, 10, 4, 12, p.y1, G.ASPHALT);
  paint(s, 9, 22, 9, 27, G.PARKING);
  paint(s, 13, 15, 27, 17, G.ASPHALT);           // cross aisle to interior building
  paint(s, 18, 15, 21, 15, G.LOADING);           // loading stalls
  paint(s, 14, 13, 26, 14, G.CONCRETE);          // apron under the building front
  paint(s, 3, 27, 8, 28, G.CONCRETE);            // office walk
  put(s, { type: 'gate', x: 11, y: p.y1, open: 0, cond: 0.82 });
  const office = put(s, { type: 'office', x: 4, y: 23, w: 5, h: 4, door: { x: 9, y: 24, dir: [1, 0] } });
  // --- drive-up row (west of the main aisle), doors face east
  const drive = [];
  for (let k = 0; k < 6; k++) drive.push({ y: 4 + k * 2, size: '10x10', w: 2, h: 2, x: 8 });
  drive.push({ y: 16, size: '5x10', w: 2, h: 1, x: 8 }, { y: 17, size: '5x10', w: 2, h: 1, x: 8 });
  drive.push({ y: 18, size: '10x20', w: 4, h: 2, x: 6 });
  for (const d of drive) put(s, { type: 'unit', access: 'drive', env: 'std', size: d.size, x: d.x, y: d.y, w: d.w, h: d.h, dir: [1, 0], num: s.unitNo.drive++, commercial: 'none', lease: null });
  // --- interior building
  const shell = put(s, { type: 'shell', x: 15, y: 4, w: 11, h: 9, floors: 1 });
  hall(s, 0, 20, 5, 20, 12);                        // main hall
  hall(s, 0, 17, 5, 17, 12); hall(s, 0, 18, 12, 19, 12); // unfinished west corridor (dark, no units)
  for (let y = 5; y <= 11; y++) put(s, { type: 'unit', access: 'interior', env: 'std', size: '5x10', x: 18, y, w: 2, h: 1, dir: [1, 0], num: s.unitNo.interior++, commercial: 'none', lease: null });
  for (let y = 5; y <= 11; y++) put(s, { type: 'unit', access: 'interior', env: 'std', size: '5x10', x: 21, y, w: 2, h: 1, dir: [-1, 0], num: s.unitNo.interior++, commercial: 'none', lease: null });
  put(s, { type: 'door', kind: 'wide', x: 20, y: 12, dir: [0, 1] });
  put(s, { type: 'light', x: 20, y: 8, f: 0, cond: 0.93 });
  const corral = put(s, { type: 'corral', x: 22, y: 13, f: 0, name: 'Main Loading Corral', target: 2 });
  // --- exterior lights + camera
  put(s, { type: 'light', x: 9, y: 21, cond: 0.9 });
  put(s, { type: 'light', x: 13, y: 13, cond: 0.88 });
  put(s, { type: 'light', x: 9, y: 11, cond: 0.95 });
  put(s, { type: 'camera', x: 9, y: 28, cond: 0.9 });
  for (let k = 0; k < 3; k++) s.carts.push({ id: s.nextId++, st: 'corral', corral: corral.id, home: corral.id, f: 0, x: corral.x, y: corral.y, cond: 0.85 + rnd() * 0.1, uses: 0 });
  // --- tenants: everything leased except Unit 107
  const M = MARKETS.maple;
  for (const u of Object.values(s.objects).filter((o) => o.type === 'unit')) {
    u.name = 'Unit ' + u.num;
    if (u.num === 107) { u.commercial = 'unready'; u.vacatedAt = s.t - 900; continue; }
    const tn = { id: s.nextId++, name: `${NAMES_FIRST[Math.floor(rnd() * NAMES_FIRST.length)]} ${NAMES_LAST[Math.floor(rnd() * NAMES_LAST.length)]}`, sat: 0.74 + rnd() * 0.12, lease: null, since: -Math.floor(rnd() * 400) * 1440 };
    const legacy = rnd() < 0.4 ? 0.9 : 1;
    const L = { id: s.nextId++, unit: u.id, tenant: tn.id, rent: Math.round(M.rent[u.size] * legacy), start: 1 - Math.floor(rnd() * 400), nextBill: 1 + Math.floor(rnd() * BILLING_CYCLE_DAYS), status: 'current', balance: 0 };
    tn.lease = L.id; s.tenants[tn.id] = tn; s.leases[L.id] = L; u.lease = L.id; u.commercial = 'occupied';
  }
  const sim = new Sim(s);
  for (const u of sim.objs('unit')) u.cstate = 'operating';
  sim.s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
  sim.spawnStaffAgent(sim.s.staff[0]);
  const u107 = sim.objs('unit').find((u) => u.num === 107);
  sim.addTask({ type: 'makeready', need: 'makeready', obj: u107.id, label: 'Make-ready Unit 107', work: 150 });
  // seed today's visits so the lot feels alive at once
  sim.markDirty(); sim.rebuild();
  const day = 1;
  for (const tn of Object.values(s.tenants)) if (rnd() < 0.34) sim.schedule({ kind: rnd() < 0.15 ? 'bigaccess' : 'access', tenant: tn.id, unit: s.leases[tn.lease].unit }, sim.randomTime(day, 7.2, 20));
  // prospects for day 1 are generated on day rollover; tutorial schedules its own authored prospect
  s.days = [];
  return sim;
}

export function makeEmptyLot({ creative = false, seed = 777 } = {}) {
  const s = newState({ mode: 'sandbox', creative, seed, market: 'blank' });
  s.cash = creative ? 999999 : 60000;
  const sim = new Sim(s);
  sim.s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
  return sim;
}
