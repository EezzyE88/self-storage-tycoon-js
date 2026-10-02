// Climate Boom builder: lays out a climate building and plays the scenario (Round 13 winnability check).
import { makeScenario } from '../../js/scenarios.js';
const sim = makeScenario('climate'); const s = sim.s; const y1 = s.parcel.y1;
console.log('parcel', JSON.stringify(s.parcel));
const B = (a, quiet) => { const r = sim.dispatch({ type: 'build', f: 0, ...a }); if (!quiet || !r.ok) console.log(a.tool, JSON.stringify(a.a), r.ok ? 'ok' : 'FAIL ' + r.msg); return r; };
const plan = JSON.parse(process.env.PLAN || 'null') || [
  { tool: 'aisle', a: { x: 21, y: 15 }, b: { x: 37, y: 17 } },
  { tool: 'walk', a: { x: 22, y: 13 }, b: { x: 37, y: 14 } },
  { tool: 'loading', a: { x: 23, y: 15 }, b: { x: 34, y: 15 } },
  { tool: 'shell1', a: { x: 22, y: 4 }, b: { x: 36, y: 12 } },
  { tool: 'hall', a: { x: 25, y: 5 }, b: { x: 25, y: 12 } },
  { tool: 'hall', a: { x: 31, y: 5 }, b: { x: 31, y: 12 } },
  { tool: 'doorWide', a: { x: 25, y: 12 }, b: { x: 25, y: 12 } },
  { tool: 'doorWide', a: { x: 31, y: 12 }, b: { x: 31, y: 12 } },
  { tool: 'light', a: { x: 25, y: 8 }, b: { x: 25, y: 8 } },
  { tool: 'light', a: { x: 31, y: 8 }, b: { x: 31, y: 8 } },
  { tool: 'hvac', a: { x: 21, y: 6 }, b: { x: 21, y: 6 } },
  { tool: 'hvac', a: { x: 37, y: 6 }, b: { x: 37, y: 6 } },
  { tool: 'iu5x5', a: { x: 24, y: 5 }, b: { x: 24, y: 11 }, climate: true },
  { tool: 'iu5x5', a: { x: 26, y: 5 }, b: { x: 26, y: 11 }, climate: true },
  { tool: 'iu5x5', a: { x: 30, y: 5 }, b: { x: 30, y: 11 }, climate: true },
  { tool: 'iu5x5', a: { x: 32, y: 5 }, b: { x: 32, y: 11 }, climate: true },
  { tool: 'corral', a: { x: 28, y: 13 }, b: { x: 28, y: 13 } },
  { tool: 'light', a: { x: 29, y: 16 }, b: { x: 29, y: 16 } },
];
for (const a of plan) B(a);
console.log('cash after orders', Math.round(s.cash));
const fixer = () => { for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor)) { const r = sim.dispatch({ type: 'ownerTask', task: t.id }); if (!r.ok) sim.dispatch({ type: 'callVendor', task: t.id }); } if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 }); };
let opened = false;
for (let i = 0; i < 260 * 1440 && s.scenario.status === 'active'; i++) {
  if (i % 30 === 0) fixer();
  if (i % 720 === 0) { for (const u of sim.objs('unit')) if (u.cstate === 'ready') sim.dispatch({ type: 'commission', unit: u.id }); if (!s.open) { const r = sim.dispatch({ type: 'open' }); if (r.ok && !opened) { opened = true; console.log('opened day', sim.day); } else if (!r.ok && i % (1440 * 10) === 0) console.log('open?', r.msg); } }
  if (i % (1440 * 30) === 0 && i > 0) { const g = sim.metric('climateLeased'); console.log('day', sim.day, 'climateLeased', g, 'score', sim.metric('climateScore').toFixed(2), 'cash', Math.round(s.cash), 'comps', s.mkt.comp.map((c) => c.name + '@' + c.opens).join(',')); }
  sim.step(); sim.events.length = 0;
}
console.log('RESULT', s.scenario.status, 'day', s.scenario.endDay, s.scenario.why || '', 'climateLeased', sim.metric('climateLeased'), 'units', sim.objs('unit').length);
