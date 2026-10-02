// Go Vertical builder: a two-floor building with an elevator, plays the scenario (Round 13 winnability check).
import { makeScenario } from '../../js/scenarios.js';
const sim = makeScenario('vertical'); const s = sim.s; const y1 = s.parcel.y1;
console.log('parcel', JSON.stringify(s.parcel));
const B = (a, quiet) => { const r = sim.dispatch({ type: 'build', f: 0, ...a }); if (!quiet || !r.ok) console.log(a.tool, JSON.stringify(a.a), r.ok ? 'ok' : 'FAIL ' + r.msg); return r; };
const plan = JSON.parse(process.env.PLAN || 'null') || [
  { tool: 'aisle', a: { x: 8, y: 13 }, b: { x: 30, y: 14 } },
  { tool: 'walk', a: { x: 8, y: 12 }, b: { x: 30, y: 12 } },
  { tool: 'shell2', a: { x: 8, y: 3 }, b: { x: 30, y: 11 } },
  { tool: 'hall', a: { x: 11, y: 4 }, b: { x: 11, y: 10 }, f: 0 },
  { tool: 'hall', a: { x: 17, y: 4 }, b: { x: 17, y: 10 }, f: 0 },
  { tool: 'hall', a: { x: 23, y: 4 }, b: { x: 23, y: 10 }, f: 0 },
  { tool: 'hall', a: { x: 29, y: 4 }, b: { x: 29, y: 10 }, f: 0 },
  { tool: 'hall', a: { x: 9, y: 11 }, b: { x: 29, y: 11 }, f: 0 },
  { tool: 'hall', a: { x: 11, y: 4 }, b: { x: 11, y: 10 }, f: 1 },
  { tool: 'hall', a: { x: 17, y: 4 }, b: { x: 17, y: 10 }, f: 1 },
  { tool: 'hall', a: { x: 23, y: 4 }, b: { x: 23, y: 10 }, f: 1 },
  { tool: 'hall', a: { x: 29, y: 4 }, b: { x: 29, y: 10 }, f: 1 },
  { tool: 'hall', a: { x: 9, y: 11 }, b: { x: 29, y: 11 }, f: 1 },
  { tool: 'elevator', a: { x: 14, y: 10 }, b: { x: 14, y: 10 } },
  { tool: 'stairs', a: { x: 20, y: 10 }, b: { x: 20, y: 10 } },
  { tool: 'doorWide', a: { x: 17, y: 11 }, b: { x: 17, y: 11 } },
  { tool: 'light', a: { x: 11, y: 6 }, b: { x: 11, y: 6 }, f: 0 },
  { tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 0 },
  { tool: 'light', a: { x: 23, y: 6 }, b: { x: 23, y: 6 }, f: 0 },
  { tool: 'light', a: { x: 29, y: 6 }, b: { x: 29, y: 6 }, f: 0 },
  { tool: 'light', a: { x: 13, y: 11 }, b: { x: 13, y: 11 }, f: 0 },
  { tool: 'light', a: { x: 20, y: 11 }, b: { x: 20, y: 11 }, f: 0 },
  { tool: 'light', a: { x: 26, y: 11 }, b: { x: 26, y: 11 }, f: 0 },
  { tool: 'light', a: { x: 11, y: 9 }, b: { x: 11, y: 9 }, f: 0 },
  { tool: 'light', a: { x: 17, y: 9 }, b: { x: 17, y: 9 }, f: 0 },
  { tool: 'light', a: { x: 23, y: 9 }, b: { x: 23, y: 9 }, f: 0 },
  { tool: 'light', a: { x: 29, y: 9 }, b: { x: 29, y: 9 }, f: 0 },
  { tool: 'light', a: { x: 11, y: 6 }, b: { x: 11, y: 6 }, f: 1 },
  { tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 1 },
  { tool: 'light', a: { x: 23, y: 6 }, b: { x: 23, y: 6 }, f: 1 },
  { tool: 'light', a: { x: 29, y: 6 }, b: { x: 29, y: 6 }, f: 1 },
  { tool: 'light', a: { x: 13, y: 11 }, b: { x: 13, y: 11 }, f: 1 },
  { tool: 'light', a: { x: 20, y: 11 }, b: { x: 20, y: 11 }, f: 1 },
  { tool: 'light', a: { x: 26, y: 11 }, b: { x: 26, y: 11 }, f: 1 },
  { tool: 'light', a: { x: 11, y: 9 }, b: { x: 11, y: 9 }, f: 1 },
  { tool: 'light', a: { x: 17, y: 9 }, b: { x: 17, y: 9 }, f: 1 },
  { tool: 'light', a: { x: 23, y: 9 }, b: { x: 23, y: 9 }, f: 1 },
  { tool: 'light', a: { x: 29, y: 9 }, b: { x: 29, y: 9 }, f: 1 },
  { tool: 'iu5x5', a: { x: 10, y: 4 }, b: { x: 10, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 12, y: 4 }, b: { x: 12, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 16, y: 4 }, b: { x: 16, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 18, y: 4 }, b: { x: 18, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 22, y: 4 }, b: { x: 22, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 24, y: 4 }, b: { x: 24, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 28, y: 4 }, b: { x: 28, y: 10 }, f: 1 },
  { tool: 'iu5x5', a: { x: 10, y: 4 }, b: { x: 10, y: 10 }, f: 0 },
  { tool: 'iu5x5', a: { x: 12, y: 4 }, b: { x: 12, y: 10 }, f: 0 },
  { tool: 'iu5x5', a: { x: 16, y: 4 }, b: { x: 16, y: 10 }, f: 0 },
  { tool: 'iu5x5', a: { x: 18, y: 4 }, b: { x: 18, y: 10 }, f: 0 },
  { tool: 'iu5x5', a: { x: 22, y: 4 }, b: { x: 22, y: 10 }, f: 0 },
  { tool: 'iu5x5', a: { x: 24, y: 4 }, b: { x: 24, y: 10 }, f: 0 },
  { tool: 'iu5x5', a: { x: 28, y: 4 }, b: { x: 28, y: 10 }, f: 0 },
  { tool: 'corral', a: { x: 16, y: 12 }, b: { x: 16, y: 12 } },
  { tool: 'power', a: { x: 32, y: 6 }, b: { x: 32, y: 6 } },
];
// 2026-10-02: the all-5x5 plan stopped winning after Round 14 (rival price wars). Demand is mostly 5x10, so upstairs now builds 5x10
// (env ALL5X5=1 restores the old plan). A 5x5 ground floor + 5x10 upper floor wins on day 127.
if (!process.env.PLAN && !process.env.ALL5X5) for (const a of plan) if (a.tool === 'iu5x5' && a.f) a.tool = 'iu5x10';
for (const a of plan) { if (process.env.UPPERONLY && a.tool.startsWith('iu') && !a.f) continue; B(a); }
if (process.env.NOCOMP) s.opts = { ...(s.opts || {}), competition: false };
console.log('cash after orders', Math.round(s.cash));
const fixer = () => { for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor)) { const r = sim.dispatch({ type: 'ownerTask', task: t.id }); if (!r.ok) sim.dispatch({ type: 'callVendor', task: t.id }); } if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 }); };
let opened = false;
for (let i = 0; i < 310 * 1440 && s.scenario.status === 'active'; i++) {
  if (i % 30 === 0) fixer();
  if (i % 720 === 0) { for (const u of sim.objs('unit')) if (u.cstate === 'ready') sim.dispatch({ type: 'commission', unit: u.id }); if (!s.open) { const r = sim.dispatch({ type: 'open' }); if (r.ok && !opened) { opened = true; console.log('opened day', sim.day); } else if (!r.ok && i % (1440 * 10) === 0) console.log('open?', r.msg); } }
  if (i % (1440 * 30) === 0 && i > 0) { console.log('day', sim.day, 'upper', sim.metric('upperLeased'), 'wait', sim.metric('elevWait').toFixed(1), 'contrib', sim.metric('contrib30'), 'cash', Math.round(s.cash), 'comps', s.mkt.comp.map((c) => c.name + '@' + c.opens).join(',')); }
  sim.step(); sim.events.length = 0;
}
console.log('RESULT', s.scenario.status, 'day', s.scenario.endDay, s.scenario.why || '', 'upper', sim.metric('upperLeased'), 'units', sim.objs('unit').length);
