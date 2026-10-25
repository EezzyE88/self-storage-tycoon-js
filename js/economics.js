// Small derived views of existing simulation state. Recommendations never mutate gameplay.
import { ROLES, OPEX, SIZES, MIN_PER_DAY } from './data.js';
import { cents } from './finance.js';
import { rollingShopperPeriod, periodText } from './reporting.js';
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
  const officeServing = s.officeQ.filter((id) => s.agents.some((a) => a.id === id && a.serveT > 0)).length;
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
    officeServing, officeWaiting: Math.max(0, s.officeQ.length - officeServing),
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
  const period = rollingShopperPeriod(sim.day);
  for (const x of s.mkt.lostLog) if (x.d >= period.start && x.d <= period.end && ['noSize', 'noReady', 'noClimate'].includes(x.r)) {
    const k = x.sz + (x.climate || x.r === 'noClimate' ? ' climate' : ''); bySize[k] = (bySize[k] || 0) + 1;
  }
  for (const [size, n] of Object.entries(bySize).sort((a, b) => b[1] - a[1]).slice(0, 2)) add(`${n} shoppers wanted ${size} and found none`, 'Suitable rentable inventory missing', 'Observed demand opportunity; shoppers are not promised leases', 'Turn over suitable units first, then assess an expansion', 'growth');
  if (o.exhausted >= 3) add(`Owner capacity exhausted on ${o.exhausted} of ${o.workDays.length} measured days`, 'Office service and property work compete for time', 'Backlogs can keep inventory unavailable', 'Hire for the measured workload or schedule work before expanding');
  if (o.officeQueue || o.lost.service) {
    const waiting = o.officeWaiting;
    const history = o.lost.service ? `${o.lost.service} service-related shopper losses in ${periodText(rollingShopperPeriod(sim.day))}` : `No service-related shopper losses in ${periodText(rollingShopperPeriod(sim.day))}`;
    add(`${waiting} waiting now; ${o.officeServing} being served · ${history}`,
      o.officeQueue ? 'Current office queue; historical losses are separate' : 'Historical office losses; no shoppers at the office now',
      waiting ? 'A current wait does not by itself establish a staffing shortage' : 'Historical losses do not establish a current staffing shortage',
      waiting ? 'Check office hours, current coverage and whether waits persist before changing staffing' : o.officeServing ? 'Let current service finish; reassess if waits persist' : 'Monitor current office coverage and future queues before changing staffing');
  }
  if (o.open.some((u) => u.access === 'interior') && !o.cartsAvailable) add('No carts currently in a corral', 'Interior customers may wait or carry by hand', 'Convenience suffers; carts may be in use rather than missing', o.cartsTotal ? 'Return stranded carts or inspect cart demand' : 'Buy carts at a loading corral');
  for (const x of sim.objs('elevator').filter((e) => (e.avgWait || 0) >= 10)) add(`Elevator average wait ${Math.round(x.avgWait)} min`, 'Upper-floor customer flow constrained', 'Upper-floor convenience reduces leasing appeal', 'Check elevator condition and cart routing', 'operate', x.id);
  if (o.unavailable.some((u) => u.missing && u.missing.length)) add('Unit requirements or routes missing', 'Built inventory cannot offer reliable access', 'Capital is tied up in unavailable units', 'Tap a blocked unit and fix its listed requirements', 'growth');
  return out;
}
export function staffingEvidence(sim, role) {
  const o = operations(sim), tasks = o.tasks.filter((t) => ROLES[role].can.includes(t.need));
  const pending = tasks.filter(t => !t.assigned && !t.queued), covered = tasks.filter(t => t.assigned || t.queued);
  const hours = sum(tasks, t => sim.taskHours(t)), unassignedHours = sum(pending, t => sim.taskHours(t));
  const assignedHours = sum(covered, t => sim.taskHours(t));
  const workload = `${unassignedHours}h unassigned; ${assignedHours}h assigned/queued or in progress (nominal task requirements, not hours saved). ${pending.length ? 'Matching backlog may warrant review.' : 'No matching unassigned task backlog evidenced.'}`;
  const evidence = {
    porter: `${o.makeReady} units await make-ready. Cleaning, cart and turnover work: ${workload} $${Math.round(o.askingOffline)}/mo asking-rent capacity offline, not promised income.`,
    tech: `Repair work: ${workload} ${o.equipmentRisk.length} access/climate assets failed or unreliable.`,
    clerk: `${o.officeWaiting} waiting now; ${o.officeServing} being served. Owner office service: ${o.officeHours}h over ${o.workDays.length} measured days. Current waits and historical work do not prove a shortage.`,
    manager: `${o.tasks.filter(t => t.type === 'repair' && !t.assigned && !t.queued).length} repairs await assignment. Automates existing pricing, vendor and cart policies; does not add task-hours or prove Owner capacity relief.`,
  }[role];
  return { evidence, hours, unassignedHours, assignedHours, monthlyWages: cents(ROLES[role].wage * 30) };
}
export function planDailyCost(sim, plan) {
  // Full operating burden, including per-unit tax omitted by the older build preview.
  let value = plan.opex || 0;
  const units = (plan.creates || []).filter((x) => x.type === 'unit');
  if (sim.pressureOn()) value += units.length * 0.25;
  if (plan.tool === 'gate') value += OPEX.gate + OPEX.keypad;
  value *= (sim.pressureOn() ? sim.costIdx() * ((sim.s.coTier || 1) >= 4 ? 0.92 : 1) : 1) * (sim.s.opts && sim.s.opts.costs || 1);
  return cents(value);
}
// Ephemeral evidence contract (never stored):
// scope: aggregate | selected | nonUnit; window: capped day difference, NOT inclusive date count;
// period: inclusive game-day labels; matchingLosses: sum within that interval and scope.
// products[]: key/size/env, proposedCount, losses, operatingStock, contractedStock,
// readyVacancies, unavailableStock, occupancy (contracted, not physically occupied), observedRent,
// supported/reasons (payback evidence), demandSupported/demandReasons (expansion advice).
// Aggregate/nonUnit never claim support. Empty selected products cannot pass by vacuous truth.
// Reason codes are stable; presentation consumers must not invent their own evidence rules.
export function investmentEvidence(sim, plan = null) {
  const window = Math.min(30, Math.max(0, sim.day - sim.s.finance.observedFrom));
  const period = { start: Math.max(1, sim.s.finance.observedFrom, sim.day - 29), end: sim.day };
  const losses = sim.s.mkt.lostLog.filter(x => x.d >= period.start && x.d <= period.end && ['noSize', 'noReady', 'noClimate'].includes(x.r));
  const units = sim.objs('unit'), proposed = (plan?.creates || []).filter(u => u.type === 'unit');
  const lossKey = x => `${x.sz}|${x.climate || x.r === 'noClimate' ? 'climate' : 'std'}`;
  const scope = plan == null ? 'aggregate' : proposed.length ? 'selected' : 'nonUnit';
  const keys = scope === 'selected' ? [...new Set(proposed.map(key))] : scope === 'aggregate' ? [...new Set([...units.map(key), ...losses.map(lossKey)])] : [];
  const products = keys.map(k => {
    const stock = units.filter(u => key(u) === k), operating = stock.filter(u => u.cstate === 'operating');
    const contracted = operating.filter(u => u.lease && sim.s.leases[u.lease]);
    const readyVacancies = operating.filter(u => !u.lease && !u.blocked && !u.missing?.length && u.commercial === 'ready').length;
    const unavailableStock = stock.filter(u => u.cstate !== 'operating' || u.blocked || u.missing?.length || !u.lease && u.commercial !== 'ready').length;
    const n = losses.filter(x => lossKey(x) === k).length, occupancy = operating.length ? contracted.length / operating.length : null;
    const reasons = [...(window < 14 ? ['insufficient_window'] : []), ...(contracted.length < 3 ? ['insufficient_comparables'] : []), ...(n < 5 ? ['insufficient_losses'] : [])];
    const demandReasons = [...(window < 14 ? ['insufficient_window'] : []), ...(n < 5 ? ['insufficient_losses'] : []), ...(!operating.length ? ['no_operating_stock'] : occupancy < 0.9 ? ['low_contractual_occupancy'] : []), ...(readyVacancies ? ['ready_vacancies'] : [])];
    const [size, env] = k.split('|');
    return { key: k, size, env, proposedCount: proposed.filter(u => key(u) === k).length, losses: n,
      operatingStock: operating.length, contractedStock: contracted.length, readyVacancies, unavailableStock, occupancy,
      observedRent: contracted.length ? sum(contracted, u => sim.s.leases[u.lease].rent) / contracted.length : null,
      supported: !reasons.length, reasons, demandSupported: !demandReasons.length, demandReasons };
  });
  return { scope, window, period, matchingLosses: sum(products, p => p.losses), products,
    supported: scope === 'selected' && products.length > 0 && products.every(p => p.supported),
    reasons: scope === 'aggregate' ? ['select_product'] : scope === 'nonUnit' ? ['no_unit_proposal'] : [...new Set(products.flatMap(p => p.reasons))],
    demandSupported: scope === 'selected' && products.length > 0 && products.every(p => p.demandSupported) };
}
const productLabel = p => `${p.size} ${p.env === 'climate' ? 'climate' : 'standard'}`;
export function demandEvidenceText(e) {
  const period = periodText(e.period);
  if (e.scope !== 'selected') return `${e.matchingLosses} availability losses across sizes and standard/climate products in ${period}. Select a unit product to assess matching demand.`;
  return e.products.map(p => `${productLabel(p)}: ${p.losses} matching availability losses in ${period}; ${p.operatingStock ? Math.round(p.occupancy * 100) + '% contracted' : 'no operating comparables'}; ${p.readyVacancies} suitable ready vacancies. ${p.readyVacancies ? 'Rent suitable existing stock first.' : p.unavailableStock ? `${p.unavailableStock} matching units unavailable; review restoration before expansion.` : p.demandSupported ? 'Observed requests support reviewing this product.' : 'Gather more matching demand and stock evidence.'}`).join(' ') + ' Requests are not guaranteed leases.';
}
export function investment(sim, plan, { extraStaff = null, completePackage = false, leaseUpMonths = 0, repairAllowance = 0 } = {}) {
  const units = (plan?.creates || []).filter(x => x.type === 'unit');
  if (!units.length) return null; // preserves existing no-unit caller contract
  const evidence = investmentEvidence(sim, plan), products = evidence.products.map(p => p.key);
  const existing = sim.objs('unit').filter(u => u.cstate === 'operating' && products.includes(key(u)));
  const leased = existing.filter(u => u.lease && sim.s.leases[u.lease]), rents = leased.map(u => sim.s.leases[u.lease].rent);
  const occupancy = existing.length ? leased.length / existing.length : null;
  const observedRent = rents.length ? sum(rents, v => v) / rents.length : null;
  const productEstimates = evidence.products.map(p => {
    const comparable = leased.filter(u => key(u) === p.key);
    const rentCapacity = cents(sum(units.filter(u => key(u) === p.key), u => Math.min(sim.askFor(u), comparable.length ? sum(comparable, v => sim.s.leases[v.lease].rent) / comparable.length : sim.askFor(u))));
    return { ...p, rentCapacity, lowOccupancy: p.occupancy == null ? null : Math.max(0, p.occupancy - 0.15), highOccupancy: p.occupancy == null ? null : Math.min(0.95, p.occupancy) };
  });
  const rentCapacity = cents(sum(productEstimates, p => p.rentCapacity));
  const lowOccupancy = productEstimates.length === 1 ? productEstimates[0].lowOccupancy : null;
  const highOccupancy = productEstimates.length === 1 ? productEstimates[0].highOccupancy : null;
  const staffDaily = extraStaff ? ROLES[extraStaff].wage : 0;
  const daily = planDailyCost(sim, plan) + staffDaily, burden = daily * 30 + repairAllowance;
  const measurable = productEstimates.every(p => p.lowOccupancy != null);
  const lowNet = measurable ? cents(sum(productEstimates, p => p.rentCapacity * p.lowOccupancy) - burden) : null;
  const highNet = measurable ? cents(sum(productEstimates, p => p.rentCapacity * p.highOccupancy) - burden) : null;
  const enough = evidence.supported;
  const layoutReady = plan.status === 'valid' && !(plan.missing || []).length && !(plan.warn || []).length;
  // Concurrent blockers: missing evidence must not erase known margin/layout problems.
  const unavailableReasons = [
    ...evidence.products.filter(p => !p.supported).map(p => ({ code: 'insufficient_evidence', product: p.key, reasons: p.reasons })),
    ...(measurable && (lowNet <= 0 || highNet <= 0) ? [{ code: 'non_positive_margin' }] : []),
    ...(!layoutReady ? [{ code: 'layout_unresolved' }] : []),
  ];
  const range = enough && layoutReady && lowNet > 0 && highNet > 0 ? [plan.cost / highNet + leaseUpMonths, plan.cost / lowNet + leaseUpMonths] : null;
  return { products, evidence, productEstimates, window: evidence.window, missing: evidence.matchingLosses, occupancy, observedRent, rentCapacity, lowOccupancy, highOccupancy,
    daily, staffDaily, lowNet, highNet, range, enough, unavailableReasons, completePackage, leaseUpMonths, repairAllowance, cost: plan.cost,
    position: sim.financialPosition({ spend: plan.cost, extraDaily: daily }), layoutReady };
}
export function paybackText(I) {
  if (!I) return 'Payback unavailable: select a unit proposal.';
  if (!I.range) return 'Payback unavailable: ' + I.unavailableReasons.map(r => r.code === 'insufficient_evidence' ? `insufficient comparable evidence for ${productLabel(I.evidence.products.find(p => p.key === r.product))}` : r.code === 'non_positive_margin' ? 'modeled incremental margin is non-positive under the stated assumptions' : 'layout or access prerequisites remain unresolved').join('; ') + '.';
  const assumptions = I.productEstimates.map(p => `${productLabel(p)} ${Math.round(p.lowOccupancy * 100)}–${Math.round(p.highOccupancy * 100)}% contracted-stock occupancy`).join('; ');
  return `Steady-state payback ${Math.floor(I.range[0])}–${Math.ceil(I.range[1])} months; ${assumptions}${I.leaseUpMonths ? `; includes ${I.leaseUpMonths}-month lease-up allowance` : ''}. Assumptions, not guaranteed profit.`;
}
export function growthReadiness(sim, plan = null, options = {}) {
  const o = operations(sim), I = investment(sim, plan, options), E = I?.evidence || investmentEvidence(sim, plan), P = I ? I.position : sim.financialPosition();
  const capacityKnown = o.workDays.length >= 7;
  const roleAdvice = options.extraStaff ? ` Proposed ${ROLES[options.extraStaff].name} ($${ROLES[options.extraStaff].wage}/day): ${staffingEvidence(sim, options.extraStaff).evidence} ${I ? 'Wages included in the selected quote.' : 'No construction quote selected; review payroll separately.'} Capacity relief is not proven.` : '';
  const checks = [
    { label: E.scope === 'selected' ? 'Product demand evidence' : 'Demand observations', ok: E.demandSupported, detail: demandEvidenceText(E) },
    { label: 'Operational stability', ok: !o.equipmentRisk.length && o.makeReady <= 2 && o.oldestUnassigned <= 2, detail: `${o.makeReady} make-readies; ${o.equipmentRisk.length} failed/unreliable access or climate assets; oldest unassigned work ${Math.floor(o.oldestUnassigned)} days.` },
    { label: 'Financial readiness', ok: !!I && P.available >= 0, detail: `${I ? 'After selected construction: ' : 'Before selecting a build: '}$${Math.round(P.available).toLocaleString()} available after bills & reserve. Affordability does not establish demand or payback.` },
    { label: 'Capacity headroom', ok: capacityKnown && o.exhausted < 3, detail: `${o.exhausted} of ${o.workDays.length} measured days exhausted Owner capacity. ${capacityKnown ? 'Check the work mix before hiring.' : 'Measure seven days first.'}${roleAdvice}` },
    { label: 'Investment payback', ok: !!I?.range && (!options.completePackage || I.range[1] <= 18), detail: paybackText(I) + (I?.range && options.completePackage ? ' Complete-package benchmark: 12–18 months.' : '') },
  ];
  return { checks, investment: I, justified: checks.every(c => c.ok), title: checks.every(c => c.ok) ? 'Expansion looks justified' : 'Expansion needs attention' };
}
