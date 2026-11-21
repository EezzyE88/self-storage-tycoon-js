// Public-office frontage descriptors. A property with a public office (visitors
// park and walk in from the street; tenants drive through a secured gate) stores
// its layout id in s.layout. Each id names one frozen descriptor below, and all
// shared access rules (routing, placement checks, rendering, camera) read their
// geometry from it. Descriptors live in code, never in saves: once shipped, an
// id's geometry does not change; new geometry gets a new id.
//
// Coordinates are simulation grid cells. Rectangles are inclusive {x0,x1,y0,y1}.
// v1 supports one public area on the street (south) edge.

export const MAPLE_PUBLIC = 'maple-public-office-v1';

// Maple Street's public office: today's accepted geometry, unchanged.
const MAPLE = {
  id: MAPLE_PUBLIC,
  pocket: { x0: 4, x1: 17, y0: 20, y1: 29 },         // public area; touches the sidewalk row
  throat: { x0: 12, x1: 15 },                         // street columns public cars may use
  bays: [{ x0: 10, x1: 11, y0: 21, y1: 24 }, { x0: 12, x1: 13, y0: 21, y1: 24 }, { x0: 14, x1: 15, y0: 21, y1: 24 }],
  office: { x: 4, y: 20, w: 4, h: 5, door: { x: 8, y: 21, dir: [1, 0] }, staffDoor: { x: 5, y: 19, dir: [0, -1] } },
  gate: {
    kind: 'recessed', x: 22, y: 23,                   // keypad cell is (x, y+1); panel spans lanes.x0..x+1
    lanes: { x0: 18, x1: 23, y0: 18, y1: 29 },        // gate lanes; the approach is the part at or below approachY
    approachY: 24,
    inbound: { x0: 21, x1: 23 }, outbound: { x0: 18, x1: 20 },
    yardRow: 17,                                      // lanes join the yard only through this row
    junction: { x0: 18, x1: 23, y0: 14, y1: 17 },     // one moving vehicle at a time
    staffCrossX: 23,                                  // staff gate crossing (gate.x + 1)
    serviceX: 24,                                     // a worker servicing the gate stands at (serviceX, gate.y)
  },
  // Fence runs [x0,z0,x1,z1] on cell edges, in render order. Routing blocks staff
  // crossings on every run. `office` is the rendered start when the office stands.
  fence: [
    { run: [4, 30, 4, 20] },
    { run: [4, 20, 18, 20], office: [8, 20, 18, 20] },
    { run: [18, 20, 18, 24] },
    { run: [24, 24, 24, 30] },
  ],
  gateLine: [18, 24, 24, 24],                         // drawn only when no recessed gate stands
  frontGap: [4, 24],                                  // open street frontage [x0, x1)
  crosswalks: [{ x: 14, y0: 14, y1: 17 }],            // cars yield to people on these cells
  yardEdgeY: 18,                                      // rows above this are the yard (no yard doors case)
  gatePlacementBlocked: { x0: 4, x1: 23 },            // no second gate lane may touch these columns
  camera: { x: 14, y: 23 },
  // Clearances authored for review. Maple keeps its accepted refusal rules, so
  // keepClearRule 'accepted' adds no new construction refusal here.
  keepClear: [
    { x0: 8, x1: 8, y0: 21, y1: 29, why: 'office walk' },
    { x0: 21, x1: 23, y0: 24, y1: 29, why: 'gate stacking' },
    { x0: 12, x1: 15, y0: 25, y1: 29, why: 'public driveway' },
  ],
  keepClearRule: 'accepted',
};

const REGISTRY = new Map();
const CELL = 128; // descriptors cover grids up to 128 cells on a side (saves allow 96)

const inR = (r, x, y) => !!r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };

// Compile one descriptor into the predicates the hot routing paths use.
function compile(D) {
  // Primitive copies keep the hot routing predicates as cheap as the old constants.
  const P = D.pocket, T = D.throat, Gt = D.gate, L = Gt.lanes || null;
  const streetY = P.y1 + 1, px0 = P.x0, px1 = P.x1, py0 = P.y0, py1 = P.y1, tx0 = T.x0, tx1 = T.x1;
  const lx0 = L ? L.x0 : 1, lx1 = L ? L.x1 : 0, ly0 = L ? L.y0 : 1, ly1 = L ? L.y1 : 0, apY = L ? Gt.approachY : 1e9;
  const ix0 = Gt.inbound ? Gt.inbound.x0 : 1, ix1 = Gt.inbound ? Gt.inbound.x1 : 0;
  const ox0 = Gt.outbound ? Gt.outbound.x0 : 1, ox1 = Gt.outbound ? Gt.outbound.x1 : 0;
  const pocket = (x, y) => x >= px0 && x <= px1 && y >= py0 && y <= py1;
  const lanes = (x, y) => x >= lx0 && x <= lx1 && y >= ly0 && y <= ly1;
  const approach = (x, y) => x >= lx0 && x <= lx1 && y >= apY && y <= ly1;
  const throat = (x) => x >= tx0 && x <= tx1;
  const inbound = (x) => x >= ix0 && x <= ix1;
  const outbound = (x) => x >= ox0 && x <= ox1;
  const bayAt = new Int8Array(CELL * CELL).fill(-1);
  D.bays.forEach((b, k) => { for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (bayAt[x * CELL + y] < 0) bayAt[x * CELL + y] = k; });
  const bay = (x, y) => (x >= 0 && y >= 0 && x < CELL && y < CELL ? bayAt[x * CELL + y] : -1);
  // Fence edges: vertical runs block moves between columns x-1 and x;
  // horizontal runs block moves between rows z-1 and z.
  const vBlock = new Uint8Array(CELL * CELL), hBlock = new Uint8Array(CELL * CELL);
  const mark = ([x0, z0, x1, z1], v) => {
    if (x0 === x1) for (let y = Math.min(z0, z1); y < Math.max(z0, z1); y++) vBlock[x0 * CELL + y] = v;
    else for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x++) hBlock[z0 * CELL + x] = v;
  };
  for (const f of D.fence) mark(f.run, 1);
  if (D.gateLine) mark(D.gateLine, 2);
  const [gap0, gap1] = D.frontGap;
  const recessedKind = Gt.kind === 'recessed';
  const recessed = (g) => recessedKind && g?.mapleCompound === true;

  function pedestrianEdge(x, y, nx, ny, staffGate = null) {
    if (staffGate !== null) {
      if (y === ny) return !vBlock[Math.max(x, nx) * CELL + y];
      const front = Math.max(y, ny);
      if (front === streetY) return x >= gap0 && x < gap1;
      const h = hBlock[front * CELL + x];
      if (h === 1) return false;
      if (h === 2) return staffGate && x === Gt.staffCrossX;
      return true;
    }
    if (pocket(x, y) !== pocket(nx, ny)) {
      return Math.max(y, ny) === streetY && Math.min(y, ny) === streetY - 1 && pocket(x, streetY - 1) && pocket(nx, streetY - 1);
    }
    if (y >= streetY || ny >= streetY) return y === streetY && ny === streetY;
    return !lanes(x, y) && !lanes(nx, ny);
  }

  function vehicleEdge(sim, x, y, nx, ny, id) {
    const s = sim.s;
    if (y >= streetY && ny >= streetY) return true;
    if (id === publicDrive) {
      if (Math.max(y, ny) === streetY) return throat(x) && x === nx;
      if (!pocket(x, y) || !pocket(nx, ny)) return false;
      const a = bay(x, y), b = bay(nx, ny);
      return a < 0 || b < 0 || a === b;
    }
    if (pocket(x, y) || pocket(nx, ny)) return false;
    const ids = id == null ? sim.routeGateIds() : [id];
    if (Math.max(y, ny) === streetY) {
      return ids.some((k) => {
        const g = s.objects[k];
        if (recessed(g)) return ny < y ? inbound(x) : outbound(x);
        return g?.y === streetY - 1 && Math.abs(nx - g.x) <= 1 && !approach(nx, streetY - 1);
      });
    }
    if (approach(x, y) !== approach(nx, ny)) {
      return x === nx && Math.min(y, ny) === Gt.approachY - 1 && ids.some((k) => recessed(s.objects[k])) &&
        (ny < y ? inbound(x) : outbound(x));
    }
    if (lanes(x, y) && lanes(nx, ny)) {
      if (inbound(x) !== inbound(nx)) return false;
      if (y !== ny) return inbound(x) ? ny < y : ny > y;
    }
    if (lanes(x, y) !== lanes(nx, ny)) return ny === Gt.yardRow || y === Gt.yardRow;
    return true;
  }

  return deepFreeze({
    id: D.id, desc: D, streetY, pocket, lanes, approach, throat, inbound, outbound, bay, recessed,
    pedestrianEdge, vehicleEdge,
    inJunction: (x, y) => inR(Gt.junction, x, y),
    onCrosswalk: (x, y) => D.crosswalks.some((c) => x === c.x && y >= c.y0 && y <= c.y1),
    keepClearAt: (x, y) => D.keepClear.find((r) => inR(r, x, y)) || null,
  });
}

export const publicDrive = 'public-office-drive';

export function registerFrontage(desc) {
  if (!desc || typeof desc.id !== 'string') throw new Error('Frontage descriptor needs an id');
  if (REGISTRY.has(desc.id)) throw new Error('Frontage layout id already registered: ' + desc.id);
  const problems = validateFrontage(desc);
  if (problems.length) throw new Error('Invalid frontage ' + desc.id + ': ' + problems.join('; '));
  const K = compile(deepFreeze(JSON.parse(JSON.stringify(desc))));
  REGISTRY.set(desc.id, K);
  return K;
}

// Classic properties have no layout id and no frontage. An unknown id returns
// null here; Sim and the save loader refuse it with knownLayout().
export const frontageOf = (layout) => (layout == null ? null : REGISTRY.get(layout) || null);
export const knownLayout = (layout) => layout == null || REGISTRY.has(layout);
export const layoutIds = () => [...REGISTRY.keys()];

// Static checks every descriptor must pass before it is registered.
export function validateFrontage(D, { W = 44, H = 34, parcel = { x0: 2, y0: 2, x1: 41, y1: 29 } } = {}) {
  const out = [], bad = (m) => out.push(m);
  const rect = (r) => r && [r.x0, r.x1, r.y0, r.y1].every(Number.isInteger) && r.x0 <= r.x1 && r.y0 <= r.y1;
  const cells = (r) => { const a = []; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) a.push([x, y]); return a; };
  const P = D.pocket, Gt = D.gate || {}, L = Gt.lanes, O = D.office;
  if (!rect(P)) { bad('pocket is not a rectangle'); return out; }
  if (P.y1 !== parcel.y1) bad('public area must touch the sidewalk row');
  if (P.x0 < parcel.x0 || P.x1 > parcel.x1 || P.y0 < parcel.y0) bad('public area leaves the parcel');
  if (!(D.throat && D.throat.x0 >= P.x0 && D.throat.x1 <= P.x1 && D.throat.x0 <= D.throat.x1)) bad('throat must be inside the public area');
  if (!Array.isArray(D.bays) || !D.bays.length || !D.bays.every((b) => rect(b) && inR(P, b.x0, b.y0) && inR(P, b.x1, b.y1))) bad('bays must be inside the public area');
  const office = O && { x0: O.x, x1: O.x + O.w - 1, y0: O.y, y1: O.y + O.h - 1 };
  if (!office || !rect(office) || !inR(P, office.x0, office.y0) || !inR(P, office.x1, office.y1)) bad('office must stand inside the public area');
  else {
    if (!inR(P, O.door.x, O.door.y) || inR(office, O.door.x, O.door.y)) bad('office door must open into the public area');
    if (inR(P, O.staffDoor.x, O.staffDoor.y) || inR(office, O.staffDoor.x, O.staffDoor.y)) bad('staff door must open outside the public area');
    if (D.bays.some((b) => cells(b).some(([x, y]) => inR(office, x, y)))) bad('a bay overlaps the office');
  }
  if (!['recessed', 'fence'].includes(Gt.kind)) bad('gate kind must be recessed or fence');
  if (Gt.kind === 'recessed') {
    if (!rect(L)) bad('recessed gate needs lanes');
    else {
      if (L.y1 !== P.y1) bad('gate lanes must reach the sidewalk row');
      if (cells(L).some(([x, y]) => inR(P, x, y))) bad('gate lanes overlap the public area');
      if (!(Gt.approachY > L.y0 && Gt.approachY <= L.y1)) bad('approach must be inside the lanes');
      if (Gt.yardRow !== L.y0 - 1) bad('yard row must be the row behind the lanes');
      if (Gt.y !== Gt.approachY - 1) bad('gate must stand on the row behind the approach');
      if (Gt.x + 1 !== L.x1 || Gt.staffCrossX !== Gt.x + 1) bad('gate panel must end at the lane edge with the staff crossing beside it');
      if (!(Gt.x >= Gt.inbound.x0 && Gt.x <= Gt.inbound.x1)) bad('the keypad must face the inbound lane');
      const halves = [Gt.inbound, Gt.outbound].sort((a, b) => a.x0 - b.x0);
      if (halves[0].x0 !== L.x0 || halves[1].x1 !== L.x1 || halves[0].x1 + 1 !== halves[1].x0) bad('inbound and outbound must split the lanes');
      if (Gt.inbound.x0 < Gt.outbound.x0) bad('v1 keeps the inbound half on the gate (east) side of the lanes');
      if (Gt.inbound.x1 - Gt.inbound.x0 + 1 < 2 || Gt.outbound.x1 - Gt.outbound.x0 + 1 < 2) bad('each lane half must be at least 2 cells wide');
      if (L.y1 - Gt.approachY + 1 < 4) bad('gate stacking must be at least 4 cells');
      if (![L.x0 - 1, L.x1 + 1].includes(Gt.serviceX) || inR(P, Gt.serviceX, Gt.y)) bad('gate service spot must be beside the lanes, outside the public area');
    }
  }
  if (!Array.isArray(D.fence) || !D.fence.every((f) => Array.isArray(f.run) && f.run.length === 4 && (f.run[0] === f.run[2] || f.run[1] === f.run[3]))) bad('fence runs must be axis-aligned');
  if (!(Array.isArray(D.frontGap) && D.frontGap[0] <= P.x0 && D.frontGap[1] >= P.x1 + 1)) bad('street frontage must open the whole public area');
  if (!D.camera || D.camera.x < 0 || D.camera.x >= W || D.camera.y < 0 || D.camera.y >= H) bad('camera is out of bounds');
  if (!(D.gatePlacementBlocked && D.gatePlacementBlocked.x0 <= P.x0 && D.gatePlacementBlocked.x1 >= Math.max(P.x1, L ? L.x1 : P.x1))) bad('second-gate exclusion must cover the public area and lanes');
  // The north edge of the public area must be fenced (or be the office) so
  // visitors and yard staff only meet through the office.
  const north = new Set();
  for (const f of D.fence) { const [x0, z0, x1, z1] = f.run; if (z0 === z1 && z0 === P.y0) for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x++) north.add(x); }
  for (let x = P.x0; x <= P.x1; x++) if (!north.has(x)) bad('public area north edge is open at x=' + x);
  if (!Array.isArray(D.keepClear)) bad('keepClear list missing');
  else for (const r of D.keepClear) {
    if (!rect(r) || typeof r.why !== 'string') { bad('keepClear zones need a rectangle and a reason'); continue; }
    if (office && cells(r).some(([x, y]) => inR(office, x, y))) bad('keepClear ' + r.why + ' overlaps the office');
    if (r.why !== 'public driveway' && D.bays.some((b) => cells(r).some(([x, y]) => inR(b, x, y)))) bad('keepClear ' + r.why + ' overlaps a bay');
  }
  if (!['accepted', 'refuse'].includes(D.keepClearRule)) bad('keepClearRule must be accepted or refuse');
  return out;
}

registerFrontage(MAPLE);
export const MAPLE_FRONTAGE = frontageOf(MAPLE_PUBLIC);
