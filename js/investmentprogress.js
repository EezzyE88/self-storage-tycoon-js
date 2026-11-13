// Investment Progress: read-only presentation of player-built rental units and their contracted rent.
// Never saved, never written to sim state. Construction stamps each created object with `order`
// (sim.js commit, vertical.js); authored starting units have none. Only operating units count,
// the same base as HUD occupancy. Contracted monthly rent is not cash collected or profit.
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
  return `<br><br>${P.leased ? '<b>Your investment is starting to work.</b> ' : ''}New units: <b>${P.leased} of ${P.built}</b> leased. Monthly rent from new units: <b>${dollars(P.newRent)}</b>. Total property rent roll: <b>${dollars(P.roll)}/month</b>.`
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
  return `<div class="note invest-progress"><p><b>New units:</b> ${P.leased} of ${P.built} leased · ${dollars(P.newRent)}/mo in contracted rent · property rent roll ${dollars(P.roll)}/mo. Empty new units can lease over time; occupancy dips while they do.</p>`
    + (recent ? '<p>The introductory market boost has ended: fewer shoppers, and normal property taxes, insurance and rising operating costs now apply.</p>' : '')
    + (next ? `<p><b>Career rent roll</b> ${dollars(career.roll)} of ${dollars(next.roll)}/mo for ${next.name}.</p>` : '')
    + `<p>${STATEMENT_POINTER}</p></div>`;
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
  return { order, total: members.length, notOpen: all.length - members.length, leased: rows.reduce((n, p) => n + p.leased, 0),
    rent: rows.reduce((n, p) => n + p.rent, 0), products: rows,
    period: { from: firstDay, through: lastDay },
    daysObserved: Math.min(30, Math.max(0, sim.day - sim.s.finance.observedFrom)) };
}

export function investmentCheckinHtml(sim) {
  const C = investmentCheckin(sim);
  if (!C) return '';
  const label = p => `${p.size} ${p.env === 'climate' ? 'climate' : 'standard'}`;
  const rows = C.products.map(p => `<div class="item"><div class="grow"><b>${label(p)} · ${p.leased}/${p.total} leased</b><small>${dollars(p.rent)}/mo contracted · ${p.losses} matching unmet request${p.losses === 1 ? '' : 's'} recorded (Days ${C.period.from}–${C.period.through})</small></div></div>`).join('');
  const outcome = C.leased === 0 ? 'None of these units currently produces contracted rent.'
    : `${C.leased} of ${C.total} units currently produce contracted rent.`;
  const closed = C.notOpen ? ` ${C.notOpen} more unit${C.notOpen === 1 ? '' : 's'} from this build ${C.notOpen === 1 ? 'is' : 'are'} not open yet.` : '';
  return `<h3>Investment Check-in</h3><div class="note invest-progress"><p><b>Latest completed rental-unit group:</b> ${C.leased} of ${C.total} operating units leased · ${dollars(C.rent)}/mo contracted rent.${closed}</p><p>${outcome} Review matching demand and existing vacancies before building more.</p></div><div class="list">${rows}</div><p class="note">Recent recorded unmet requests are not total demand; zero recorded losses does not prove zero demand. Contracted monthly rent is not cash collected or profit.${C.daysObserved < 14 ? ' Demand observation history is limited.' : ''}</p>`;
}
