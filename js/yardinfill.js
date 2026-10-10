// Optional Comeback infill proposal. Read existing state; never dispatch or store goals.
import { isComeback } from './comeback.js';

export function yardInfill(sim) {
  const s = sim.s, c = s.scenario;
  if (!isComeback(s) || c.status !== 'won' || !c.acknowledged || s.lesson || s.tut?.on) return null;
  // This prototype belongs to the authored yard, not arbitrary imported layouts.
  if (!c.targets?.some(t => t.x === 8 && t.y === 4 && t.w === 2 && t.h === 2 && t.f === 0)) return null;
  sim.ensure();
  const units = sim.objs('unit');
  const added = units.filter(u => (u.f || 0) === 0 && u.x >= 10 && u.x + u.w <= 12 && u.y === 2 && u.h === 2 && u.access === 'drive' && u.size === '5x10' && u.env === 'std' && u.dir?.[0] === 0 && u.dir?.[1] === 1);
  const one = [10, 11].map(x => ({ key: `one-${x}`, args: { tool: 'du5x10', a: { x, y: 3 }, b: { x, y: 3 }, axis: 'x', f: 0 } }));
  const quote = ({ key, args }) => {
    const plan = sim.plan(args);
    // A fully valid connected placement only. Never recommend paving over changes.
    if (plan.status !== 'valid' || plan.warn?.length || plan.missing?.length || !plan.creates.length || plan.creates.some(u => u.y !== 2 || u.h !== 2 || u.dir?.[1] !== 1)) return null;
    const readiness = sim.growthReadiness(plan), investment = readiness.investment;
    return { key, args, plan, readiness, position: investment.position, count: plan.count, affordable: sim.unlimited() || s.cash >= plan.cost };
  };
  const choices = [];
  const first = one.map(quote).find(Boolean);
  if (first) choices.push(first);
  const two = quote({ key: 'two', args: { tool: 'du5x10', a: { x: 10, y: 3 }, b: { x: 11, y: 3 }, axis: 'x', f: 0 } });
  if (two) choices.push(two);
  const ready = added.filter(u => u.cstate === 'operating' && u.commercial === 'ready' && !u.blocked && !u.lease).length;
  const occupied = added.filter(u => u.cstate === 'operating' && u.commercial === 'occupied' && !!u.lease).length;
  const reserved = added.filter(u => u.cstate === 'operating' && u.commercial === 'reserved' && !!u.lease).length;
  return { choices, added: added.length, ready, occupied, reserved,
    constructing: added.filter(u => u.cstate === 'construction').length,
    commissionable: added.filter(u => u.cstate === 'ready').length,
    blocked: added.filter(u => u.cstate === 'operating' && u.blocked).length };
}
