// SB-1 (revised for SL-1, consolidated SL-1 spec §8): opening guidance for classic
// (no public frontage) properties such as the empty-lot Sandbox and acquired parcels.
// Category 3 only: it lists what is still needed to open, never a required order, and
// nothing here changes what is legal (equal legality is test-enforced).
import { G, VEH_GROUND } from './data.js';
import { classicOfficeGates, classicGateParking, publicOfficeBays, publicOfficeStaffRoute, publicDrive } from './mapleaccess.js';
import { currentLine, sideFor, splitAt, isPublicOffice, publicRows, yardRows, isGateLane } from './securityline.js';

const LANDING = 'Office entrance needs a clear outdoor pedestrian landing on the selected side.';
const OFF8 = 'Face the office door into the public lot, in front of the security line.';
export const OFFICE_LANDING_HINT = 'Office door needs pavement in front of it. Face the door onto your Parking or a walkway that reaches it.';

const classic = sim => !sim.frontage();
const lineOf = sim => currentLine(sim);
// Any drive aisle cell vehicles reach inside the yard.
const yardAisle = (sim, L) => {
  const { s, D } = sim, p = s.parcel;
  const r = yardRows(s, L);
  for (let y = r.y0; y <= r.y1; y++) for (let x = p.x0; x <= p.x1; x++) if (D.vehReach[sim.idx(x, y)]) return true;
  return false;
};
// Legacy yard office (D2): door landing inside the yard, built before SL-1.
const legacyOffice = (sim, L) => {
  const o = sim.objs('office')[0];
  return !!o && o.generalPlacement !== false && !!o.door && sideFor(sim.s, L, o.door.x, o.door.y) === 'yard';
};
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Finished public bays reachable from the street without a gate (whole public lot,
// with or without an office). Read-only.
function publicLotBays(sim, L) {
  const { s } = sim;
  if (!splitAt(s, L)) return [];
  const office = sim.objs('office')[0];
  if (office && isPublicOffice(sim, office, L)) return publicOfficeBays(sim, office).bays;
  const starts = Array.from({ length: s.W }, (_, x) => sim.idx(x, s.parcel.y1 + 2));
  const reach = sim.distField(starts, i => sim.vehNbr(i, publicDrive));
  return [...reach.keys()].filter(i => s.ground[i] === G.PARKING && sideFor(s, L, i % s.W, (i / s.W) | 0) === 'public' &&
    (!sim.D.pendingGround.has(i) || sim.D.pendingGround.get(i) === G.PARKING));
}
// Parking being painted in the public lot that cars will reach from the street once
// pending paving finishes (SB1-Q02, moved to the public graph). Read-only projection.
function pendingPublicParking(sim, L) {
  const { s, D } = sim, p = s.parcel, W = s.W;
  if (!splitAt(s, L)) return false;
  const want = new Set([...D.pendingGround].filter(([i, v]) => v === G.PARKING && sideFor(s, L, i % W, (i / W) | 0) === 'public').map(([i]) => i));
  if (!want.size) return false;
  const drive = (x, y) => sideFor(s, L, x, y) === 'public' && !D.solid[sim.idx(x, y)] && VEH_GROUND.has(sim.groundAt(sim.idx(x, y)));
  const seen = new Set(), q = [];
  for (let x = p.x0; x <= p.x1; x++) if (drive(x, p.y1)) { const i = sim.idx(x, p.y1); seen.add(i); q.push(i); }
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i / W) | 0;
    if (want.has(i)) return true;
    for (const [dx, dy] of DIRS4) { const nx = x + dx, ny = y + dy, j = sim.idx(nx, ny); if (!seen.has(j) && drive(nx, ny)) { seen.add(j); q.push(j); } }
  }
  return false;
}
// Driving surface in the public lot other than the drive lanes in front of the gates.
const publicPaving = (sim, L) => {
  const { s, D } = sim, p = s.parcel, gates = sim.objs('gate');
  const r = publicRows(s, L); if (!r) return false;
  for (let y = r.y0; y <= r.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
    if (isGateLane(s, L, gates, x, y)) continue; // the drive to the gate is not Parking space
    const i = sim.idx(x, y); if (VEH_GROUND.has(D.pendingGround.get(i) ?? s.ground[i])) return true;
  }
  return false;
};

// Any driving surface on the lot (line unset: Parking still needs an aisle to paint on).
const lotPaving = (sim) => {
  const { s, D } = sim, p = s.parcel;
  for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) { const i = sim.idx(x, y); if (VEH_GROUND.has(D.pendingGround.get(i) ?? s.ground[i])) return true; }
  return false;
};

// Items 1-8 of SL-1 §8: what is still needed to open. Each item may carry a tool button.
export function openNeeds(sim) {
  sim.ensure();
  if (!classic(sim) || sim.s.open) return [];
  const s = sim.s, p = s.parcel, L = lineOf(sim), office = sim.objs('office')[0], out = [];
  if (legacyOffice(sim, L)) return []; // legacy yard offices keep the abaf108 checklist (openingSteps)
  const split = splitAt(s, L), pubOffice = office && isPublicOffice(sim, office, L);
  if (L == null) out.push({ key: 'line', msg: 'Choose your security line: place an Entrance Gate. In front of it is the public lot for the office and customer Parking; storage goes behind it.', short: 'place an Entrance Gate to choose your security line', tool: 'gate', btn: 'Place a gate' });
  else if (L === p.y1 && !office) out.push({ key: 'frontRow', msg: 'Your gate is on the front row, so there is no public lot. To add one, remove the gate and place it further back.', short: 'move your gate back to make a public lot' });
  const bays = split ? publicLotBays(sim, L) : [];
  if (!bays.length && L !== p.y1) {
    if (pendingPublicParking(sim, L)) out.push({ key: 'wait', msg: 'Let the Parking paint finish.', short: 'let the Parking paint finish' });
    else if (split ? !publicPaving(sim, L) : !lotPaving(sim)) out.push({ key: 'parking', msg: 'Add customer Parking in the public lot, with a drive from the street.', note: 'Parking is painted on a drive aisle', short: 'add customer Parking in the public lot', tool: 'aisle', btn: 'Build an aisle' });
    else out.push({ key: 'parking', msg: 'Add customer Parking in the public lot, with a drive from the street.', short: 'add customer Parking in the public lot', tool: 'parking', btn: 'Paint parking' });
  }
  if (!office && L !== p.y1) out.push({ key: 'office', msg: 'Place the office in the public lot, facing your Parking.', short: 'place the office in the public lot', tool: 'office', btn: 'Place an office' });
  if (pubOffice && !publicOfficeStaffRoute(sim, office)) out.push({ key: 'staff', msg: 'Give staff a route into the yard: back the office onto the line or connect it to the gate.', short: 'give staff a route into the yard', tool: 'walk', btn: 'Pave a walkway' });
  if (split && sim.objs('gate').length) {
    const g = sim.objs('gate')[0], driven = sim.streetDriveTo(g.x, L), behind = yardAisle(sim, L) || [-1, 0, 1].some(k => sim.groundAt(sim.idx(g.x + k, g.y - 1)) === G.ASPHALT);
    if (!driven || !behind) out.push({ key: 'gateDrive', msg: 'Pave a drive from the street to your gate, and a Drive Aisle behind it.', short: 'pave a drive to your gate and an aisle behind it', tool: 'aisle', btn: 'Build an aisle' });
  }
  if (!sim.objs('unit').length) out.push({ key: 'units', msg: 'Build storage units inside the secured yard.', short: 'build storage units inside the secured yard', tool: 'du5x10', btn: 'Build units' });
  return out;
}

// First still-needed item, for the coach line and the office tool strip. A suggestion only.
export function officeSiteStep(sim) {
  return openNeeds(sim)[0] || null;
}

// Refused office plans keep their status and footprint; only the wording is made actionable.
export function explainOfficeRefusal(sim, R) {
  if (!R || R.status !== 'invalid' || !classic(sim)) return R;
  if (R.reasons[0] === LANDING) R.reasons[0] = OFFICE_LANDING_HINT;
  else if (R.reasons[0] === OFF8 && lineOf(sim) === sim.s.parcel.y1) {
    const step = openNeeds(sim).find(n => n.key === 'frontRow');
    if (step) { R.reasons = [step.msg, ...R.reasons]; R.siteStep = step; }
  }
  return R;
}

// Optional full checklist for an unopened classic property. Done flags are derived from
// openingIssues() and the shared access checks; the order is only a suggestion.
export function openingSteps(sim) {
  if (!classic(sim) || sim.s.open) return null;
  const iss = sim.openingIssues(), GATE = 'Main gate is not connected to the street', UNITS = 'No operating rent-ready units';
  const office = sim.objs('office')[0], L = lineOf(sim);
  if (legacyOffice(sim, L)) {
    // Legacy yard office (D2): the abaf108 checklist, unchanged.
    const officeIssues = iss.filter(m => m !== GATE && m !== UNITS);
    const gates = classicOfficeGates(sim);
    const parkingOk = gates.length > 0 && classicGateParking(sim, gates).length > 0;
    return [
      { label: 'Entrance Gate on the front fence, finished', done: !iss.includes(GATE) },
      { label: 'Drive Aisle from the gate into the lot', done: yardAisle(sim, sim.s.parcel.y1) },
      { label: 'Parking painted on the aisle', done: parkingOk },
      { label: office && office.cstate !== 'operating' ? 'Office, door facing pavement that reaches Parking (being built)' : 'Office, door facing pavement that reaches Parking', done: !!office && !officeIssues.length },
      { label: 'At least one rent-ready unit (drive-up doors face the aisle)', done: !iss.includes(UNITS) },
      { label: 'Tap Open property below', done: false },
    ];
  }
  const need = new Set(openNeeds(sim).map(n => n.key));
  const split = splitAt(sim.s, L);
  return [
    { label: 'Security line chosen with an Entrance Gate, public lot in front', done: split },
    { label: 'Customer Parking in the public lot, with a drive from the street', done: split && !need.has('parking') && !need.has('wait') && !iss.some(m => /^Office needs customer Parking/.test(m)) },
    { label: office && office.cstate !== 'operating' ? 'Office in the public lot, facing your Parking (being built)' : 'Office in the public lot, facing your Parking', done: !!office && office.cstate === 'operating' && isPublicOffice(sim, office, L) },
    { label: 'Staff route from the office into the yard', done: !!office && isPublicOffice(sim, office, L) && !need.has('staff') },
    { label: 'Drive from the street to the gate, and a Drive Aisle behind it', done: split && !iss.includes(GATE) && !need.has('gateDrive') },
    { label: 'At least one rent-ready unit inside the secured yard', done: !iss.includes(UNITS) },
    { label: 'Tap Open property below', done: false },
  ];
}
// Legacy yard offices keep the abaf108 checklist note; SL-1 lots say the order is free.
export function openingStepsNote(sim) {
  return legacyOffice(sim, lineOf(sim)) ? 'The office checks for a working gate and Parking, so build those before it. Units can go in any time.'
    : 'These are what is still needed to open. Build them in any order; the list order is only a suggestion.';
}
