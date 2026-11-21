// TEST-ONLY synthetic public-office layout. It is never registered by the game
// and is not a playable property. It moves the office, parking and gate to
// different positions from Maple (office east, two bays, gate lanes further
// east, no crosswalk) to prove the shared access code reads its geometry from
// the descriptor rather than from Maple constants.
import { registerFrontage, frontageOf } from '../../../js/frontage.js';
import { makePublicMaple } from '../../../js/maple.js';
import { Sim } from '../../../js/sim.js';
import { G } from '../../../js/data.js';

export const SYNTH = 'test-east-office-v1';
export const SYNTH_DESC = {
  id: SYNTH,
  pocket: { x0: 32, x1: 39, y0: 21, y1: 29 },
  throat: { x0: 32, x1: 35 },
  bays: [{ x0: 32, x1: 33, y0: 22, y1: 25 }, { x0: 34, x1: 35, y0: 23, y1: 26 }],
  office: { x: 36, y: 21, w: 4, h: 4, door: { x: 35, y: 22, dir: [-1, 0] }, staffDoor: { x: 37, y: 20, dir: [0, -1] } },
  gate: {
    kind: 'recessed', x: 30, y: 23,
    lanes: { x0: 26, x1: 31, y0: 18, y1: 29 }, approachY: 24,
    inbound: { x0: 29, x1: 31 }, outbound: { x0: 26, x1: 28 },
    yardRow: 17, junction: { x0: 26, x1: 31, y0: 14, y1: 17 }, staffCrossX: 31, serviceX: 25,
  },
  fence: [
    { run: [40, 30, 40, 21] },
    { run: [32, 21, 40, 21], office: [32, 21, 36, 21] },
    { run: [32, 21, 32, 24] },
    { run: [26, 24, 26, 30] },
  ],
  gateLine: [26, 24, 32, 24],
  frontGap: [26, 40],
  crosswalks: [],
  yardEdgeY: 18,
  gatePlacementBlocked: { x0: 26, x1: 39 },
  camera: { x: 33, y: 23 },
  keepClear: [
    { x0: 29, x1: 31, y0: 24, y1: 29, why: 'gate stacking lane' },
    { x0: 36, x1: 39, y0: 25, y1: 29, why: 'office walk' },
    { x0: 26, x1: 31, y0: 14, y1: 16, why: 'rear turnaround' },
  ],
  keepClearRule: 'refuse',
};

export function registerSynthetic() { return frontageOf(SYNTH) || registerFrontage(SYNTH_DESC); }

// Starts from Maple's units, tenants and yard, then replaces the whole frontage
// (rows 18-30) with the synthetic geometry.
export function makeSynthetic(seed = 20260929) {
  registerSynthetic();
  const s = makePublicMaple(seed).s;
  const W = s.W, at = (x, y) => y * W + x;
  const paint = (x0, y0, x1, y1, g) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.ground[at(x, y)] = g; };
  paint(0, 18, W - 1, 29, G.GRASS); paint(0, 30, W - 1, 30, G.SIDEWALK);
  for (const o of Object.values(s.objects)) if (o.y >= 18 && !['office', 'gate'].includes(o.type)) delete s.objects[o.id];
  paint(26, 18, 31, 30, G.ASPHALT);              // gate lanes to the street
  paint(25, 18, 25, 23, G.CONCRETE);             // gate service walk
  paint(32, 21, 39, 29, G.CONCRETE);             // public area
  paint(32, 26, 35, 30, G.ASPHALT);              // public driveway and throat
  paint(32, 22, 33, 25, G.PARKING); paint(34, 23, 35, 26, G.PARKING);
  paint(33, 18, 37, 18, G.CONCRETE); paint(37, 19, 37, 20, G.CONCRETE); // staff walk to the yard aisle
  const D = SYNTH_DESC, office = Object.values(s.objects).find((o) => o.type === 'office');
  Object.assign(office, { x: D.office.x, y: D.office.y, w: D.office.w, h: D.office.h,
    door: { ...D.office.door, dir: [...D.office.door.dir] }, staffDoor: { ...D.office.staffDoor, dir: [...D.office.staffDoor.dir] } });
  Object.assign(Object.values(s.objects).find((o) => o.type === 'gate'), { x: D.gate.x, y: D.gate.y, mapleCompound: true });
  s.layout = SYNTH;
  delete s.gateAccess; // rebuilt from the moved gate
  return new Sim(s);
}
