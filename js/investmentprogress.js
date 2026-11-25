// Investment Progress: read-only presentation of player-built rental units and their contracted rent.
// Never saved, never written to sim state. Construction stamps each created object with `order`
// (sim.js commit, vertical.js); authored starting units have none. Only operating units count,
// the same base as HUD occupancy. Contracted monthly rent is not cash collected or profit.
import { unitStatus } from './status.js';
import { unitBuildRecord } from './investmentresults.js';

const dollars = (v) => '$' + Math.round(v).toLocaleString('en-US');

export function investmentProgress(sim) {
  const built = sim.objs('unit').filter((u) => u.order != null && u.cstate === 'operating');
  if (!built.length) return null;
  const leased = built.filter((u) => u.lease && sim.s.leases[u.lease]);
  return { built: built.length, leased: leased.length, vacant: built.length - leased.length,
    newRent: leased.reduce((a, u) => a + sim.s.leases[u.lease].rent, 0), roll: sim.rentRoll() };
}

// Act II chapter break: one or two short sentences about every new unit built so far.
export function actIIProgress(sim) {
  const P = investmentProgress(sim); if (!P) return '';
  return `<br><br>Your new units: <b>${P.leased} of ${P.built}</b> leased, adding <b>${dollars(P.newRent)}/month</b> in contracted rent. The rest can lease as customers arrive.`;
}

// Act III chapter break and graduation: the full explanation. The headline is omitted when nothing new is leased.
export function investmentText(sim) {
  const P = investmentProgress(sim); if (!P) return '';
  return `<br><br>${P.leased ? '<b>Your investment is starting to work.</b> ' : ''}New units: <b>${P.leased} of ${P.built}</b> leased. Monthly rent from new units: <b>${dollars(P.newRent)}</b>. Total monthly lease rent at this property: <b>${dollars(P.roll)}/month</b>.`
    + '<br><br>Occupancy may have dipped because newly opened units start empty. You paid to build them upfront; the empty units can bring in more rent when customers lease them. Monthly rent is not the same as cash collected or profit.';
}

// Graduation card (shown while the tutorial economy still applies; the change happens on Finish tutorial).
export const GRAD_TRANSITION = '<b>When you tap Finish tutorial,</b> the introductory market boost ends. From tomorrow you\'ll see fewer shoppers, and normal property taxes, insurance and rising operating costs apply. Keep an eye on monthly rent, expenses and available cash as you run Maple Street on your own.';
export function gradProgress(sim) {
  return investmentText(sim) + '<br><br>' + GRAD_TRANSITION;
}

export const REMINDER_DAYS = 30;
export const STATEMENT_POINTER = 'See Statement for your operating result over the last 30 days.';

// Business, after graduation on the campaign property: while new units are vacant, or for 30 days after graduation.
// `career` is portfolioCareer's result when the property is career-eligible (the company-wide career rent roll).
export function businessProgressHtml(sim, career = null) {
  const s = sim.s, t = s.tut;
  if (s.mode !== 'tutorial' || !t || !t.done) return '';
  const P = investmentProgress(sim); if (!P) return '';
  const recent = Number.isInteger(t.gradDay) && sim.day <= t.gradDay + REMINDER_DAYS;
  if (!P.vacant && !recent) return '';
  const next = career && career.next;
  return `<div class="note invest-progress"><p><b>New units:</b> ${P.leased} of ${P.built} leased · ${dollars(P.newRent)}/mo in contracted rent · property lease rent ${dollars(P.roll)}/mo. Empty new units can lease over time; occupancy dips while they do.</p>`
    + (recent ? '<p>The introductory market boost has ended: fewer shoppers, and normal property taxes, insurance and rising operating costs now apply.</p>' : '')
    + (next ? `<p><b>Career lease rent</b> ${dollars(career.roll)} of ${dollars(next.roll)}/mo for ${next.name}.</p>` : '')
    + `<p>${STATEMENT_POINTER}</p></div>`;
}

function driveUpStatus(sim, unit) {
  const lease = sim.s.leases[unit.lease];
  if (lease?.unit === unit.id) {
    const dated = Number.isInteger(lease.start) && lease.start > 0 && lease.start <= sim.day;
    const status = dated ? `Current lease signed Day ${lease.start}` : 'Leased';
    const pending = unit.commercial === 'reserved' ? ' · Move-in pending' : '';
    return status + pending + (unit.blocked ? unit.accessHold != null ? ' · Temporary access hold' : ' · Access blocked' : '') + (unit.retrofitOrder ? ' · Outside lights/cameras installing' : '');
  }
  if (unit.retrofitOrder) return 'Vacant, upgrade in progress';
  const state = unitStatus(unit);
  if (state === 'blocked') return 'Vacant, access blocked';
  if (state === 'handover') return 'Vacant, temporary elevator test';
  if (state === 'turnover') return 'Vacant, needs preparation';
  if (!sim.s.open) return 'Vacant, property closed';
  return state === 'available' ? 'Rent-ready, vacant' : 'Vacant, unavailable';
}

// A read-only, mutually exclusive condition inventory for the latest group. The signed-lease
// count remains separate: a reserved or temporarily inaccessible unit can have a valid lease.
function groupCondition(sim, all) {
  const counts = { blocked: 0, held: 0, upgrading: 0, unopened: 0, preparation: 0, reserved: 0, ready: 0, leased: 0, other: 0 };
  for (const u of all) {
    if (u.cstate !== 'operating') { counts.unopened++; continue; }
    // A lighting/security retrofit sets blocked while installing; it is planned work, not an access fault.
    // SI-1: an outside-only install on an occupied unit (tenantSafe) holds nothing; the unit still counts as leased.
    if (u.retrofitOrder && !sim.s.orders.find((o) => o.id === u.retrofitOrder)?.tenantSafe) { counts.upgrading++; continue; }
    const status = unitStatus(u);
    if (status === 'blocked') counts.blocked++;
    else if (status === 'handover') counts.held++;
    else if (status === 'turnover') counts.preparation++;
    else if (status === 'reserved') counts.reserved++;
    else if (status === 'available') counts.ready++;
    else if (status === 'occupied' && u.lease && sim.s.leases[u.lease]?.unit === u.id) counts.leased++;
    else counts.other++;
  }
  const phrases = [
    [counts.blocked, 'access-blocked'], [counts.held, 'temporarily held'], [counts.upgrading, 'getting an upgrade installed'],
    [counts.unopened, 'not open yet'], [counts.preparation, 'needing preparation'],
    [counts.reserved, 'reserved'], [counts.ready, 'ready and vacant'],
    [counts.leased, 'occupied with a lease'], [counts.other, 'needing a status check'],
  ];
  const description = phrases.filter(([n]) => n).map(([n, label]) => `${n} ${label}`).join(' · ');
  return { counts, description };
}

// Recommendation priority is based on actual availability, never on speculative ROI.
// Recent unmet requests may predate the build and must not be described as its outcome.
function checkinNextAction(condition, products, daysObserved) {
  const c = condition.counts;
  if (c.blocked) return 'Check the blocked unit access and its recorded route before building more.';
  if (c.held) return 'Let the temporary elevator test finish, then check access again.';
  if (c.upgrading) return 'Let the unit upgrade installation finish, then review the vacancies.';
  if (c.unopened) return 'Review opening requirements for the units not yet open.';
  if (c.preparation) return 'Prepare the vacant units before looking at another expansion.';
  if (c.other) return 'Review the listed units\' status before committing more cash.';
  if (c.reserved) return 'Wait for pending move-ins, then review the remaining vacancies.';
  if (c.ready) {
    if (daysObserved < 14) return 'Observe leasing inquiries and review new-tenant rents before investing again.';
    if (products.some(p => p.losses > 0)) return 'Review matching unmet requests and new-tenant rents; requests do not guarantee leases.';
    return 'Wait and observe demand before expanding; no recorded unmet requests does not mean no demand.';
  }
  return 'Review the property Statement before making another investment.';
}

// Post-investment check-in: computed only from the selected property's live state.
// Completed rental-unit orders retain object.order even after their order record is pruned.
// Recent availability losses are observations, NOT all customer demand or caused leases.
export function investmentCheckin(sim) {
  const units = Object.values(sim.s.objects).filter(u => u.type === 'unit' && Number.isInteger(u.order));
  const byOrder = new Map();
  for (const u of units) {
    if (!byOrder.has(u.order)) byOrder.set(u.order, []);
    byOrder.get(u.order).push(u);
  }
  // Newest finished order with at least one operating unit; units of it that never opened are counted, not hidden.
  const groups = [...byOrder].filter(([id, members]) => members.some(u => u.cstate === 'operating') &&
    !sim.s.orders.some(o => o.id === id && o.st === 'construction'));
  if (!groups.length) return null;
  const [order, all] = groups.sort((a, b) => b[0] - a[0])[0];
  const members = all.filter(u => u.cstate === 'operating');
  const products = new Map();
  for (const u of members) {
    const key = `${u.size}|${u.env}`;
    if (!products.has(key)) products.set(key, { size: u.size, env: u.env, total: 0, leased: 0, rent: 0, losses: 0 });
    const p = products.get(key); p.total++;
    const lease = u.lease && sim.s.leases[u.lease];
    if (lease && lease.unit === u.id) { p.leased++; p.rent += lease.rent; }
  }
  const firstDay = Math.max(1, sim.s.finance.observedFrom, sim.day - 29);
  const lastDay = sim.day;
  for (const lost of sim.s.mkt.lostLog) {
    if (lost.d < firstDay || lost.d > lastDay || !['noSize', 'noReady', 'noClimate'].includes(lost.r)) continue;
    const key = `${lost.sz}|${lost.climate || lost.r === 'noClimate' ? 'climate' : 'std'}`;
    if (products.has(key)) products.get(key).losses++;
  }
  const rows = [...products.values()].sort((a, b) => a.size.localeCompare(b.size) || a.env.localeCompare(b.env));
  const [unit] = all;
  const footprint = sim.s.orders.find(o => o.id === order)?.cells?.length;
  // Use the original footprint when the order still exists so a partly removed row doesn't qualify.
  const singleDrive = all.length === 1 && unit.access === 'drive' && unit.env === 'std' &&
    Number.isInteger(unit.num) && (!footprint || footprint === unit.w * unit.h);
  const condition = groupCondition(sim, all);
  const daysObserved = Math.min(30, Math.max(0, sim.day - sim.s.finance.observedFrom));
  return { order, total: members.length, notOpen: all.length - members.length, leased: rows.reduce((n, p) => n + p.leased, 0),
    rent: rows.reduce((n, p) => n + p.rent, 0), products: rows,
    period: { from: firstDay, through: lastDay },
    daysObserved, condition, nextAction: checkinNextAction(condition, rows, daysObserved),
    results: unitBuildRecord(sim, order),
    unitStatus: singleDrive ? { number: unit.num, text: driveUpStatus(sim, unit) } : null };
}

// PI-01C: two recorded observations for the group. Gross receipts only; never netted against cost.
function resultsHtml(R) {
  if (!R) return '<p><b>Recorded results:</b> construction cost and collected rent are not on record for this group.</p>';
  const removed = R.removed ? ` Both figures include ${R.removed} unit${R.removed === 1 ? '' : 's'} since removed.` : '';
  const credit = R.credit ? ` A ${dollars(R.credit)} Company Goal credit was booked separately.` : '';
  return `<p><b>Recorded results:</b> construction cost ${dollars(R.cost)} · rent collected from these units ${dollars(R.rent)} since Day ${R.day}.${removed}${credit}</p>`;
}

export function investmentCheckinHtml(sim) {
  const C = investmentCheckin(sim);
  if (!C) return '';
  const label = p => `${p.size} ${p.env === 'climate' ? 'climate' : 'standard'}`;
  const rows = C.products.map(p => `<div class="item"><div class="grow"><b>${label(p)} · ${p.leased}/${p.total} leased</b><small>${dollars(p.rent)}/mo signed-lease rent · ${p.losses} matching unmet request${p.losses === 1 ? '' : 's'} recorded (Days ${C.period.from}–${C.period.through})</small></div></div>`).join('');
  const closed = C.notOpen ? ` ${C.notOpen} more unit${C.notOpen === 1 ? '' : 's'} from this build ${C.notOpen === 1 ? 'is' : 'are'} not open yet.` : '';
  const unitStatus = C.unitStatus ? `<p><b>Unit ${C.unitStatus.number}</b> · ${C.unitStatus.text}</p>` : '';
  const results = resultsHtml(C.results);
  return `<h3>Investment Check-in</h3><div class="note invest-progress"><p><b>Latest completed rental-unit group:</b> ${C.leased} of ${C.total} operating units leased · ${dollars(C.rent)}/mo contracted rent.${closed}</p>${results}${unitStatus}<p><b>Current condition:</b> ${C.condition.description}.</p><p><b>Next:</b> ${C.nextAction}</p></div><div class="list">${rows}</div><p class="note">Recent recorded unmet requests are not total demand; zero recorded losses does not prove zero demand. Contracted monthly rent is not cash collected or profit.${C.results ? ' Collected rent is gross cash received, not profit or return on investment, and excludes late fees, auction proceeds, loans and goal rewards.' : ''}${C.daysObserved < 14 ? ' Demand observation history is limited.' : ''}</p>`;
}
