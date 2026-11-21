// Cedar Creek Storage Yard: the Comeback Yard property for new starts (Comeback
// scenario record v2). This module holds the property's frozen public frontage,
// its authored site data and the site check used by save validation. It builds
// nothing and imports no simulation code; the builder lives in scenarios.js.
//
// Saves store only s.layout = CEDAR_LAYOUT and s.scenario.site = CEDAR_SITE.
// Geometry and authored values below never change under those ids: new
// geometry or new authored targets get new ids, so a saved yard never moves.
import { registerFrontage, frontageOf } from './frontage.js';

export const CEDAR_LAYOUT = 'cedar-creek-office-v1';
export const CEDAR_SITE = 'cedar-creek-v1';

// Public frontage: office on the east of the street pocket, three bays in the
// middle, a recessed gate on the west. Distinct from Maple (office west, gate east).
export const CEDAR_FRONTAGE = {
  id: CEDAR_LAYOUT,
  pocket: { x0: 26, x1: 37, y0: 21, y1: 29 },
  throat: { x0: 28, x1: 31 },
  bays: [{ x0: 27, x1: 28, y0: 22, y1: 25 }, { x0: 29, x1: 30, y0: 22, y1: 25 }, { x0: 31, x1: 32, y0: 22, y1: 25 }],
  office: { x: 34, y: 21, w: 4, h: 4, door: { x: 33, y: 22, dir: [-1, 0] }, staffDoor: { x: 35, y: 20, dir: [0, -1] } },
  gate: {
    kind: 'recessed', x: 24, y: 23,
    lanes: { x0: 20, x1: 25, y0: 19, y1: 29 }, approachY: 24,
    inbound: { x0: 23, x1: 25 }, outbound: { x0: 20, x1: 22 },
    yardRow: 18, junction: { x0: 20, x1: 25, y0: 16, y1: 18 }, staffCrossX: 25, serviceX: 19,
  },
  fence: [
    { run: [38, 30, 38, 21] },
    { run: [26, 21, 38, 21], office: [26, 21, 34, 21] },
    { run: [26, 21, 26, 24] },
    { run: [20, 24, 20, 30] },
  ],
  gateLine: [20, 24, 26, 24],
  frontGap: [20, 38],
  crosswalks: [],
  yardEdgeY: 19,
  gatePlacementBlocked: { x0: 20, x1: 37 },
  camera: { x: 29, y: 21 },
  keepClear: [
    { x0: 33, x1: 33, y0: 23, y1: 29, why: 'office walk' },
    { x0: 23, x1: 25, y0: 24, y1: 29, why: 'gate stacking' },
    { x0: 28, x1: 31, y0: 26, y1: 29, why: 'public driveway' },
    { x0: 5, x1: 6, y0: 4, y1: 5, why: 'restoration staging' },
    { x0: 5, x1: 6, y0: 8, y1: 11, why: 'west loop turn' },
    { x0: 27, x1: 28, y0: 8, y1: 11, why: 'east loop turn' },
    { x0: 19, x1: 19, y0: 19, y1: 23, why: 'gate service walk' },
  ],
  keepClearRule: 'refuse',
};

// Yard circulation (asphalt, inclusive rectangles). Main aisle, west and east
// connectors and the rear service aisle form one loop: no dead-end lane.
export const CEDAR_AISLES = [
  { x0: 3, x1: 30, y0: 16, y1: 18, why: 'main aisle' },
  { x0: 3, x1: 4, y0: 6, y1: 15, why: 'west connector' },
  { x0: 3, x1: 30, y0: 6, y1: 7, why: 'rear service aisle' },
  { x0: 29, x1: 30, y0: 8, y1: 15, why: 'east connector' },
];

// Operating drive-up rows (occupied at the start). legacy = share of market rent
// the long-time tenant pays (authored starting condition, not an economy change).
export const CEDAR_CORE = [
  // south row, doors face north onto the main aisle
  ...[3, 4, 5, 6].map((x, k) => ({ x, y: 19, size: '5x10', w: 1, h: 2, dir: [0, -1], legacy: [0.9, 0.85, 0.9, 0.85][k] })),
  ...[7, 9].map((x, k) => ({ x, y: 19, size: '10x10', w: 2, h: 2, dir: [0, -1], legacy: [0.85, 0.9][k] })),
  // inner row, doors face north onto the rear service aisle
  ...[19, 21, 23, 25].map((x, k) => ({ x, y: 8, size: '10x10', w: 2, h: 2, dir: [0, -1], legacy: [0.9, 0.85, 0.9, 0.85][k] })),
];

// The rear wing: six neglected but structurally sound 10x10 drive-ups, doors
// facing south onto the rear service aisle. work = authored make-ready minutes
// (PROVISIONAL, every job fits one 8-hour shift). Two units have a washed-out
// door apron (the cells directly in front of their door): a Drive Aisle order on
// those two cells restores frontage. The through lane (row 7) stays intact, so
// no operating unit ever depends on an apron.
export const CEDAR_TARGETS = [
  { x: 7, y: 4, work: 240 },
  { x: 9, y: 4, work: 300, apron: [[9, 6], [10, 6]] },
  { x: 11, y: 4, work: 300 },
  { x: 13, y: 4, work: 360 },
  { x: 15, y: 4, work: 360, apron: [[15, 6], [16, 6]] },
  { x: 17, y: 4, work: 480 },
].map((t) => ({ ...t, w: 2, h: 2, f: 0, size: '10x10', dir: [0, 1] }));

// PROVISIONAL authored values, recorded in each new save so a started yard keeps them.
export const CEDAR_START = { cash: 1150, leaseGoal: 3 };

// Ground features painted by the builder (besides aisles, lanes and the pocket).
export const CEDAR_PADS = [
  { x0: 19, x1: 28, y0: 4, y1: 5, label: 'rear pad: a row facing the rear service aisle' },
  { x0: 31, x1: 32, y0: 8, y1: 15, label: 'east pad: units facing the east connector' },
  { x0: 7, x1: 26, y0: 12, y1: 15, label: 'inner pad: a row facing the main aisle' },
  { x0: 11, x1: 18, y0: 19, y1: 20, label: 'front pad: a row facing the main aisle' },
];

registerFrontage(CEDAR_FRONTAGE);
export const CEDAR = frontageOf(CEDAR_LAYOUT);

// The authored rectangle of every target, in order. A v2 record must match it.
export const cedarTargetShape = (t) => [t.x, t.y, t.w, t.h, t.f, t.dir[0], t.dir[1]].join(',');
export function cedarSiteOk(s) {
  const c = s.scenario;
  return s.layout === CEDAR_LAYOUT && c?.site === CEDAR_SITE && Array.isArray(c.targets) && c.targets.length === CEDAR_TARGETS.length &&
    c.targets.every((t, k) => t && Array.isArray(t.dir) && cedarTargetShape(t) === cedarTargetShape(CEDAR_TARGETS[k]));
}
// The authored apron cells in front of a target, or [] (k = target order).
export const cedarApron = (k) => CEDAR_TARGETS[k]?.apron || [];
