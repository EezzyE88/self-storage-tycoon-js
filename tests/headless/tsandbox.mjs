// Sandbox v1: Business vs Free Build, presets, overrides, goals, save/resume.
import { makeSandbox, SB_PRESETS, modeLabel as modeLabelFor } from '../../js/scenarios.js';
import { Sim } from '../../js/sim.js';
let fails = 0; const ok = (c, m, d = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (d ? '  [' + d + ']' : '')); if (!c) fails++; };
const run = (sim, days, each) => { for (let i = 0; i < days * 1440; i++) { sim.step(); sim.events.length = 0; if (each && i % 60 === 0) each(sim, i); } };
// SL-1 (consolidated spec §6): the starter layout puts the gate on row 22, so the office and customer
// Parking sit in the public lot in front of the line. Changed from abaf108 (reason): the old layout built a
// new office inside the gate on the front row, which OFF-8 now refuses (R0: customers stay out of the yard).
const layout = (sim) => { const B = (tool, a, b, x = {}) => sim.dispatch({ type: 'build', tool, a, b: b || a, f: 0, ...x });
  const done = (result) => { const order = sim.s.orders.find(o => o.id === result.order); if (order?.st === 'construction') sim.completeOrder(order); return result; };
  const infrastructure = [B('gate', { x: 21, y: 22 }), B('aisle', { x: 20, y: 29 }, { x: 22, y: 23 }), B('aisle', { x: 20, y: 21 }, { x: 22, y: 8 }), B('aisle', { x: 4, y: 29 }, { x: 19, y: 29 })].map(done);
  infrastructure.push(...[B('parking', { x: 4, y: 29 }, { x: 9, y: 29 }), B('walk', { x: 4, y: 27 }, { x: 8, y: 28 }), B('walk', { x: 9, y: 28 }, { x: 19, y: 28 }), B('walk', { x: 4, y: 22 }, { x: 19, y: 22 })].map(done));
  return [...infrastructure, B('office', { x: 4, y: 23 }, undefined, { rotation: 2 }),
    B('du10x10', { x: 23, y: 9 }, { x: 23, y: 21 }), B('du10x10', { x: 19, y: 9 }, { x: 19, y: 21 }), B('light', { x: 18, y: 12 }), B('light', { x: 23, y: 8 }), B('camera', { x: 18, y: 16 })]; };
const flows = (sim) => sim.s.days.concat([sim.s.today]).reduce((a, d) => a + d.rent + (d.anc || 0) + d.other - d.opex - d.payroll - (d.service || 0) - d.capex - (d.debt || 0) - (d.interest || 0) + (d.fin || 0) + (d.inject || 0), 0);
const dayCount = (sim) => sim.s.days.length + 1;

{ // 1. Business: limited cash, construction costs money and takes time
  const sim = makeSandbox({ kind: 'business', cash: 35000 }); const s = sim.s; const c0 = s.cash;
  const rs = layout(sim); ok(rs.every((r) => r.ok), 'Business: the starter layout is valid on the empty lot', rs.filter((r) => !r.ok).map((r) => r.msg).join('; '));
  ok(s.cash < c0 && s.orders.filter(o=>!['aisle','gate','parking','walk'].includes(o.tool)).every((o) => o.st === 'construction' || o.waitShell), 'Business: building charged cash and is still under construction', `cash ${c0} -> ${Math.round(s.cash)}`);
  const big = sim.dispatch({ type: 'build', tool: 'du10x20', a: { x: 30, y: 4 }, b: { x: 30, y: 28 }, f: 0 });
  const huge = sim.dispatch({ type: 'build', tool: 'shell2', a: { x: 25, y: 3 }, b: { x: 40, y: 28 }, f: 0 });
  ok(!huge.ok && /Not enough cash/.test(huge.msg || '') || !big.ok, 'Business: unaffordable construction is refused with a reason', (huge.msg || '') + ' / ' + (big.msg || ''));
  ok(sim.loanLimit() >= 0 && !s.sb.unlimited && s.sb.log.length === 1 && !s.sb.modified, 'Business: unmodified, one log entry (start)');
}
{ // 2. Free Build: unlimited funds, instant, everything recorded
  const sim = makeSandbox({ kind: 'free' }); const s = sim.s; const c0 = s.cash; let minCash = Infinity;
  layout(sim); ok(s.orders.every((o) => o.st === 'done'), 'Free Build: instant construction completes valid builds at once');
  const extra = [sim.dispatch({ type: 'build', tool: 'aisle', a: { x: 28, y: 21 }, b: { x: 28, y: 4 }, f: 0 }), sim.dispatch({ type: 'build', tool: 'aisle', a: { x: 24, y: 7 }, b: { x: 27, y: 7 }, f: 0 }),
    sim.dispatch({ type: 'build', tool: 'du10x20', a: { x: 29, y: 9 }, b: { x: 29, y: 21 }, f: 0 }), sim.dispatch({ type: 'build', tool: 'du10x20', a: { x: 26, y: 9 }, b: { x: 26, y: 21 }, f: 0 }), sim.dispatch({ type: 'build', tool: 'du10x20', a: { x: 34, y: 4 }, b: { x: 34, y: 21 }, f: 0 }),
    sim.dispatch({ type: 'build', tool: 'du10x20', a: { x: 38, y: 4 }, b: { x: 38, y: 21 }, f: 0 }), sim.dispatch({ type: 'build', tool: 'du10x10', a: { x: 12, y: 4 }, b: { x: 12, y: 20 }, f: 0 })]; // SL-1: kept inside the yard (rows 3..21)
  console.log('  extra builds:', extra.map((r) => r.ok ? 'ok' : r.msg).join(' | '));
  const capex = s.today.capex; minCash = Math.min(minCash, s.cash);
  run(sim, 30, (m) => { minCash = Math.min(minCash, m.s.cash); });
  ok(capex > c0 || s.sb.subsidy > 0, 'Free Build: spending beyond starting cash is allowed', `capex day 1 $${Math.round(capex)}, start $${c0}`);
  ok(minCash >= 0, 'Free Build: cash never goes negative (funds cover the gap)', `min $${Math.round(minCash)}`);
  ok(Math.abs(c0 + flows(sim) + sim.committedBills() - s.cash) < 1, 'Free Build: start cash + operating flows + unpaid commitments = cash (incl. Free Build funds)', `${Math.round(c0 + flows(sim) + sim.committedBills())} vs ${Math.round(s.cash)}`);
  const R = sim.opResult(30); const dsum = s.days.slice(-30).reduce((a, d) => a + d.rent + (d.anc || 0) - d.opex - d.payroll - (d.service || 0) - (d.interest || 0), 0);
  ok(Math.round(dsum) === R.amt && s.sb.subsidy > 0, 'Free Build: operating result excludes construction and Free Build funds', `op $${R.amt}, funds $${s.sb.subsidy}`);
  ok(!s.convos.some((c) => c.key === 'loan') && sim.loanLimit() === 0, 'Free Build: no credit-line or cash-shortage prompts');
}
{ // 3. Add funds, instant toggle, switch to Free Build are recorded
  const sim = makeSandbox({ kind: 'business' }); const s = sim.s; run(sim, 2); const R0 = sim.opResult(30).amt;
  const r = sim.dispatch({ type: 'sbFunds', amt: 25000 }); run(sim, 1);
  ok(r.ok && s.sb.injected === 25000 && s.sb.modified && sim.opResult(30).amt <= R0 + 1, 'Add funds: recorded as sandbox funds, marks save modified, not counted as operating income');
  sim.dispatch({ type: 'sbSet', k: 'instant', v: true }); const b = sim.dispatch({ type: 'build', tool: 'light', a: { x: 10, y: 10 }, b: { x: 10, y: 10 }, f: 0 });
  ok(b.ok && s.orders.at(-1).st === 'done' && s.sb.log.some((e) => /Instant construction turned on/.test(e.msg)), 'Instant construction can be turned on in play and is logged');
  const back = sim.dispatch({ type: 'sbSet', k: 'unlimited', v: false }); const on = sim.dispatch({ type: 'sbSet', k: 'unlimited', v: true });
  ok(!back.ok && on.ok && s.sb.unlimited && sim.dispatch({ type: 'sbFunds', amt: 1000 }).ok === false, 'Switch to Free Build is one-way; adding funds is then not needed');
}
{ // 4. Presets and cost multiplier
  const a = makeSandbox({ kind: 'business', start: 'starter' }), c = makeSandbox({ kind: 'business', start: 'starter', costs: SB_PRESETS.challenging.costs });
  const ra = a.dailyOpex().total, rc = c.dailyOpex().total; ok(Math.abs(rc / ra - 1.25) < 0.01, 'Operating costs setting scales daily operating cost', `${ra.toFixed(2)} vs ${rc.toFixed(2)}`);
  const p = makeSandbox({ kind: 'business', ...SB_PRESETS.relaxed }); ok(p.s.cash === 120000 && p.s.opts.demand === 1.3 && p.s.opts.costs === 0.8 && p.s.opts.wear === 0.5, 'Relaxed preset applies its four values');
}
{ // 5. Maintenance off: nothing new wears; existing damage stays repairable
  const sim = makeSandbox({ kind: 'business', start: 'starter', wear: 0 }); const s = sim.s;
  const before = Object.values(s.objects).filter((o) => o.cond != null).map((o) => [o, o.cond]); let worse = 0;
  run(sim, 60); for (const [o, c] of before) if (s.objects[o.id] && o.cond < c - 1e-9) worse++;
  ok(worse === 0, 'Maintenance off: no object lost condition in 60 days', `${worse} worse`);
}
{ // 6. Starter facility: a running business with no tutorial
  const sim = makeSandbox({ kind: 'business', start: 'starter', staff: 'basic' }); const s = sim.s; run(sim, 60);
  const rent = s.days.reduce((a, d) => a + d.rent, 0);
  ok(s.mode === 'sandbox' && s.tut.done && !s.lesson && s.staff.some((x) => x.role === 'porter') && rent > 5000, 'Starter facility: sandbox mode, no tutorial, porter hired, rent collected', `rent 60d $${Math.round(rent)}`);
}
{ // 7. Goal met, play continues
  const sim = makeSandbox({ kind: 'free', goal: 'units' }); const s = sim.s; layout(sim);
  for (let y = 4; y <= 26; y += 2) { sim.dispatch({ type: 'build', tool: 'du5x5', a: { x: 23, y }, b: { x: 23, y }, f: 0 }); }
  sim.dispatch({ type: 'build', tool: 'du10x10', a: { x: 17, y: 4 }, b: { x: 17, y: 9 }, f: 0 });
  s.sb.goal.target = Math.min(40, 8); // test only: this layout fits 8 units, so check the mechanism with a reachable target
  let met = false; for (let i = 0; i < 40 * 1440; i++) { sim.step(); if (sim.events.some((e) => e.type === 'sb_goal')) met = true; sim.events.length = 0; if (i % 1440 === 600) sim.dispatch({ type: 'commission', all: true }); }
  const P = sim.sbGoalProgress(); const units = sim.objs('unit').filter((u) => u.cstate === 'operating').length;
  ok(met && s.sb.goal.done && sim.day > s.sb.goal.done + 5 && s.sb.log.some((e) => /Goal met/.test(e.msg)), 'Units goal (target lowered to 8 for this test): met, logged, time keeps running', `met day ${s.sb.goal.done}, now day ${sim.day}, ${units} open, ${P.text}`);
}
{ // 8. Save and resume: identical continuation with sandbox settings
  const a = makeSandbox({ kind: 'business', start: 'starter', goal: 'profit', instant: true }); run(a, 20); a.dispatch({ type: 'sbFunds', amt: 5000 });
  const c = new Sim(JSON.parse(JSON.stringify(a.s))); run(a, 20); run(c, 20);
  ok(JSON.stringify(a.s) === JSON.stringify(c.s) && c.s.sb.injected === 5000 && c.s.sb.goal.k === 'profit', 'Save/resume: settings, goal and funds survive; continuation is identical');
}
{ // 9. Labels distinguish the modes
  const b = makeSandbox({ kind: 'business' }), f = makeSandbox({ kind: 'free' }); b.dispatch({ type: 'sbFunds', amt: 1000 });
  ok(modeLabelFor(b.s) === 'Business sandbox · Funds added' && modeLabelFor(f.s) === 'Free Build · Instant', 'Mode labels', `${modeLabelFor(b.s)} / ${modeLabelFor(f.s)}`);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');

if (fails) process.exitCode = 1;
