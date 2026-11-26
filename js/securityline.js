// SL-1 security line (FCPR Rev 1, consolidated SL-1 spec §2).
// Classic properties only (sim.frontage() is null). Every boundary decision reads
// the line through this module, so a later freeform boundary (FO-1) replaces it alone.
//
// State:  s.secLine (optional integer y0+1..y1) is the line row L.
//         Without it, any gate object means the legacy front line L = y1.
//         Otherwise the line is unset.
// Shape:  for now (Cat 5) the line is the south edge of row L across the parcel.
//         Yard = rows y0..L. Public lot = rows L+1..y1.
import { VEH_GROUND, PED_GROUND } from './data.js';

const hasGate = (s) => Object.values(s.objects || {}).some((o) => o && o.type === 'gate');

// Line row for a state, or null while unset. Frontage layouts never set secLine and
// never read this for routing; their authored descriptors own the boundary.
export function lineRow(s) {
  if (Number.isInteger(s.secLine)) return s.secLine;
  return hasGate(s) ? s.parcel.y1 : null;
}
// Row carrying the gates and the street-facing fence: the line when set, else the parcel front row.
export const fenceRow = (s) => lineRow(s) ?? s.parcel.y1;
// Rows of the public lot ({y0, y1}) in front of a line at row L, or null when there is none.
export const publicRows = (s, L) => (splitAt(s, L) ? { y0: L + 1, y1: s.parcel.y1 } : null);
// Rows behind the line where a yard drive aisle may run (legacy: all rows but the front row).
export const yardRows = (s, L) => ({ y0: s.parcel.y0, y1: Math.min(L ?? s.parcel.y1 - 1, s.parcel.y1 - 1) });
// Gate drive lanes in the public lot: the columns gx-1..gx+1 in front of a gate on the line.
export const isGateLane = (s, L, gates, x, y) => splitAt(s, L) && y > L && y <= s.parcel.y1 && gates.some((g) => Math.abs(g.x - x) <= 1);
// Drawn line geometry in grid units: the south edge of row L across the parcel (Cat 5 straight line).
export const linePolyline = (s, L) => (L == null ? null : [[s.parcel.x0, L + 1], [s.parcel.x1 + 1, L + 1]]);
const classic = (sim) => !sim.frontage();
// Cached per rebuild (sim.D.lineL); falls back to the state while D is absent.
export const currentLine = (sim) => L_of(sim); // the line row now (cached per rebuild), or null
const L_of = (sim) => (sim.D && 'lineL' in sim.D) ? sim.D.lineL : (classic(sim) ? lineRow(sim.s) : null);

export function lineState(sim) {
  if (!classic(sim)) return null;
  const L = L_of(sim);
  return L == null ? 'unset' : { L };
}
// True when a public lot exists in front of the line.
export const splitAt = (s, L) => L != null && L < s.parcel.y1;
export const hasPublicLot = (sim) => classic(sim) && splitAt(sim.s, L_of(sim));

export function sideFor(s, L, x, y) {
  const p = s.parcel;
  if (L == null || x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) return null;
  return y <= L ? 'yard' : 'public';
}
export function secureSide(sim, x, y, L = L_of(sim)) { return classic(sim) ? sideFor(sim.s, L, x, y) : null; }
// A unit step that crosses the line (vertical neighbours on rows L and L+1, inside the parcel columns).
export function crossesLine(s, L, x, y, nx, ny) {
  const p = s.parcel;
  return L != null && x === nx && x >= p.x0 && x <= p.x1 && Math.min(y, ny) === L && Math.max(y, ny) === L + 1;
}
export function lineEdge(sim, a, b, L = L_of(sim)) {
  const W = sim.s.W;
  return classic(sim) && crossesLine(sim.s, L, a % W, (a / W) | 0, b % W, (b / W) | 0);
}
// V2: a public-lot driveway meets the street across the sidewalk at column x.
export function publicDrivewayAt(sim, x, L = L_of(sim)) {
  const s = sim.s, p = s.parcel;
  if (!classic(sim) || !splitAt(s, L) || x < p.x0 || x > p.x1) return false;
  const i = sim.idx(x, p.y1);
  return VEH_GROUND.has(s.ground[i]) && !(sim.D && sim.D.solid[i]);
}
// Sidewalk cell crossed by a V2 driveway edge (the apron). Drivable for that edge only.
function apronStep(sim, L, x, y, nx, ny) {
  const p = sim.s.parcel;
  if (x !== nx || ny !== p.y1 + 1 || (y !== p.y1 && y !== p.y1 + 2)) return false;
  return publicDrivewayAt(sim, nx, L);
}
export function apronCells(sim, L = L_of(sim)) {
  const s = sim.s, p = s.parcel, out = [];
  if (!classic(sim) || !splitAt(s, L)) return out;
  for (let x = p.x0; x <= p.x1; x++) if (publicDrivewayAt(sim, x, L) && !VEH_GROUND.has(s.ground[sim.idx(x, p.y1 + 1)])) out.push({ x, y: p.y1 + 1 });
  return out;
}

// Classic vehicle edge (sim.js vehNbr). Returns null to use the normal ground rule,
// true/false to force the decision. Unset or L = y1 reproduces abaf108 exactly.
//   gateId: null = all routed gates (tenant reach), a gate id (tenant trip), or `publicDrive` (prospects).
export function classicVehicleEdge(sim, x, y, nx, ny, gateId, publicDrive, routeIds) {
  const s = sim.s, p = s.parcel, L = L_of(sim), j = sim.idx(nx, ny);
  const ground = () => VEH_GROUND.has(s.ground[j]) && !sim.D.solid[j];
  const atGate = () => {
    if (gateId === publicDrive) return false;
    const ids = gateId == null ? routeIds() : [gateId];
    return ids.some((id) => { const g = s.objects[id]; return g && Math.abs(nx - g.x) <= 1; });
  };
  if (!splitAt(s, L)) {
    // abaf108: the front fence row y1 is crossed only beside a routed gate.
    if (!ground()) return false;
    if ((y === p.y1 && ny === p.y1 + 1) || (y === p.y1 + 1 && ny === p.y1)) return atGate();
    return true;
  }
  if (apronStep(sim, L, x, y, nx, ny)) return true;                 // V2 (sidewalk apron)
  if (!ground()) return false;
  if (crossesLine(s, L, x, y, nx, ny)) return atGate();             // V1
  if ((y === p.y1 && ny === p.y1 + 1) || (y === p.y1 + 1 && ny === p.y1)) return publicDrivewayAt(sim, nx, L); // V2 onto paved sidewalk
  return true;                                                      // V3
}

// Classic pedestrian edge (sim.js pedNbr, ground floor). staff: the actor is a worker.
// Unset or L = y1 reproduces abaf108 (nobody crosses the front fence row).
export function classicPedEdge(sim, x, y, nx, ny, staff) {
  const s = sim.s, p = s.parcel, L = L_of(sim);
  if (!splitAt(s, L)) return !(ny > p.y1 || y > p.y1);
  if (y > p.y1 + 1 || ny > p.y1 + 1) return false;                  // the street itself
  if (crossesLine(s, L, x, y, nx, ny)) {                            // P2
    if (!staff) return false;
    return (sim.D.gateCols || []).some((gx) => Math.abs(nx - gx) <= 1);
  }
  return true;                                                      // P1 and both sides
}
// Columns of operating, routed gates on the line (staff crossing points, P2).
export function gateColumns(sim) {
  return sim.routeGateIds().map((id) => sim.obj(id)).filter((g) => g && sim.works(g)).map((g) => g.x);
}

// --- offices
export function doorSide(sim, office, L = L_of(sim)) {
  return office?.door ? secureSide(sim, office.door.x, office.door.y, L) : null;
}
// A public office has its door landing in the public lot.
export const isPublicOffice = (sim, office, L = L_of(sim)) => doorSide(sim, office, L) === 'public';
// Outdoor yard-side landing beside a public office (staff passage, OFF-10), or null.
export function yardLanding(sim, office, L = L_of(sim)) {
  if (!office || !isPublicOffice(sim, office, L)) return null;
  const s = sim.s, D = sim.D, cells = [];
  for (let x = office.x; x < office.x + office.w; x++) cells.push({ x, y: office.y - 1, dir: [0, -1] }, { x, y: office.y + office.h, dir: [0, 1] });
  for (let y = office.y; y < office.y + office.h; y++) cells.push({ x: office.x - 1, y, dir: [-1, 0] }, { x: office.x + office.w, y, dir: [1, 0] });
  return cells.find((c) => sim.inb(c.x, c.y) && sideFor(s, L, c.x, c.y) === 'yard' && D.walk[0][sim.idx(c.x, c.y)] && !D.shellAt[sim.idx(c.x, c.y)] && PED_GROUND.has(s.ground[sim.idx(c.x, c.y)])) || null;
}

// --- proposed lines (gate placement)
// Storage that a line at row L would leave on the public side (GAT-10a).
export function storageOnPublicSide(sim, L) {
  const s = sim.s, pub = (x, y) => sideFor(s, L, x, y) === 'public';
  for (const o of Object.values(s.objects)) {
    if (o.type === 'unit') {
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (pub(x, y)) return true;
      if (sim.unitFront(o).some((c) => pub(c.x, c.y))) return true;
    } else if (o.type === 'shell') {
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (pub(x, y)) return true;
    } else if (o.type === 'door' && pub(o.x + o.dir[0], o.y + o.dir[1])) return true;
  }
  for (let f = 0; f < s.hall.length; f++) for (let i = 0; i < s.hall[f].length; i++) if (s.hall[f][i] && pub(i % s.W, (i / s.W) | 0)) return true;
  return false;
}
// SL-1 §2 (GAT-10c): what cancelling a line-setting gate order does to the line. One decision for the
// cancel itself and for the confirm dialog shown before it. Works before or after the order's own
// objects are removed (they are excluded). Returns null when the order never set the line.
//   { action: 'none' }                        another gate remains, so the line stays as it is
//   { action: 'restore', to }                 the previous line (null = unset) comes back
//   { action: 'keep', row, prevRow, reasons } restoring would break GAT-10a ('storage') or GAT-10b ('office')
// Rows in the result count from the front (row 1 = front), as in GAT-8.
export function cancelLineOutcome(sim, ord) {
  if (!ord || !Object.prototype.hasOwnProperty.call(ord, 'prevSecLine')) return null;
  const s = sim.s, own = new Set(ord.objs || []);
  if (Object.values(s.objects).some((o) => o.type === 'gate' && !own.has(o.id))) return { action: 'none' };
  const prev = ord.prevSecLine ?? null, cur = s.secLine ?? null, reasons = [];
  if (storageOnPublicSide(sim, prev)) reasons.push('storage');
  if (officeDoorEnclosed(sim, prev, cur)) reasons.push('office');
  if (!reasons.length) return { action: 'restore', to: prev };
  const front = (L) => s.parcel.y1 - L + 1;
  return { action: 'keep', row: front(cur), prevRow: front(prev), reasons };
}
// Player copy for a kept line: 'before' in the cancel confirm dialog, 'after' appended to the result.
export function cancelLineNotice(out, when) {
  if (!out || out.action !== 'keep') return '';
  if (when === 'after') return `Security line stays on row ${out.row}.`;
  const why = out.reasons.length === 2 ? 'would leave storage outside the secured yard and put the office door inside it'
    : out.reasons[0] === 'storage' ? 'would leave storage outside the secured yard' : 'would put the office door inside the secured yard';
  return `The security line will stay on row ${out.row}. Moving it back to row ${out.prevRow} ${why}.`;
}

// Offices whose door a line at row L would move from public (or unset) into the yard (GAT-10b).
export function officeDoorEnclosed(sim, L, prevL) {
  return sim.objs('office').some((o) => o.door && sideFor(sim.s, L, o.door.x, o.door.y) === 'yard' && sideFor(sim.s, prevL, o.door.x, o.door.y) !== 'yard');
}
