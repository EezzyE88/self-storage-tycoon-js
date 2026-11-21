// Scenario R2.0 player-facing foundation (Scenario Revision 2.2 baseline):
// - a short starting business briefing for each scenario,
// - a compact "Coming up" list read from existing state (nothing new is scheduled),
// - the 7-day confirmation for timed scenario goals (rule applied in Sim.scenarioCheck).
// Read-only helpers: no RNG, no state writes. Saved scenario state stays numeric (briefed, hold), so the
// load sanitizer (main.js sanitizeSave) cannot change it; every sentence is generated at render time.

export const HOLD_DAYS = 7;
const money = (v) => (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString();

// Static situation and pressure lines. The numbers line is built from the live start state.
export const BRIEFS = {
  comeback: { situation: 'Six drive-up spaces at Maple Street need make-ready before anyone can rent them.',
    pressure: 'Your own hours cost nothing but run out each day; a Porter shares the work for a daily wage. First: open Review work.' },
  turnaround: { situation: 'You bought a run-down Maple Street. Office and parking face the street; storage is behind the gate.',
    pressure: '11 units need make-ready, lights and the gate are worn, and 3 accounts are behind. Full at market rent falls short: fit out the dark west corridor or reprice. Start make-ready in Operate.' },
  vertical: { situation: 'A tight urban lot with strong demand for small units. The gate, aisle and office are in.',
    pressure: 'The only way to grow is up: upper floors need elevators, stairs and power. First: plan a building in Build.' },
  climate: { situation: 'A new crowd is moving into town, and two in three shoppers want climate control.',
    pressure: 'Climate units only stay cool with enough HVAC and power behind them. First: plan a climate building in Build.' },
};

// True only for a run started under R2.0 that has not been briefed yet. Older saves have no `briefed`
// field and never show it.
export function needsBriefing(s) { const sc = s.scenario; return !!sc && sc.briefed === 0 && sc.status === 'active'; }

export function briefing(sim) {
  const s = sim.s, B = BRIEFS[s.scenario?.id]; if (!B) return [];
  const oc = sim.occupancy(), roll = sim.rentRoll();
  const have = oc.n ? `${money(s.cash)} cash · ${oc.occ}/${oc.n} units leased · rent roll ${money(roll)}/mo` : `${money(s.cash)} cash · no storage units built yet`;
  return [B.situation, have, B.pressure];
}

// Nearest dated items, soonest first. Each item is { day, text }.
export function comingUp(sim, max = 2) {
  const s = sim.s, sc = s.scenario, today = sim.day, out = [];
  if (!sc || sc.status !== 'active') return out;
  const add = (day, text, rank) => { if (Number.isFinite(day) && day >= today) out.push({ day, text, rank }); };
  if (sc.fail && sc.fail.cashDays && sc.badDays > 0) add(today + sc.fail.cashDays - sc.badDays, `Run ends if net liquid stays under ${money(sc.fail.cashBelow)}`, 0);
  if (sc.deadline && sc.deadline - today <= 14) add(sc.deadline, 'Scenario deadline', 1);
  const inc = {}, unitNum = (L) => { const u = s.objects[L.unit]; return u ? (u.num ?? u.name) : '?'; };
  for (const L of Object.values(s.leases)) {
    const N = L.rentNotice;
    if (N && L.status === 'current' && N.effectiveDay >= today) inc[N.effectiveDay] = (inc[N.effectiveDay] || 0) + (N.rent - N.previousRent);
    if (L.status === 'notice' && L.noticeUntil != null) add(L.noticeUntil, `Lien notice ends · Unit ${unitNum(L)}`, 2);
    if (L.status === 'auction' && L.auctionDay != null) add(L.auctionDay, `Lien auction · Unit ${unitNum(L)}`, 2);
  }
  for (const [d, v] of Object.entries(inc)) if (v > 0) add(+d, `Rent increases +${money(v)}/mo take effect`, 3);
  const st = sim.scheduledOutlook().settlements[0];
  if (st && st.amount > 0) add(st.day, `Weekly bills about ${money(st.amount)} settle`, 4);
  out.sort((a, b) => a.day - b.day || a.rank - b.rank);
  return out.slice(0, max).map(({ day, text }) => ({ day, text }));
}
export const dayLabel = (sim, d) => (d === sim.day ? 'Today' : `Day ${d}`);

// "Holding 3/7 days" while every goal is met but not yet confirmed.
export function holdLine(sc) { return sc && sc.status === 'active' && sc.hold > 0 && sc.hold < HOLD_DAYS ? `Holding ${sc.hold}/${HOLD_DAYS} days` : ''; }
