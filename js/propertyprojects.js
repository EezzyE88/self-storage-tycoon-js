// Two authored Comeback projects. Metadata only: ordinary commands own money, work and leases.
import { isComeback, unitInService } from './comeback.js';
import { rollingShopperPeriod } from './reporting.js';
export const PROJECTS = {
  small: { kind: 'extension', label: 'Two 5×10s', count: 2, bounds: { x: 10, y: 2, w: 2, h: 2 }, args: { tool: 'du5x10', a: { x: 10, y: 3 }, b: { x: 11, y: 3 }, axis: 'x', f: 0 } },
  large: { kind: 'extension', label: 'One 10×10', count: 1, bounds: { x: 10, y: 2, w: 2, h: 2 }, args: { tool: 'du10x10', a: { x: 10, y: 3 }, b: { x: 10, y: 3 }, axis: 'x', f: 0 } },
  cover: { kind: 'loading', label: 'Covered loading', count: 1, bounds: { x: 18, y: 13, w: 4, h: 3 }, args: { tool: 'canopy', a: { x: 18, y: 13 }, b: { x: 21, y: 15 }, f: 0 } },
};
const integer = n => Number.isInteger(n) && n >= 0;
export function normalizeProjects(s) {
  if (s.propertyProjects == null) return; // Legacy saves acquire no invented history.
  const valid = p => {
    const d = p && Object.hasOwn(PROJECTS, p.key) && PROJECTS[p.key];
    return d && integer(p.order) && integer(p.started) && p.started <= s.t && Number.isFinite(p.cost) && p.cost >= 0 &&
      Array.isArray(p.ids) && p.ids.length === d.count && p.ids.every(integer) && new Set(p.ids).size === p.ids.length &&
      (p.completed == null || integer(p.completed) && p.completed >= p.started && p.completed <= s.t) &&
      (p.firstLease == null || d.kind === 'extension' && integer(p.firstLease.t) && p.firstLease.t >= p.started && p.firstLease.t <= s.t && p.ids.includes(p.firstLease.unit) && Number.isFinite(p.firstLease.rent) && p.firstLease.rent >= 0);
  };
  const clean = p => ({ key: p.key, order: p.order, started: p.started, cost: p.cost, ids: [...p.ids], completed: p.completed ?? null, firstLease: p.firstLease ? { ...p.firstLease } : null });
  const r = s.propertyProjects;
  if (!r || r.v !== 1 || !Array.isArray(r.history)) { delete s.propertyProjects; return; }
  const history = r.history.filter(p => valid(p) && p.completed != null).slice(-2);
  if (new Set(history.map(p => PROJECTS[p.key].kind)).size !== history.length || r.active != null && (!valid(r.active) || r.active.completed != null || history.some(p => PROJECTS[p.key].kind === PROJECTS[r.active.key].kind))) { delete s.propertyProjects; return; }
  s.propertyProjects = { v: 1, active: r.active ? clean(r.active) : null, history: history.map(clean) };
}
export function authoredYard(sim) {
  const s = sim.s, c = s.scenario;
  return isComeback(s) && c.status === 'won' && c.acknowledged && !s.lesson && !s.tut?.on &&
    c.targets?.some(t => t.x === 8 && t.y === 4 && t.w === 2 && t.h === 2 && t.f === 0);
}
const inside = (o, b) => o && (o.f || 0) === 0 && o.x >= b.x && o.y >= b.y && o.x + o.w <= b.x + b.w && o.y + o.h <= b.y + b.h;
export function projectStatus(sim, p = sim.s.propertyProjects?.active) {
  if (!p) return null;
  const d = PROJECTS[p.key], objects = p.ids.map(id => sim.s.objects[id]);
  const intact = objects.every(o => inside(o, d.bounds) && o.order === p.order && (d.kind === 'loading' ? o.type === 'canopy' : o.type === 'unit' && o.access === 'drive' && o.env === 'std' && o.size === (p.key === 'small' ? '5x10' : '10x10')));
  const building = objects.filter(o => o?.cstate === 'construction').length;
  const commissionable = objects.filter(o => o?.cstate === 'ready').length;
  const service = intact ? objects.filter(o => d.kind === 'loading' ? o.cstate === 'operating' : unitInService(sim.s, o)).length : 0;
  const leased = intact && d.kind === 'extension' ? objects.filter(o => unitInService(sim.s, o) && !!o.lease).length : 0;
  return { label: d.label, bounds: d.bounds, intact, building, commissionable, service, leased, total: d.count, text: !intact ? 'Targets changed — project tracking stopped' : building ? `Building · ${service}/${d.count} in service` : commissionable ? `Ready to commission · ${commissionable}/${d.count}` : service === d.count ? 'In service' : 'Access or readiness needs attention' };
}
export function projectOffers(sim) {
  if (!authoredYard(sim) || sim.s.propertyProjects?.active) return [];
  sim.ensure();
  const b = PROJECTS.small.bounds;
  const old = sim.objs('unit').filter(o => o.x < b.x + b.w && o.x + o.w > b.x && o.y < b.y + b.h && o.y + o.h > b.y && (o.f || 0) === 0);
  const covered = new Set(old.flatMap(o => Array.from({length:o.w*o.h}, (_,i) => `${o.x+i%o.w},${o.y+Math.floor(i/o.w)}`)));
  const extensionDone = sim.s.propertyProjects?.history.some(p => PROJECTS[p.key].kind === 'extension') || covered.has('10,2') && covered.has('11,2') && covered.has('10,3') && covered.has('11,3') && old.every(o => unitInService(sim.s, o));
  const loadingDone = sim.s.propertyProjects?.history.some(p => p.key === 'cover');
  const keys = extensionDone ? loadingDone ? [] : ['cover'] : ['small', 'large'];
  return keys.flatMap(key => {
    const d = PROJECTS[key], plan = sim.plan(d.args);
    if (plan.status !== 'valid' || plan.warn?.length || plan.missing?.length || plan.creates.length !== d.count) return [];
    const daily = sim.planDailyCost(plan), position = sim.financialPosition({ spend: plan.cost, extraDaily: daily });
    const period = rollingShopperPeriod(sim.day), size = key === 'small' ? '5x10' : '10x10';
    const losses = key === 'cover' ? null : sim.s.mkt.lostLog.filter(x => x.d >= period.start && x.d <= period.end && x.sz === size && !x.climate && ['noSize', 'noReady'].includes(x.r)).length;
    const vacancies = key === 'cover' ? null : sim.objs('unit').filter(u => u.size === size && u.env === 'std' && u.commercial === 'ready' && unitInService(sim.s,u)).length;
    return [{ key, ...d, plan, daily, position, losses, vacancies, investment: d.kind === 'extension' ? sim.investment(plan) : null }];
  });
}
export function matchesProject(a, key) {
  const d = Object.hasOwn(PROJECTS, key) && PROJECTS[key]; if (!d) return false;
  return a.tool === d.args.tool && (a.f || 0) === 0 && !a.flip && !a.climate &&
    ['a','b'].every(k => a[k]?.x === d.args[k].x && a[k]?.y === d.args[k].y) && (d.args.axis == null || a.axis === d.args.axis);
}
export function startProject(sim, key, order) {
  const r = sim.s.propertyProjects ||= { v: 1, active: null, history: [] };
  r.active = { key, order: order.id, ids: [...order.objs], started: sim.s.t, cost: order.cost, completed: null, firstLease: null };
}
export function reconcileProject(sim) {
  const r = sim.s.propertyProjects, p = r?.active; if (!p) return;
  const st = projectStatus(sim,p);
  if (!st.intact) { r.active = null; sim.emit('project_stopped', { label: st.label }); return; }
  if (st.service !== st.total) return;
  p.completed = sim.s.t; r.history = [...r.history.filter(h => PROJECTS[h.key].kind !== PROJECTS[p.key].kind), p].slice(-2); r.active = null;
  sim.emit('project_complete', { key: p.key, label: st.label, bounds: st.bounds });
}
export function projectLease(sim, unit, rent) {
  const r = sim.s.propertyProjects; if (!r) return;
  const p = [r.active, ...r.history].find(p => p && PROJECTS[p.key].kind === 'extension' && p.ids.includes(unit));
  if (!p || p.firstLease) return;
  p.firstLease = { unit, rent, t: sim.s.t };
  sim.emit('project_first_lease', { label: PROJECTS[p.key].label, unit, rent });
}
