// Harborview Rate Reset site (HV-1): an older waterfront drive-up yard on Pier Road
// with a public office outside the gate. One frozen frontage descriptor, registered at load through the
// existing registry (js/frontage.js). Geometry under this id never changes: new geometry, new id.
import { registerFrontage, frontageOf } from './frontage.js';
import { G } from './data.js';

const row = (n, f) => Array.from({ length: n }, (_, k) => f(k));

export const HV_SITE_LAYOUT = 'harborview-office-v1';
const HV_FRONTAGE = {
  id: HV_SITE_LAYOUT,
  // Public forecourt between the west gate lanes and the yard's front block.
  pocket: { x0: 9, x1: 20, y0: 22, y1: 29 }, throat: { x0: 9, x1: 12 },
  bays: [{ x0: 9, x1: 10, y0: 25, y1: 28 }, { x0: 11, x1: 12, y0: 25, y1: 28 }, { x0: 13, x1: 14, y0: 25, y1: 28 }],
  // Long, low harbour office (8x3) on the forecourt's north edge; front door faces the street.
  office: { x: 13, y: 22, w: 8, h: 3, door: { x: 16, y: 25, dir: [0, 1] }, staffDoor: { x: 17, y: 21, dir: [0, -1] } },
  // Recessed gate on the far west edge; 6 cells of stacking; the gate tech stands on the west strip.
  gate: { kind: 'recessed', x: 7, y: 23, lanes: { x0: 3, x1: 8, y0: 19, y1: 29 }, approachY: 24,
    inbound: { x0: 6, x1: 8 }, outbound: { x0: 3, x1: 5 }, yardRow: 18, junction: { x0: 3, x1: 8, y0: 16, y1: 18 }, staffCrossX: 8, serviceX: 2 },
  fence: [{ run: [21, 30, 21, 22], office: [21, 30, 21, 25] }, { run: [9, 22, 21, 22], office: [9, 22, 13, 22] }, { run: [9, 22, 9, 24] }, { run: [3, 24, 3, 30] }],
  gateLine: [3, 24, 9, 24], frontGap: [3, 21], crosswalks: [], yardEdgeY: 19,
  gatePlacementBlocked: { x0: 3, x1: 20 }, camera: { x: 15, y: 24 },
  keepClear: [
    { x0: 16, x1: 16, y0: 25, y1: 29, why: 'office walk' },
    { x0: 6, x1: 8, y0: 24, y1: 29, why: 'gate stacking' },
    { x0: 9, x1: 14, y0: 29, y1: 29, why: 'public driveway' },
    { x0: 17, x1: 17, y0: 19, y1: 20, why: 'staff path' },
    { x0: 22, x1: 40, y0: 25, y1: 29, why: 'front setback' },
  ],
  keepClearRule: 'refuse',
};
const HV_YARD = {
  aisles: [
    [3, 40, 16, 18],   // Quay Lane: main aisle from the gate junction to the east fence
    [7, 24, 10, 11],   // rear aisle behind the 10x10 building
    [7, 8, 10, 15], [23, 24, 10, 15], // connectors: rear aisle loop
    [22, 40, 21, 22],  // front aisle between the two 5x10 rows
    [22, 23, 19, 20], [39, 40, 19, 20], // connectors: front aisle loop
  ],
  pads: [[17, 17, 19, 20, G.CONCRETE], [2, 2, 16, 18, G.CONCRETE]],
  units: [
    ...row(7, (k) => ({ size: '10x10', x: 9 + k * 2, y: 12, w: 2, h: 2, dir: [0, -1] })), // Row A, doors to the rear aisle
    ...row(7, (k) => ({ size: '10x10', x: 9 + k * 2, y: 14, w: 2, h: 2, dir: [0, 1] })),  // Row B, doors to Quay Lane
    ...row(15, (k) => ({ size: '5x10', x: 24 + k, y: 19, w: 1, h: 2, dir: [0, 1] })),     // Row C, doors to the front aisle
    ...row(15, (k) => ({ size: '5x10', x: 24 + k, y: 23, w: 1, h: 2, dir: [0, -1] })),    // Row D, doors to the front aisle
  ],
  lights: [[12, 11], [20, 11], [15, 17], [28, 21], [35, 21]], cams: [],
};
export const HARBORVIEW_SITE = { frontage: HV_FRONTAGE, yard: HV_YARD };
if (!frontageOf(HV_SITE_LAYOUT)) registerFrontage(HV_FRONTAGE);
