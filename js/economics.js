// Small derived views of existing simulation state. Recommendations never mutate gameplay.
import { ROLES, OPEX, SIZES, MIN_PER_DAY } from './data.js';
import { cents } from './finance.js';
const key = (u) => `${u.size}|${u.env || 'std'}`;
const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);

export function operations(sim) {
  sim.ensure();
  const s = sim.s, units = sim.objs('unit'), open = units.filter((u) => u.cstate === 'operating');
  const unavailable = units.filter((u) => u.cstate !== 'construction' && (u.blocked || u.commercial === 'unready' || u.cstate === 'built'));
  const leasedBlocked = unavailable.filter((u) => u.lease && s.leases[u.lease]);
  const vacantOffline = unavailable.filter((u) => !u.lease);
  const ready = open.filter((u) => !u.blocked && !u.lease && u.commercial === 'ready');
  const workDays = s.days.filter((d) => d.workMeasured).slice(-7);
  const owner = s.staff.find((st) => st.role === 'owner');
  const tasks = s.tasks.filter((t) => !t.vendor), unassigned = tasks.filter((t) => !t.assigned);
  return {
    units, open, ready, unavailable, vacantOffline, leasedBlocked, tasks, workDays,
    contractedAffected: cents(sum(leasedBlocked, (u) => s.leases[u.lease].rent)),
    askingOffline: cents(sum(vacantOffline, (u) => sim.askFor(u) || 0)),
    makeReady: units.filter((u) => u.commercial === 'unready' && !u.lease).length,
    exhausted: workDays.filter((d) => d.ownerUsed >= 8).length,
    officeHours: sum(workDays, (d) => d.ownerOffice || 0),
    ownerRemaining: owner ? sim.workRemaining(owner) : 0,
    oldestUnassigned: unassigned.length ? Math.max(...unassigned.map((t) => (s.t - t.created) / MIN_PER_DAY)) : 0,
    critical: ['gate', 'elevator', 'hvac'].flatMap((type) => sim.objs(type).filter((o) => o.cstate === 'operating' && !sim.works(o))),
    equipmentRisk: ['gate', 'elevator', 'hvac'].flatMap((type) => sim.objs(type).filter((o) => o.cstate === 'operating' && ((o.cond ?? 1) < 0.45 || o.unpowered))),
    officeQueue: s.officeQ.length,
    cartsAvailable: s.carts.filter((c) => c.st === 'corral').length,
    cartsTotal: s.carts.filter((c) => c.st !== 'damaged').length,
    lost: sim.lostRecent(30),
  };
}
export function diagnostics(sim) {
  const o = operations(sim), s = sim.s, out = [];
  const add = (cause, effect, consequence, action, tab = 'operate', obj = null) => out.push({ cause, effect, consequence, action, tab, obj });
  for (const x of o.equipmentRisk) {
    const names = { gate: 'Gate', elevator: 'Elevator', hvac: 'HVAC' };
    add(`${names[x.type]} ${sim.works(x) ? 'unreliable' : 'not working'}`, x.type === 'hvac' ? 'Climate service degraded' : 'Customer access degraded', 'Customer experience suffers; renewals and leasing are at risk', x.unpowered ? 'Check power capacity' : `Repair ${names[x.type].toLowerCase()}`, 'operate', x.id);
  }
  if (o.unavailable.length) add(`${o.unavailable.length} units unavailable`, `${o.makeReady} await make-ready; ${o.leasedBlocked.length} leased units have access problems`, `${o.askingOffline ? `$${Math.round(o.askingOffline).toLocaleString()}/mo asking-rent capacity offline (not guaranteed revenue). ` : ''}${o.contractedAffected ? `$${Math.round(o.contractedAffected).toLocaleString()}/mo contracted rent affected by access.` : ''}`, 'Restore routes or use Owner, Porter or vendor work');
  const bySize = {};
  for (const x of s.mkt.lostLog) if (x.d > sim.day - 30 && ['noSize', 'noReady', 'noClimate'].includes(x.r)) {
    const k = x.sz + (x.climate || x.r === 'noClimate' ? ' climate' : ''); bySize[k] = (bySize[k] || 0) + 1;
  }
  for (const [size, n] of Object.entries(bySize).sort((a, b) => b[1] - a[1]).slice(0, 2)) add(`${n} shoppers wanted ${size} and found none`, 'Suitable rentable inventory missing', 'Observed demand opportunity; shoppers are not promised leases', 'Turn over suitable units first, then assess an expansion', 'growth');
  if (o.exhausted >= 3) add(`Owner capacity exhausted on ${o.exhausted} of ${o.workDays.length} measured days`, 'Office service and property work compete for time', 'Backlogs can keep inventory unavailable', 'Hire for the measured workload or schedule work before expanding');
  if (o.officeQueue || o.lost.service) add(`${o.officeQueue} waiting at the office${o.lost.service ? `; ${o.lost.service} service-related shopper losses recorded` : ''}`, 'Office service capacity constrained', 'Shoppers wait while Owner work capacity is consumed', 'Free Owner office hours or consider a Clerk');
  if (o.open.some((u) => u.access === 'interior') && !o.cartsAvailable) add('No carts currently in a corral', 'Interior customers may wait or carry by hand', 'Convenience suffers; carts may be in use rather than missing', o.cartsTotal ? 'Return stranded carts or inspect cart demand' : 'Buy carts at a loading corral');
  for (const x of sim.objs('elevator').filter((e) => (e.avgWait || 0) >= 10)) add(`Elevator average wait ${Math.round(x.avgWait)} min`, 'Upper-floor customer flow constrained', 'Upper-floor convenience reduces leasing appeal', 'Check elevator condition and cart routing', 'operate', x.id);
  if (o.unavailable.some((u) => u.missing && u.missing.length)) add('Unit requirements or routes missing', 'Built inventory cannot offer reliable access', 'Capital is tied up in unavailable units', 'Tap a blocked unit and fix its listed requirements', 'growth');
  return out;
}
export function staffingEvidence(sim, role) {
  const o = operations(sim), tasks = o.tasks.filter((t) => ROLES[role].can.includes(t.need));
  const hours = sum(tasks, (t) => sim.taskHours(t));
  const evidence = {
    porter: `${o.makeReady} units await make-ready; ${hours}h of cleaning, cart and turnover work queued. $${Math.round(o.askingOffline)}/mo asking-rent capacity offline, not promised income.`,
    tech: `${hours}h of repair work queued; ${o.equipmentRisk.length} access/climate assets failed or unreliable.`,
    clerk: `${o.officeHours}h of Owner office service over ${o.workDays.length} measured days; ${o.officeQueue} shoppers waiting now.`,
    manager: `${sim.s.tasks.filter((t) => t.type === 'repair' && !t.assigned).length} repairs await assignment; ${sim.objs('unit').filter((u) => u.cstate === 'ready').length} units await commissioning. Automates existing policies; does not add task-hours.`,
  }[role];
  return { evidence, hours, monthlyWages: cents(ROLES[role].wage * 30) };
}
export function planDailyCost(sim, plan) {
  // Full commissioned burden, including per-unit tax omitted by the older build preview.
  let value = plan.opex || 0;
  const units = (plan.creates || []).filter((x) => x.type === 'unit');
  if (sim.pressureOn()) value += units.length * 0.25;
  if (plan.tool === 'gate') value += OPEX.gate + OPEX.keypad;
  value *= (sim.pressureOn() ? sim.costIdx() * ((sim.s.coTier || 1) >= 4 ? 0.92 : 1) : 1) * (sim.s.opts && sim.s.opts.costs || 1);
  return cents(value);
}
export function investment(sim, plan, { extraStaff = null, completePackage = false, leaseUpMonths = 0, repairAllowance = 0 } = {}) {
  const units = (plan && plan.creates || []).filter((x) => x.type === 'unit');
  if (!plan || !units.length) return null;
  const products = [...new Set(units.map(key))];
  const window = Math.min(30, Math.max(0, sim.day - sim.s.finance.observedFrom));
  const missing = sim.s.mkt.lostLog.filter((x) => x.d >= sim.s.finance.observedFrom && x.d > sim.day - 30 && ['noSize', 'noReady', 'noClimate'].includes(x.r) && products.includes(`${x.sz}|${x.climate || x.r === 'noClimate' ? 'climate' : 'std'}`)).length;
  const existing = sim.objs('unit').filter((u) => u.cstate === 'operating' && products.includes(key(u)));
  const leased = existing.filter((u) => u.lease), rents = leased.map((u) => sim.s.leases[u.lease].rent);
  const occupancy = existing.length ? leased.length / existing.length : null;
  const observedRent = rents.length ? sum(rents, (v) => v) / rents.length : null;
  const rentCapacity = cents(sum(units, (u) => {
    const comparable = leased.filter((v) => key(v) === key(u));
    // Existing contractual evidence caps the asking-price estimate. No speculative rent premium.
    const rent = comparable.length ? sum(comparable, (v) => sim.s.leases[v.lease].rent) / comparable.length : sim.askFor(u);
    return Math.min(sim.askFor(u), rent);
  }));
  const lowOccupancy = occupancy == null ? null : Math.max(0, occupancy - 0.15), highOccupancy = occupancy == null ? null : Math.min(0.95, occupancy);
  const staffDaily = extraStaff ? ROLES[extraStaff].wage : 0;
  const daily = planDailyCost(sim, plan) + staffDaily;
  const burden = daily * 30 + repairAllowance;
  const lowNet = lowOccupancy == null ? null : cents(rentCapacity * lowOccupancy - burden), highNet = highOccupancy == null ? null : cents(rentCapacity * highOccupancy - burden);
  const enough = window >= 14 && leased.length >= 3 && missing >= 5;
  const range = enough && highNet > 0 && lowNet > 0 ? [plan.cost / highNet + leaseUpMonths, plan.cost / lowNet + leaseUpMonths] : null;
  return { products, window, missing, occupancy, observedRent, rentCapacity, lowOccupancy, highOccupancy, daily, staffDaily, lowNet, highNet, range, enough, completePackage, leaseUpMonths, repairAllowance, cost: plan.cost, position: sim.financialPosition({ spend: plan.cost, extraDaily: daily }), layoutReady: plan.status === 'valid' && !(plan.missing || []).length && !(plan.warn || []).length };
}
export function growthReadiness(sim, plan = null, options = {}) {
  const o = operations(sim), I = investment(sim, plan, options), P = I ? I.position : sim.financialPosition();
  const matching = I ? o.open.filter((u) => I.products.includes(key(u))) : o.open;
  const occ = matching.length ? matching.filter((u) => u.lease).length / matching.length : 0;
  const vacancies = matching.filter((u) => !u.lease).length;
  const lost = I ? I.missing : sum(Object.entries(o.lost).filter(([r]) => ['noReady', 'noSize', 'noClimate'].includes(r)), ([, n]) => n);
  const observation = Math.min(30, Math.max(0, sim.day - sim.s.finance.observedFrom));
  const capacityKnown = o.workDays.length >= 7;
  const checks = [
    { label: 'Proven demand', ok: observation >= 14 && lost >= 5 && occ >= 0.9 && !vacancies, detail: `${lost} matching availability losses in ${observation} observed days; ${Math.round(occ * 100)}% occupancy; ${vacancies} existing vacancies. Turn over or rent existing stock first.` },
    { label: 'Operational stability', ok: !o.equipmentRisk.length && o.makeReady <= 2 && o.oldestUnassigned <= 2, detail: `${o.makeReady} make-readies; ${o.equipmentRisk.length} failed/unreliable access or climate assets; oldest unassigned work ${Math.floor(o.oldestUnassigned)} days.` },
    { label: 'Financial readiness', ok: !!I && P.available >= 0, detail: `${I ? 'After selected construction: ' : 'Before selecting a build: '}$${Math.round(P.available).toLocaleString()} available after bills & reserve.` },
    { label: 'Capacity headroom', ok: capacityKnown && (o.exhausted < 3 || !!options.extraStaff), detail: `${o.exhausted} of ${o.workDays.length} measured days exhausted Owner capacity${options.extraStaff ? `; ${options.extraStaff} wages included` : ''}. ${capacityKnown ? 'Check the work mix before hiring.' : 'Measure seven days first.'}` },
    { label: 'Investment payback', ok: !!I && I.layoutReady && !!I.range && (!options.completePackage || I.range[1] <= 18), detail: !I ? 'Select construction on the property for a scoped estimate.' : !I.layoutReady ? 'Layout prerequisites or access warnings remain.' : !I.range ? 'Not enough demand/rent evidence, or incremental margin is non-positive.' : `${Math.floor(I.range[0])}–${Math.ceil(I.range[1])} months${options.completePackage ? '; complete-package benchmark 12–18 months' : '; selected construction only, faster infill allowed'}. Occupancy sensitivity, not guaranteed ROI.` },
  ];
  return { checks, investment: I, justified: checks.every((c) => c.ok), title: checks.every((c) => c.ok) ? 'Expansion looks justified' : 'Expansion needs attention' };
}
