// Authored scenarios (GDD §44) and configurable sandbox starts (GDD §45).
// Every scenario shows its goals and fail condition from the first minute.
import { newState, Sim } from './sim.js';
import { makeMaple } from './maple.js';
import { G } from './data.js';

export const SCENARIOS = {
  turnaround: {
    name: 'Maple Turnaround',
    blurb: 'The previous owner let Maple Street slide: broken lights, a failing gate, dirty loading bays and ten empty units. Legacy rents are low and cash is thin.',
    goals: [{ k: 'occ', v: 0.95, label: 'Occupancy at least 95%', fmt: 'pct' }, { k: 'rep', v: 0.8, label: 'Reputation at least 80%', fmt: 'pct' }, { k: 'roll', v: 3000, label: 'Monthly rent roll at least $3,000', fmt: 'money' }],
    deadline: 150, fail: { cashBelow: -5000, cashDays: 14 },
  },
  vertical: {
    name: 'Go Vertical',
    blurb: 'A tight urban parcel with strong small-unit demand. The only way to scale is up - elevators, stairs and power decide how far.',
    goals: [{ k: 'upperLeased', v: 40, label: '40 upper-floor units leased', fmt: 'n' }, { k: 'elevWait', v: 10, cmp: '<', label: 'Average elevator wait under 10 min', fmt: 'min' }, { k: 'contrib30', v: 1, label: 'Positive operating contribution over 30 days', fmt: 'money' }],
    deadline: 300, fail: { cashBelow: -15000, cashDays: 21 },
  },
  climate: {
    name: 'Climate Boom',
    blurb: 'A new medical-records and wine crowd is moving into town. Two in three shoppers want climate control - if you can keep it cool.',
    goals: [{ k: 'climateLeased', v: 24, label: '24 climate units leased', fmt: 'n' }, { k: 'climateScore', v: 0.9, label: 'Climate experience at least 90% (with 5+ climate tenants)', fmt: 'pct' }],
    deadline: 240, fail: { cashBelow: -8000, cashDays: 14 },
  },
};

function scenarioState(id) {
  const S = SCENARIOS[id];
  return { id, name: S.name, goals: S.goals.map((g) => ({ ...g })), deadline: S.deadline, fail: { ...S.fail }, status: 'active', badDays: 0 };
}

// build infrastructure instantly (setup only), then restore normal rules
function prebuild(sim, list) {
  const s = sim.s, cre = s.creative; s.creative = true;
  for (const a of list) { const r = sim.dispatch({ type: 'build', ...a }); if (!r.ok) console.warn('prebuild', a.tool, r.msg); }
  s.creative = cre; s.ledger = []; s.lastCommit = null;
  sim.rebuild();
}
function freshBooks(s) { s.today = { day: 1, rent: 0, other: 0, opex: 0, payroll: 0, capex: 0, leases: 0, moveouts: 0, prospects: 0, lost: 0 }; s.days = []; s.milestones = {}; }

export function makeScenario(id) {
  if (id === 'turnaround') {
    const sim = makeMaple(4401); const s = sim.s;
    s.mode = 'scenario'; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = true;
    s.cash = 7000;
    // ten tenants have left; their units need make-ready
    let r = 99; const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
    const leased = sim.objs('unit').filter((u) => u.lease).sort((a, b) => a.id - b.id);
    for (let k = 0; k < 10 && leased.length; k++) {
      const u = leased.splice(Math.floor(rnd() * leased.length), 1)[0]; const L = s.leases[u.lease];
      delete s.tenants[L.tenant]; delete s.leases[L.id]; u.lease = null; u.commercial = 'unready'; u.vacatedAt = s.t - 2000;
      sim.addTask({ type: 'makeready', need: 'makeready', obj: u.id, label: 'Make-ready ' + u.name, work: 150 });
    }
    s.visits = s.visits.filter((v) => !v.tenant || s.tenants[v.tenant]);
    for (const o of sim.objs('light')) o.cond = 0.22 + rnd() * 0.3;
    for (const o of sim.objs('gate')) o.cond = 0.3;
    for (const c of s.carts) c.cond = 0.3 + rnd() * 0.3;
    for (let i = 0; i < s.ground.length; i++) if (s.ground[i] === G.LOADING || s.ground[i] === G.CONCRETE) s.dirt[0][i] = 0.5 + rnd() * 0.4;
    for (let i = 0; i < s.ground.length; i++) if (s.hall[0][i]) s.dirt[0][i] = 0.4 + rnd() * 0.4;
    Object.assign(s.exp, { access: 0.62, convenience: 0.7, cleanliness: 0.5, security: 0.5, service: 0.72 });
    for (const tn of Object.values(s.tenants)) tn.sat = Math.min(tn.sat, 0.62 + rnd() * 0.1);
    // the previous owner let collections slide: three accounts are behind (GDD §36)
    { const Ls = Object.values(s.leases).sort((a, b) => a.id - b.id); const day = Math.floor(s.t / 1440) + 1;
      [[27, 'delinquent'], [18, 'delinquent'], [8, 'pastdue']].forEach(([late, st], k) => { const L = Ls[k * 3 + 1]; if (!L) return;
        L.status = st; L.dueSince = day - late; L.balance = L.rent * (late > 25 ? 2 : 1); L.fees = 20; L.feeDone = true; if (st === 'delinquent') s.objects[L.unit].overlock = true; }); }
    s.scenario = scenarioState(id); freshBooks(s);
    sim.markDirty(); sim.rebuild(); sim.generateTasks();
    return sim;
  }
  if (id === 'vertical') {
    const s = newState({ mode: 'scenario', seed: 5150, market: 'urban', W: 36, H: 28 });
    s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = false;
    const sim = new Sim(s);
    s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
    const y1 = s.parcel.y1;
    prebuild(sim, [
      { tool: 'gate', a: { x: 18, y: y1 }, b: { x: 18, y: y1 } },
      { tool: 'aisle', a: { x: 17, y: 14 }, b: { x: 19, y: y1 } },
      { tool: 'parking', a: { x: 17, y: 18 }, b: { x: 17, y: 21 } },
      { tool: 'office', a: { x: 14, y: 19 }, b: { x: 14, y: 19 } },
    ]);
    s.cash = 140000; s.scenario = scenarioState(id); freshBooks(s);
    return sim;
  }
  if (id === 'climate') {
    const s = newState({ mode: 'scenario', seed: 8080, market: 'blank' });
    s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = false;
    s.opts = { climateShare: 0.65, demand: 1.15 };
    const sim = new Sim(s);
    s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
    const y1 = s.parcel.y1;
    prebuild(sim, [
      { tool: 'gate', a: { x: 20, y: y1 }, b: { x: 20, y: y1 } },
      { tool: 'aisle', a: { x: 19, y: 17 }, b: { x: 21, y: y1 } },
      { tool: 'parking', a: { x: 19, y: 23 }, b: { x: 19, y: 26 } },
      { tool: 'office', a: { x: 16, y: 24 }, b: { x: 16, y: 24 } },
    ]);
    s.cash = 120000; s.scenario = scenarioState(id); freshBooks(s);
    return sim;
  }
  return null;
}

// Sandbox with setup options (GDD §45)
export function makeSandbox({ market = 'blank', cash = 60000, demand = 1, wear = 1 } = {}) {
  const s = newState({ mode: 'sandbox', seed: 777 + Math.round(cash / 1000), market });
  s.cash = cash; s.opts = { demand, wear };
  const sim = new Sim(s);
  s.staff.push({ id: sim.id(), role: 'owner', name: 'You', wage: 0, hired: 0 });
  return sim;
}

export function scenarioProgress(sim) {
  const sc = sim.s.scenario; if (!sc) return null;
  return sc.goals.map((g) => ({ ...g, cur: sim.metric(g.k), met: sim.goalMet(g) }));
}
