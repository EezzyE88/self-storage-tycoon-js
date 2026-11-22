// SK-02 site identity (S1 proof, local only): three frozen public-office sites for the
// scenario-kit scenarios. Each site registers one frontage descriptor through the
// existing registry (js/frontage.js); nothing here changes shared office-placement code.
// Saves store only s.layout. Geometry under an id never changes: new geometry, new id.
import { registerFrontage, frontageOf } from './frontage.js';
import { G } from './data.js';
import { nameUnit } from './unitnumbering.js';

const row = (n, f) => Array.from({ length: n }, (_, k) => f(k));
const tap = (tool, x, y, f = 0) => ({ tool, a: { x, y }, b: { x, y }, f });

// ---------------------------------------------------------------- Grand Opening: Larkfield Commons
export const GO_SITE_LAYOUT = 'grand-opening-office-v1';
const GO_FRONTAGE = {
  id: GO_SITE_LAYOUT,
  pocket: { x0: 14, x1: 27, y0: 20, y1: 29 }, throat: { x0: 14, x1: 17 },
  bays: [{ x0: 14, x1: 15, y0: 21, y1: 24 }, { x0: 16, x1: 17, y0: 21, y1: 24 }, { x0: 24, x1: 25, y0: 21, y1: 24 }, { x0: 26, x1: 27, y0: 21, y1: 24 }],
  office: { x: 18, y: 20, w: 6, h: 4, door: { x: 20, y: 24, dir: [0, 1] }, staffDoor: { x: 21, y: 19, dir: [0, -1] } },
  gate: { kind: 'recessed', x: 32, y: 23, lanes: { x0: 28, x1: 33, y0: 18, y1: 29 }, approachY: 24,
    inbound: { x0: 31, x1: 33 }, outbound: { x0: 28, x1: 30 }, yardRow: 17, junction: { x0: 28, x1: 33, y0: 15, y1: 17 }, staffCrossX: 33, serviceX: 34 },
  // The centred office stands on the pocket's north edge: the middle run is drawn
  // only while no office stands (a zero-length render run is skipped by buildFence).
  fence: [{ run: [14, 30, 14, 20] }, { run: [14, 20, 18, 20] }, { run: [18, 20, 24, 20], office: [18, 20, 18, 20] }, { run: [24, 20, 28, 20] }, { run: [28, 20, 28, 24] }, { run: [34, 24, 34, 30] }],
  gateLine: [28, 24, 34, 24], frontGap: [14, 34], crosswalks: [{ x: 20, y0: 25, y1: 29 }], yardEdgeY: 18,
  gatePlacementBlocked: { x0: 14, x1: 33 }, camera: { x: 21, y: 24 },
  keepClear: [{ x0: 20, x1: 21, y0: 25, y1: 29, why: 'office walk' }, { x0: 31, x1: 33, y0: 24, y1: 29, why: 'gate stacking' }, { x0: 14, x1: 27, y0: 25, y1: 29, why: 'public driveway' }, { x0: 17, x1: 24, y0: 13, y1: 14, why: 'building loading' }],
  keepClearRule: 'refuse',
};
const GO_YARD = {
  aisles: [[3, 38, 15, 17], [3, 38, 3, 4], [3, 4, 3, 17], [37, 38, 3, 17]],
  pads: [[17, 24, 13, 14, G.LOADING], [21, 21, 18, 19, G.CONCRETE], [29, 29, 7, 9, G.CONCRETE]],
  units: [
    ...row(4, (k) => ({ size: '10x10', x: 5 + k * 2, y: 5, w: 2, h: 2, dir: [0, -1] })),
    ...row(4, (k) => ({ size: '10x10', x: 5 + k * 2, y: 13, w: 2, h: 2, dir: [0, 1] })),
    ...row(3, (k) => ({ size: '10x10', x: 5, y: 7 + k * 2, w: 2, h: 2, dir: [-1, 0] })),
    { size: '10x20', x: 30, y: 5, w: 4, h: 2, dir: [0, -1] }, { size: '10x10', x: 34, y: 5, w: 2, h: 2, dir: [0, -1] },
    { size: '10x20', x: 30, y: 13, w: 4, h: 2, dir: [0, 1] }, { size: '10x10', x: 34, y: 13, w: 2, h: 2, dir: [0, 1] },
    ...row(3, (k) => ({ size: '10x10', x: 35, y: 7 + k * 2, w: 2, h: 2, dir: [1, 0] })),
  ],
  lights: [[8, 16], [20, 16], [33, 16], [10, 3], [30, 3]], cams: [[6, 16], [36, 16]],
  // one-story climate building, fitted out through the production build rules
  fitout: [
    { tool: 'shell1', a: { x: 13, y: 5 }, b: { x: 28, y: 12 } },
    { tool: 'hall', a: { x: 14, y: 7 }, b: { x: 27, y: 7 } },
    { tool: 'hall', a: { x: 14, y: 10 }, b: { x: 27, y: 10 } },
    { tool: 'hall', a: { x: 20, y: 7 }, b: { x: 21, y: 12 } },
    tap('doorAuto', 20, 12), tap('hvac', 29, 8),
    ...[[17, 7], [24, 7], [16, 10], [25, 10], [21, 11]].map(([x, y]) => tap('light', x, y)),
    tap('camera', 21, 8),
    { tool: 'iu10x10', a: { x: 14, y: 6 }, b: { x: 27, y: 6 }, climate: true },
    { tool: 'iu5x10', a: { x: 14, y: 8 }, b: { x: 19, y: 8 }, climate: true },
    { tool: 'iu5x10', a: { x: 22, y: 8 }, b: { x: 27, y: 8 }, climate: true },
    { tool: 'iu5x5', a: { x: 14, y: 11 }, b: { x: 19, y: 11 }, climate: true },
    tap('corral', 24, 13),
  ],
  carts: 3,
};

// ---------------------------------------------------------------- Storm Season: highway yard
export const SS_SITE_LAYOUT = 'storm-season-office-v1';
const SS_FRONTAGE = {
  id: SS_SITE_LAYOUT,
  pocket: { x0: 34, x1: 40, y0: 22, y1: 29 }, throat: { x0: 38, x1: 40 },
  bays: [{ x0: 34, x1: 35, y0: 25, y1: 28 }, { x0: 36, x1: 37, y0: 25, y1: 28 }],
  office: { x: 37, y: 22, w: 4, h: 3, door: { x: 36, y: 23, dir: [-1, 0] }, staffDoor: { x: 38, y: 21, dir: [0, -1] } },
  gate: { kind: 'recessed', x: 32, y: 21, lanes: { x0: 28, x1: 33, y0: 16, y1: 29 }, approachY: 22,
    inbound: { x0: 31, x1: 33 }, outbound: { x0: 28, x1: 30 }, yardRow: 15, junction: { x0: 28, x1: 33, y0: 13, y1: 15 }, staffCrossX: 33, serviceX: 27 },
  fence: [{ run: [41, 30, 41, 22], office: [41, 30, 41, 25] }, { run: [34, 22, 41, 22], office: [34, 22, 37, 22] }, { run: [28, 22, 28, 30] }],
  gateLine: [28, 22, 34, 22], frontGap: [28, 41], crosswalks: [], yardEdgeY: 16,
  gatePlacementBlocked: { x0: 28, x1: 40 }, camera: { x: 36, y: 24 },
  keepClear: [{ x0: 36, x1: 36, y0: 24, y1: 24, why: 'office walk' }, { x0: 31, x1: 33, y0: 22, y1: 29, why: 'gate stacking' }, { x0: 38, x1: 40, y0: 25, y1: 29, why: 'public driveway' }, { x0: 3, x1: 26, y0: 27, y1: 29, why: 'drainage ditch' }],
  keepClearRule: 'refuse',
};
const SS_YARD = {
  aisles: [[3, 40, 13, 15], [3, 4, 13, 24], [3, 27, 22, 24], [3, 40, 4, 6], [39, 40, 4, 15]],
  pads: [[38, 38, 16, 21, G.CONCRETE]],
  units: [
    ...row(6, (k) => ({ size: '10x20', x: 3 + k * 4, y: 25, w: 4, h: 2, dir: [0, -1] })),
    ...row(4, (k) => ({ size: '10x20', x: 3 + k * 4, y: 2, w: 4, h: 2, dir: [0, 1] })),
    ...row(12, (k) => ({ size: '10x10', x: 3 + k * 2, y: 11, w: 2, h: 2, dir: [0, 1] })),
    ...row(14, (k) => ({ size: '5x10', x: 3 + k, y: 7, w: 1, h: 2, dir: [0, -1] })),
  ],
  lights: [[10, 14], [24, 14], [36, 14], [12, 5], [30, 5], [14, 23], [38, 18]], cams: [[6, 14], [24, 5], [26, 23]],
};

// ---------------------------------------------------------------- The Chain Next Door: urban storefront
export const CN_SITE_LAYOUT = 'chain-next-door-office-v1';
const CN_FRONTAGE = {
  id: CN_SITE_LAYOUT,
  pocket: { x0: 3, x1: 13, y0: 23, y1: 29 }, throat: { x0: 10, x1: 13 },
  bays: [{ x0: 10, x1: 11, y0: 24, y1: 27 }, { x0: 12, x1: 13, y0: 24, y1: 27 }],
  office: { x: 3, y: 23, w: 7, h: 6, door: { x: 6, y: 29, dir: [0, 1] }, staffDoor: { x: 2, y: 24, dir: [-1, 0] } },
  gate: { kind: 'recessed', x: 18, y: 24, lanes: { x0: 14, x1: 19, y0: 19, y1: 29 }, approachY: 25,
    inbound: { x0: 17, x1: 19 }, outbound: { x0: 14, x1: 16 }, yardRow: 18, junction: { x0: 14, x1: 19, y0: 17, y1: 18 }, staffCrossX: 19, serviceX: 20 },
  fence: [{ run: [3, 30, 3, 23], office: [3, 30, 3, 29] }, { run: [3, 23, 14, 23], office: [10, 23, 14, 23] }, { run: [14, 23, 14, 25] }, { run: [20, 25, 20, 30] }],
  gateLine: [14, 25, 20, 25], frontGap: [3, 20], crosswalks: [], yardEdgeY: 19,
  gatePlacementBlocked: { x0: 3, x1: 19 }, camera: { x: 9, y: 26 },
  keepClear: [{ x0: 3, x1: 9, y0: 29, y1: 29, why: 'storefront walk' }, { x0: 17, x1: 19, y0: 25, y1: 29, why: 'gate stacking' }, { x0: 10, x1: 13, y0: 28, y1: 29, why: 'public driveway' }, { x0: 2, x1: 2, y0: 18, y1: 24, why: 'staff corridor' }, { x0: 29, x1: 35, y0: 19, y1: 19, why: 'building loading' }],
  keepClearRule: 'refuse',
};
const CN_YARD = {
  aisles: [[3, 40, 17, 18], [3, 40, 9, 10], [39, 40, 9, 18]],
  pads: [[2, 2, 18, 24, G.CONCRETE], [3, 9, 29, 29, G.CONCRETE], [20, 20, 19, 24, G.CONCRETE], [29, 35, 19, 19, G.LOADING]],
  units: [
    ...row(2, (k) => ({ size: '10x20', x: 3 + k * 4, y: 15, w: 4, h: 2, dir: [0, 1] })),
    ...row(11, (k) => ({ size: '10x10', x: 11 + k * 2, y: 15, w: 2, h: 2, dir: [0, 1] })),
    ...row(2, (k) => ({ size: '10x20', x: 3 + k * 4, y: 11, w: 4, h: 2, dir: [0, -1] })),
    ...row(8, (k) => ({ size: '5x10', x: 11 + k, y: 11, w: 1, h: 2, dir: [0, -1] })),
  ],
  lights: [[10, 18], [30, 18], [10, 10], [30, 10], [39, 14]], cams: [[20, 18], [38, 10]],
  // two-story climate building on the street, elevator and stairs, two HVAC plants, power upgrade
  fitout: [
    { tool: 'shell2', a: { x: 26, y: 20 }, b: { x: 38, y: 28 } },
    ...[0, 1].flatMap((f) => [
      { tool: 'hall', a: { x: 27, y: 23 }, b: { x: 37, y: 23 }, f },
      { tool: 'hall', a: { x: 27, y: 26 }, b: { x: 37, y: 26 }, f },
      { tool: 'hall', a: { x: 27, y: 23 }, b: { x: 27, y: 26 }, f },
      { tool: 'hall', a: { x: 37, y: 23 }, b: { x: 37, y: 26 }, f },
    ]),
    { tool: 'hall', a: { x: 32, y: 20 }, b: { x: 32, y: 23 }, f: 0 },
    tap('doorAuto', 32, 20), tap('elevator', 32, 24), tap('stairs', 32, 25),
    tap('power', 40, 28), tap('hvac', 39, 22), tap('hvac', 39, 25),
    ...[0, 1].flatMap((f) => [[29, 23], [35, 23], [29, 26], [35, 26]].map(([x, y]) => tap('light', x, y, f))),
    tap('camera', 32, 23),
    ...[0, 1].flatMap((f) => [
      { tool: 'iu10x10', a: { x: 28, y: 22 }, b: { x: 31, y: 22 }, f, climate: true },
      { tool: 'iu10x10', a: { x: 33, y: 22 }, b: { x: 36, y: 22 }, f, climate: true },
      { tool: 'iu5x10', a: { x: 28, y: 24 }, b: { x: 31, y: 24 }, f, climate: true },
      { tool: 'iu5x10', a: { x: 33, y: 24 }, b: { x: 36, y: 24 }, f, climate: true },
      { tool: 'iu10x10', a: { x: 28, y: 27 }, b: { x: 35, y: 27 }, f, climate: true },
      { tool: 'iu5x5', a: { x: 36, y: 27 }, b: { x: 37, y: 27 }, f, climate: true },
    ]),
    tap('corral', 34, 19),
  ],
  carts: 4,
};

export const KIT_SITES = {
  grandopening: { frontage: GO_FRONTAGE, yard: GO_YARD },
  stormseason: { frontage: SS_FRONTAGE, yard: SS_YARD },
  chainnextdoor: { frontage: CN_FRONTAGE, yard: CN_YARD },
};
for (const k of Object.values(KIT_SITES)) if (!frontageOf(k.frontage.id)) registerFrontage(k.frontage);

// Paint and place the frontage and drive-up yard on a fresh state (before the Sim exists).
export function paintSite(s, site) {
  const F = site.frontage, Y = site.yard, W = s.W;
  const paint = (x0, x1, y0, y1, g) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.ground[y * W + x] = g; };
  const put = (o) => { const id = s.nextId++; s.objects[id] = { id, cstate: 'operating', cond: 1, f: 0, ...o }; if (o.type === 'unit') nameUnit(s, s.objects[id]); return s.objects[id]; };
  s.layout = F.id;
  const L = F.gate.lanes, P = F.pocket, O = F.office;
  paint(L.x0, L.x1, L.y0, L.y1 + 1, G.ASPHALT);
  paint(F.gate.serviceX, F.gate.serviceX, L.y0, F.gate.y, G.CONCRETE);
  paint(F.gate.junction.x0, F.gate.junction.x1, F.gate.junction.y0, F.gate.junction.y1, G.ASPHALT);
  paint(P.x0, P.x1, P.y0, P.y1, G.CONCRETE);
  const bx0 = Math.min(F.throat.x0, ...F.bays.map((b) => b.x0)), bx1 = Math.max(F.throat.x1, ...F.bays.map((b) => b.x1));
  const by0 = Math.min(...F.bays.map((b) => b.y0)), by1 = Math.max(...F.bays.map((b) => b.y1));
  paint(bx0, bx1, by1 + 1, P.y1, G.ASPHALT); paint(F.throat.x0, F.throat.x1, by0, P.y1 + 1, G.ASPHALT);
  for (const b of F.bays) paint(b.x0, b.x1, b.y0, b.y1, G.PARKING);
  paint(O.staffDoor.x, O.staffDoor.x, O.staffDoor.y, O.staffDoor.y, G.CONCRETE);
  for (const [x0, x1, y0, y1] of Y.aisles) paint(x0, x1, y0, y1, G.ASPHALT);
  for (const [x0, x1, y0, y1, g] of Y.pads) paint(x0, x1, y0, y1, g);
  put({ type: 'gate', x: F.gate.x, y: F.gate.y, open: 0, mapleCompound: true });
  put({ type: 'office', x: O.x, y: O.y, w: O.w, h: O.h, door: { ...O.door, dir: [...O.door.dir] }, staffDoor: { ...O.staffDoor, dir: [...O.staffDoor.dir] } });
  for (const [x, y] of Y.lights) put({ type: 'light', x, y });
  for (const [x, y] of Y.cams) put({ type: 'camera', x, y });
  for (const u of Y.units) put({ type: 'unit', access: 'drive', env: 'std', size: u.size, x: u.x, y: u.y, w: u.w, h: u.h, dir: [...u.dir], commercial: 'ready', lease: null });
}

// Fit out any indoor building through the production build rules, then commission it at no cost.
export function fitOutSite(sim, site) {
  const s = sim.s, Y = site.yard, refused = [];
  if (!Y.fitout) return refused;
  const cre = s.creative; s.creative = true;
  for (const a of Y.fitout) { const r = sim.dispatch({ type: 'build', f: 0, ...a }); if (!r.ok) refused.push(`${a.tool} ${JSON.stringify(a.a)} f${a.f || 0}: ${r.msg}`); }
  sim.dispatch({ type: 'commission', all: true });
  sim.rebuild();
  const c = sim.objs('corral')[0]; if (c && Y.carts) sim.dispatch({ type: 'buyCarts', corral: c.id, n: Y.carts });
  s.creative = cre; s.ledger = []; s.lastCommit = null; s.orders = [];
  sim.rebuild();
  for (const u of sim.objs('unit')) if (u.cstate === 'operating' && !u.lease) u.commercial = 'ready';
  if (refused.length) console.warn('kit site fit-out refused', refused);
  return refused;
}
