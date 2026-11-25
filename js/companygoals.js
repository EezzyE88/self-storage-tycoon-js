const RUNGS = [150, 200, 300, 500, 750];
const DEFAULT_PINS = ['leased', 'small-start:0', 'profit:0'];
const REWARDS = {
  'built-150': [{ kind: 'construction', amount: 1000, label: '$1,000 contractor credit' }],
  'leased-150': [
    { kind: 'marketing', amount: 500, label: '$500 marketing credit' },
    { kind: 'service', amount: 650, label: '$650 repair-service credit' },
  ],
  'small-start': [{ kind: 'marketing', amount: 250, label: '$250 marketing credit' }],
  restore: [{ kind: 'service', amount: 250, label: '$250 repair-service credit' }],
};

export function companyGoalsEnabled(company) {
  const root = company?.props[0]?.sim.s;
  return root?.mode === 'tutorial' && root.tut?.done === true && !root.creative && !root.scenario;
}

export function companyGoalLevelOffer(company) {
  const root = company?.props[0]?.sim.s;
  if (!companyGoalsEnabled(company) || company.props.length >= 5 || (root.coTier ?? 1) < 3 || company.props.some(p => p.sim.s.companyGoalPartner)) return null;
  return {
    kind: 'facility', market: 'partner', fac: 'Juniper Storage',
    name: 'Operating facility · Juniper Storage',
    desc: 'Regional operator opportunity. 23 units, mostly leased, with serviced gate and lighting equipment.',
    price: 110000,
  };
}

function operatingResult(sim) {
  const result = sim.opResult(30);
  return result.n === 30 ? result.amt : null;
}

export function companyGoals(company) {
  if (!companyGoalsEnabled(company)) return null;
  const { props, active } = company;
  const sim = props[active].sim, root = props[0].sim.s;
  for (const property of props) property.sim.s.companyGoalTracking = true;
  const state = root.companyGoals ??= { earned: {}, claimed: {}, pins: [...DEFAULT_PINS] };
  const rows = [];
  const add = (id, label, scope, current, target, money = false) => {
    if (current != null && current >= target) state.earned[id] ??= sim.day;
    const earned = state.earned[id] ?? null;
    rows.push({ id, label, scope, current, target, money, earned, rewards: REWARDS[id] || [], claimed: state.claimed[id] ?? null });
  };
  const units = props.flatMap(({sim}) => sim.objs('unit').map(unit => ({unit, s:sim.s})));
  const built = units.filter(({unit}) => unit.companyBuilt && unit.cstate !== 'construction');
  const leased = units.filter(({unit,s}) => unit.cstate === 'operating' && s.leases[unit.lease]?.unit === unit.id);
  const debt = props.reduce((n, {sim}) => n + (sim.s.loan?.bal || 0) + sim.s.debt.reduce((sum, loan) => sum + loan.bal, 0), 0);
  for (const rung of RUNGS) add('built-' + rung, 'Units built', 'Company', built.length, rung);
  for (const rung of RUNGS) add('leased-' + rung, 'Active leases', 'Company', leased.length, rung);
  add('cash', 'Cash on hand', 'Company', props.reduce((n, {sim}) => n + sim.s.cash, 0), 100000, true);
  add('repairs', 'Distinct assets repaired', 'Company', props.reduce((n, {sim}) => n + (sim.s.companyRepaired?.length ?? 0), 0), 10);
  add('built-small', '5×5 units built', 'Company', built.filter(({unit}) => unit.size === '5x5').length, 25);
  add('properties', 'Properties owned', 'Company', props.length, 2);
  add('open-properties', 'Properties open', 'Company', props.filter(({sim}) => sim.s.open).length, 2);
  const profitable = props.filter(({sim}) => sim.s.open && operatingResult(sim) > 0).length;
  add('two-profits', 'Profitable open properties · last 30 days', 'Company', profitable, 2);
  add('regional', 'Regional operator', 'Company', Math.min(root.coTier || 1, 3), 3);
  props.forEach(({sim}, index) => {
    const scope = props[index].name;
    add('profit:' + index, '30-day operating profit', scope, operatingResult(sim), 5000, true);
    const small = leased.filter(({unit,s}) => s === sim.s && unit.size === '5x5').length;
    add('small-start:' + index, 'Fill six 5×5s', scope, small, 6);
    add('small-leases:' + index, 'Active 5×5 leases', scope, small, 20);
    add('restore:' + index, 'Restore access after a breakdown', scope, sim.s.companyRestoredAccess ? 1 : 0, 1);
  });
  for (const row of rows) row.rewards = REWARDS[row.id.split(':')[0]] || [];
  const lookup = key => {
    if (key === 'built' || key === 'leased') {
      const series = rows.filter(row => row.id.startsWith(key + '-'));
      return series.find(row => row.earned == null) || series.at(-1);
    }
    return rows.find(row => row.id === key);
  };
  return { rows, debt, state, pins: state.pins.map(lookup).filter(Boolean), opportunity: companyGoalLevelOffer(company) };
}

export function toggleCompanyGoalPin(company, key) {
  const view = companyGoals(company);
  if (!view || !['built', 'leased'].includes(key) && !view.rows.some(row => row.id === key)) return false;
  const pins = view.state.pins;
  if (pins.includes(key)) view.state.pins = pins.filter(pin => pin !== key);
  else if (pins.length < 3) pins.push(key);
  else return false;
  return true;
}

export function claimCompanyGoal(company, id, kind) {
  const view = companyGoals(company), row = view?.rows.find(row => row.id === id);
  const reward = row?.rewards.find(option => option.kind === kind);
  if (!reward || row.earned == null || row.claimed != null) return false;
  const property = id.includes(':') ? Number(id.split(':')[1]) : company.active;
  const s = company.props[property].sim.s;
  const credits = s.companyGoalCredits ??= {};
  credits[kind] = (credits[kind] || 0) + reward.amount;
  view.state.claimed[id] = { kind, property };
  return true;
}

// Keep the full operating expense in the books. The credit is a separate
// non-operating inflow, so a reward cannot manufacture operating profit.
export function spendCompanyGoalCredit(sim, kind, cost) {
  const credits = sim.s.companyGoalCredits;
  const credit = Math.min(credits?.[kind] || 0, cost);
  if (credit <= 0) return;
  credits[kind] -= credit;
  sim.money(credit, 'goal_reward', 'Company goal · ' + kind + ' credit');
}
