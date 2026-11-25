// PI-01C Actual Investment Results: compact observational records for rental-unit build orders.
// Simulation logic never reads these records. They are written only beside existing financial events
// (the construction charge, a cancellation, a Company Goal construction credit, a rent receipt or a
// returned rent payment) and never change cash, the ledger, RNG or any other state.
//
// s.unitBuilds[orderId] = { d: commit day, c: construction cost charged, r: net rent collected,
//   x?: units of the order removed later, g?: Company Goal construction credit booked separately }
// Orders committed before this record existed, and creative/scenario layouts that charge nothing,
// have no record: the Check-in says so instead of reconstructing history.
const KEEP = 24; // the Check-in only reads the newest completed group; older records are pruned
const cents = (v) => Math.round(v * 100) / 100;

export function recordUnitBuild(sim, ord, createsUnits) {
  const s = sim.s;
  if (s.creative || !createsUnits || !Number.isInteger(ord.id)) return;
  const book = (s.unitBuilds ||= {});
  book[ord.id] = { d: sim.day, c: cents(ord.cost), r: 0 };
  const ids = Object.keys(book).map(Number).sort((a, b) => b - a);
  for (const id of ids.slice(KEEP)) delete book[id];
}

// A cancelled order never becomes a completed group; its charge and refund stay in the ledger only.
export function dropUnitBuild(sim, ord) {
  const book = sim.s.unitBuilds;
  if (book && ord && book[ord.id]) delete book[ord.id];
}

// Every rent-category receipt or reversal for a unit (first month, recurring bill, overdue payment,
// payment-plan instalment, returned payment). Late fees and auction proceeds are not rent and never arrive here.
export function noteUnitRent(sim, unit, amt) {
  const rec = unit && sim.s.unitBuilds?.[unit.order];
  if (!rec || !Number.isFinite(amt) || !amt) return;
  rec.r = cents(rec.r + amt);
}

// Called with the ids about to be removed, before the removal mutates state.
export function noteUnitsRemoved(sim, ids) {
  const s = sim.s, book = s.unitBuilds; if (!book) return;
  for (const id of ids) {
    const o = s.objects[id], rec = o?.type === 'unit' && book[o.order];
    if (rec) rec.x = (rec.x || 0) + 1;
  }
}

// The Company Goal construction credit is a separate non-operating inflow; record what was booked, never net it.
export function noteBuildCredit(sim, ord, before) {
  const rec = sim.s.unitBuilds?.[ord.id];
  const used = cents(before - (sim.s.companyGoalCredits?.construction || 0));
  if (rec && used > 0) rec.g = cents((rec.g || 0) + used);
}

export function unitBuildRecord(sim, order) {
  const rec = sim.s.unitBuilds?.[order];
  if (!rec || !Number.isFinite(rec.c) || !Number.isFinite(rec.r) || !Number.isInteger(rec.d)) return null; // never show a damaged record
  return { day: rec.d, cost: rec.c, rent: rec.r, removed: rec.x || 0, credit: rec.g || 0 };
}
