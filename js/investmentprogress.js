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
