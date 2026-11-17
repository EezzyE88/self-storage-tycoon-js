// Career Business Opportunities Rev 1: derived, read-only standard drive-up guidance.
// Deliberately separate from Comeback Yard's authored project and saved tracking.
import { G, VEH_GROUND } from './data.js';
import { investmentEvidence } from './economics.js';

const TYPES = [
  ['5x5', 'du5x5'], ['5x10', 'du5x10'], ['10x10', 'du10x10'],
];

// Only graduated Maple Street and ordinary acquired career parcels and operating facilities.
// A completed Comeback Yard is career-eligible for progression, NOT for Rev 1.
export function careerDriveEligible(sim, company) {
  const s = sim?.s;
  if (!s || !company?.props?.length || company.props[company.active]?.sim !== sim ||
      s.creative || s.scenario || s.lesson || s.tut?.on || !s.open) return false;
  if (s.mode === 'tutorial') return !!s.tut?.done;
  // Acquired parcels and operating facilities are plain sandbox states with no stand-alone
  // sandbox settings. (Acquired operating facilities always carry s.mirror true/false.)
  // They belong to the Career only when the company began as graduated Maple Street:
  // acquisitions inside a Business/Free Build sandbox or a scenario game stay out of Rev 1.
  return company.active > 0 && s.mode === 'sandbox' && !s.sb && careerRoot(company);
}
function careerRoot(company) {
  const r = company.props[0]?.sim?.s;
  return !!r && r.mode === 'tutorial' && !!r.tut?.done && !r.creative && !r.scenario && !r.sb;
}

function reachable(sim, plan) {
  return plan.creates.every(u => sim.unitFront(u).some(c => {
    if (!sim.inb(c.x, c.y)) return false;
    const i = sim.idx(c.x, c.y);
    return !!sim.D.vehReach[i] && VEH_GROUND.has(sim.groundAt(i));
  }));
}

// Searches one ordinary standard drive-up placement per size. The simulation's
// own planner validates footprint, parcel, obstructions and utility consequences.
function firstFrontage(sim, tool) {
  const s = sim.s, p = s.parcel;
  for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
    const i = sim.idx(x, y), g = sim.groundAt(i);
    if (!sim.cellFree(i) || (g !== G.GRASS && g !== G.CONCRETE)) continue;
    if (![[0,-1],[0,1],[-1,0],[1,0]].some(([dx,dy]) => {
      if (!sim.inb(x + dx, y + dy)) return false;
      const j = sim.idx(x + dx, y + dy);
      return !!sim.D.vehReach[j] && VEH_GROUND.has(sim.groundAt(j));
    })) continue;
    for (const axis of ['x', 'y']) {
      const args = {tool, a:{x,y}, b:{x,y}, axis, f:0};
      const plan = sim.plan(args);
      if (plan?.status === 'valid' && !plan.warn?.length && !plan.missing?.length &&
          plan.creates?.length === 1 && reachable(sim, plan)) return {args, plan};
    }
  }
  return null;
}

export function careerDriveOpportunity(sim, company) {
  if (!careerDriveEligible(sim, company)) return null;
  sim.ensure();
  // The geometry cache is transient and attached only to this Sim instance.
  // Recheck current access, evidence, costs and construction plan every time.
  for (const [size, tool] of TYPES) {
    // We only search for products with sufficient real local demand evidence.
    // The selected-product check is repeated against the real placement below.
    // Existing ready, unready, blocked or still-building units take priority.
    const stock = sim.objs('unit').filter(u => u.size === size && (u.env || 'std') === 'std');
    if (!stock.length || stock.some(u => !u.lease)) continue;
    const initialEvidence = investmentEvidence(sim, {creates:[{type:'unit',size,env:'std'}]});
    if (!initialEvidence.supported || !initialEvidence.demandSupported) continue;
    // Per-tool geometry cache (including "no site"), keyed by structure version, so a
    // Growth sheet refreshing every 400 ms never rescans the whole parcel for nothing.
    let cache = sim._careerDriveFrontage;
    if (cache?.structV !== sim.s.structV) cache = sim._careerDriveFrontage = {structV:sim.s.structV, byTool:{}};
    const known = tool in cache.byTool, candidate = cache.byTool[tool];
    if (known && !candidate) continue;
    let entry = candidate ? {args:candidate, plan:sim.plan(candidate)} : null;
    if (!entry || entry.plan?.status !== 'valid' || entry.plan.warn?.length ||
        entry.plan.missing?.length || entry.plan.creates?.length !== 1 || !reachable(sim,entry.plan)) {
      entry = firstFrontage(sim,tool);
      cache.byTool[tool] = entry ? entry.args : null;
    }
    if (!entry) continue;
    const evidence = investmentEvidence(sim, entry.plan), product = evidence.products[0];
    if (!evidence.supported || !evidence.demandSupported || !product ||
        product.key !== `${size}|std` || product.readyVacancies || product.unavailableStock) continue;
    const daily = sim.planDailyCost(entry.plan);
    const position = sim.financialPosition({spend:entry.plan.cost,extraDaily:daily});
    return {size, args:entry.args, plan:entry.plan, evidence, daily, position};
  }
  return null;
}
