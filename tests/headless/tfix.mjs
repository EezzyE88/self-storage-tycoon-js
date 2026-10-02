// Round 13 checks: old-tutorial save migration, climate-conversion renovation, HUD mode label.
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { installTutorial, BEATS } from '../../js/tutorial.js';
let ok = true; const check = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name, extra); ok &&= !!cond; };
// 1. pre-Round-11 save mid-tutorial (no market state, old part 9 = "Add Climate")
{ const st = JSON.parse(JSON.stringify(makeMaple().s)); delete st.mkt; st.tut = { on: true, beat: 9, flags: {}, done: false, entered: true };
  const sim = new Sim(st); check('old save part 9 -> new part', sim.s.tut.beat === 7 && BEATS[7].id === 'grad', `beat ${sim.s.tut.beat} ${BEATS[sim.s.tut.beat].id}`);
  const st2 = JSON.parse(JSON.stringify(makeMaple().s)); st2.tut = { on: true, beat: 6, flags: {}, done: false }; const sim2 = new Sim(st2);
  check('Round 11+ save untouched', sim2.s.tut.beat === 6); }
// 2. climate conversion on a vacant interior unit with HVAC
{ const sim = makeMaple(); const s = sim.s; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true; s.creative = true;
  const r0 = sim.dispatch({ type: 'build', tool: 'hvac', a: { x: 14, y: 8 }, b: { x: 14, y: 8 }, f: 0 }); s.creative = false;
  for (let i = 0; i < 1440 * 2; i++) { sim.step(); sim.events.length = 0; }
  const u = sim.objs('unit').find((x) => x.access === 'interior' && x.lease); const L = s.leases[u.lease]; sim.endLease(L, 'moveout');
  const opts = sim.renovateOptions(u); const op = opts.find((o) => o.kind === 'climate');
  check('hvac built', r0.ok, r0.msg || ''); check('climate option offered', !!op && op.ok, JSON.stringify(opts.map((o) => [o.kind, o.ok, o.why || '', o.cost])));
  const cash0 = s.cash; const r = sim.dispatch({ type: 'renovate', unit: u.id, kind: 'climate' });
  check('renovate ok', r.ok, r.msg || ''); check('unit is climate', u.env === 'climate'); check('cost charged', Math.round(cash0 - s.cash) === op.cost, `${Math.round(cash0 - s.cash)} vs ${op.cost}`);
  check('make-ready queued', s.tasks.some((t) => t.obj === u.id && t.type === 'makeready'));
  for (let i = 0; i < 1440 * 20; i++) { if (i % 30 === 0) for (const t of s.tasks.filter((t) => !t.assigned)) sim.dispatch({ type: 'ownerTask', task: t.id }); sim.step(); sim.events.length = 0; }
  check('converted unit re-leased within 20 days', !!u.lease, `commercial ${u.commercial} rent ${u.lease ? s.leases[u.lease].rent : '-'} market ${Math.round(sim.marketRent(u))}`); }
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
