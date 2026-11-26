// SB-1: opening guidance for classic (no public frontage) properties such as the
// empty-lot Sandbox and acquired parcels. Read-only: every check reuses the
// existing office and opening validation; nothing here changes what is legal.
import { G, VEH_GROUND } from './data.js';
import { classicOfficeGates, classicGateParking } from './mapleaccess.js';

const LANDING = 'Office entrance needs a clear outdoor pedestrian landing on the selected side.';
export const OFFICE_LANDING_HINT = 'Office door needs pavement in front of it. Face the door onto your Parking or a walkway that reaches it.';

const classic = sim => !sim.frontage();
const interiorAisle = sim => {
  const { s, D } = sim, p = s.parcel;
  for (let y = p.y0; y < p.y1; y++) for (let x = p.x0; x <= p.x1; x++) if (D.vehReach[sim.idx(x, y)]) return true;
  return false;
};

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Pending Parking that vehicles will reach through a working gate once all
// pending paving is finished (same street start, gate crossing and parcel
// edge rules as Sim.vehNbr, read on projected ground). Read-only.
function pendingParkingReachable(sim, gates) {
  const { s, D } = sim, p = s.parcel, W = s.W;
  const pending = [...D.pendingGround].filter(([, v]) => v === G.PARKING).map(([i]) => i);
  if (!pending.length) return false;
  const want = new Set(pending), seen = new Set(), q = [];
  for (let x = 0; x < W; x++) { const i = sim.idx(x, p.y1 + 2); seen.add(i); q.push(i); }
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx, ny = y + dy; if (!sim.inb(nx, ny)) continue;
      const j = sim.idx(nx, ny);
      if (seen.has(j) || !VEH_GROUND.has(sim.groundAt(j)) || D.solid[j]) continue;
      if (((y === p.y1 && ny === p.y1 + 1) || (y === p.y1 + 1 && ny === p.y1)) &&
        !gates.some(id => { const g = s.objects[id]; return g && Math.abs(nx - g.x) <= 1; })) continue;
      if (ny <= p.y1 && (nx < p.x0 || nx > p.x1)) continue;
      if (want.has(j)) return true;
      seen.add(j); q.push(j);
    }
  }
  return false;
}

// The first site-wide step that every office position still needs, or null.
// Order follows the validation itself: a working gate, then a drive aisle and
// finished Parking that vehicles reach through it.
export function officeSiteStep(sim) {
  sim.ensure();
  if (!classic(sim) || sim.objs('office').length) return null;
  const gates = sim.objs('gate');
  if (!classicOfficeGates(sim).length) {
    if (!gates.length) return { msg: 'The office needs a working Entrance Gate first. Build one on the front fence.', short: 'build an Entrance Gate on the front fence', tool: 'gate', btn: 'Place a gate' };
    if (gates.some(g => g.cstate !== 'operating')) return { msg: 'The office needs a working Entrance Gate. Let the gate finish building first.', short: 'let the Entrance Gate finish building' };
    return { msg: 'Connect an operating secured gate to the street before building the office.', short: 'connect a working gate to the street' };
  }
  const live = classicOfficeGates(sim);
  if (classicGateParking(sim, live).length) return null;
  if (!interiorAisle(sim)) return { msg: 'The office needs Parking reached through the gate. Next: build a Drive Aisle from the gate into the lot.', short: 'build a Drive Aisle from the gate into the lot', tool: 'aisle', btn: 'Build an aisle' };
  // Wait only when the Parking being painted will actually be reachable (SB1-Q02).
  if (pendingParkingReachable(sim, live)) return { msg: 'The office needs finished Parking. Let the Parking paint finish first.', short: 'let the Parking paint finish' };
  if ([...sim.D.pendingGround.values()].includes(G.PARKING)) return { msg: 'The office needs Parking reached through the gate. The Parking being painted is not connected to the gate. Next: paint Parking on your drive aisle.', short: 'paint Parking on your drive aisle', tool: 'parking', btn: 'Paint parking' };
  return { msg: 'The office needs Parking reached through the gate. Next: paint Parking on your drive aisle.', short: 'paint Parking on your drive aisle', tool: 'parking', btn: 'Paint parking' };
}

// Put the actionable cause first on a refused office plan. Reasons are only
// reordered or reworded; the plan's status and footprint are untouched.
export function explainOfficeRefusal(sim, R) {
  if (!R || R.status !== 'invalid' || !classic(sim)) return R;
  const step = officeSiteStep(sim);
  if (step) { R.reasons = [step.msg, ...R.reasons.filter(m => m !== step.msg)]; R.siteStep = step; }
  else if (R.reasons[0] === LANDING) R.reasons[0] = OFFICE_LANDING_HINT;
  return R;
}

// Optional full checklist for an unopened classic property. Each line is
// derived from openingIssues() or the shared office and access checks above.
export function openingSteps(sim) {
  if (!classic(sim) || sim.s.open) return null;
  const iss = sim.openingIssues(), GATE = 'Main gate is not connected to the street', UNITS = 'No operating rent-ready units';
  const officeIssues = iss.filter(m => m !== GATE && m !== UNITS);
  const office = sim.objs('office')[0];
  // Read from the site as it stands, with or without an office (SB1-Q01).
  const gates = classicOfficeGates(sim);
  const aisleOk = interiorAisle(sim);
  const parkingOk = gates.length > 0 && classicGateParking(sim, gates).length > 0;
  return [
    { label: 'Entrance Gate on the front fence, finished', done: !iss.includes(GATE) },
    { label: 'Drive Aisle from the gate into the lot', done: aisleOk },
    { label: 'Parking painted on the aisle', done: parkingOk },
    { label: office && office.cstate !== 'operating' ? 'Office, door facing pavement that reaches Parking (being built)' : 'Office, door facing pavement that reaches Parking', done: !!office && !officeIssues.length },
    { label: 'At least one rent-ready unit (drive-up doors face the aisle)', done: !iss.includes(UNITS) },
    { label: 'Tap Open property below', done: false },
  ];
}
