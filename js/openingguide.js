// SB-1: opening guidance for classic (no public frontage) properties such as the
// empty-lot Sandbox and acquired parcels. Read-only: every check reuses the
// existing office and opening validation; nothing here changes what is legal.
import { G } from './data.js';
import { classicOfficeGates, classicGateParking } from './mapleaccess.js';

const LANDING = 'Office entrance needs a clear outdoor pedestrian landing on the selected side.';
export const OFFICE_LANDING_HINT = 'Office door needs pavement in front of it. Face the door onto your Parking or a walkway that reaches it.';

const classic = sim => !sim.frontage();
const interiorAisle = sim => {
  const { s, D } = sim, p = s.parcel;
  for (let y = p.y0; y < p.y1; y++) for (let x = p.x0; x <= p.x1; x++) if (D.vehReach[sim.idx(x, y)]) return true;
  return false;
};

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
  if (classicGateParking(sim, classicOfficeGates(sim)).length) return null;
  if (!interiorAisle(sim)) return { msg: 'The office needs Parking reached through the gate. Next: build a Drive Aisle from the gate into the lot.', short: 'build a Drive Aisle from the gate into the lot', tool: 'aisle', btn: 'Build an aisle' };
  if ([...sim.D.pendingGround.values()].includes(G.PARKING)) return { msg: 'The office needs finished Parking. Let the Parking paint finish first.', short: 'let the Parking paint finish' };
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
// derived from openingIssues() or the shared office checks above.
export function openingSteps(sim) {
  if (!classic(sim) || sim.s.open) return null;
  const iss = sim.openingIssues(), GATE = 'Main gate is not connected to the street', UNITS = 'No operating rent-ready units';
  const officeIssues = iss.filter(m => m !== GATE && m !== UNITS);
  const office = sim.objs('office')[0];
  const aisleOk = !!office || interiorAisle(sim);
  const parkingOk = !!office || (!!classicOfficeGates(sim).length && !!classicGateParking(sim, classicOfficeGates(sim)).length);
  return [
    { label: 'Entrance Gate on the front fence, finished', done: !iss.includes(GATE) },
    { label: 'Drive Aisle from the gate into the lot', done: aisleOk },
    { label: 'Parking painted on the aisle', done: parkingOk },
    { label: office && office.cstate !== 'operating' ? 'Office, door facing pavement that reaches Parking (being built)' : 'Office, door facing pavement that reaches Parking', done: !!office && !officeIssues.length },
    { label: 'At least one rent-ready unit (drive-up doors face the aisle)', done: !iss.includes(UNITS) },
    { label: 'Tap Open property below', done: false },
  ];
}
