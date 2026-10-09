// Derived career participation. Rescue history and market rules remain untouched.
import { validComeback } from './comeback.js';
import { cents } from './finance.js';
import { TIERS } from './data.js';
export function careerEligibility(s) {
  if (s.creative) return { eligible: false, reason: 'Creative property' };
  if (s.mode === 'tutorial' && !s.tut?.done) return { eligible: false, reason: 'Tutorial unfinished' };
  const c = s.scenario;
  if (c && !(c.id === 'comeback' && c.status === 'won' && c.acknowledged === true && validComeback(s)))
    return { eligible: false, reason: 'Scenario not participating in career' };
  return { eligible: true, reason: '' };
}
export function portfolioCareer(props) {
  const eligible = props.filter(p => careerEligibility(p.sim.s).eligible);
  const roll = cents(eligible.reduce((n,p) => n + p.sim.rentRoll(), 0)), n = eligible.length;
  if (!n) return { eligible, excluded: props, roll, n, cur: null, target: null, qualified: null, next: null };
  let qualified = TIERS[0];
  for (const T of TIERS) if (roll >= T.roll && n >= T.props) qualified = T;
  const earned = Math.max(1, ...eligible.map(p => p.sim.s.coTier || 1));
  const cur = TIERS.find(T => T.n === earned) || TIERS[0];
  const target = TIERS.find(T => T.n === Math.max(cur.n, qualified.n));
  return { eligible, excluded: props.filter(p => !eligible.includes(p)), roll, n, cur, target, qualified, next: TIERS.find(T => T.n === cur.n + 1) || null };
}
