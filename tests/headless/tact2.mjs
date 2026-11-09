// Campaign Unit 5: Act II "Stabilize" (beats 6-8) and the Act II chapter break.
// Checks: Act II order and presentation; Beat 6 without pricing and with the build-status step (Got it between a green
// preview and Confirm); Beat 7's Operate -> Jobs queue steps and live repair length; Beat 8 with only the Porter
// required and every role and wage explained; the fail-forward table (row built elsewhere, light fixed through its
// request or the queue, Porter already on staff, Owner busy); the paused break with Continue; owner reviews held through
// the act and released at Continue in saved order, stale ones retired; reload mid-build, mid-repair and at the break;
// save ids; guidance writes nothing; and a deterministic Act II run.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { ROLES } from '../../js/data.js';
import { BEATS, beatIndex, beatHeader, beatGroup, curBeat, stepState, tutorialTick, lessonTick, tutBeatIndex, toolUnlocked } from '../../js/tutorial.js';
import { UI } from '../../js/ui.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const ACT2 = ['expand', 'repair', 'hire'];
const EXPAND = beatIndex('expand'), REPAIR = beatIndex('repair'), HIRE = beatIndex('hire'), BREAK = beatIndex('actII_break'), GRAD = beatIndex('grad');
const NEXT = 'interior_customer'; // the beat after the Act II break (Act III, campaign Unit 6; graduation before it)
const expand = BEATS[EXPAND], repair = BEATS[REPAIR], hire = BEATS[HIRE], brk = BEATS[BREAK];
const hallLight = (sim) => sim.objs('light').find((l) => l.x === 20 && l.y === 8);
const lightTask = (sim) => sim.s.tasks.find((t) => t.obj === hallLight(sim).id && t.type !== 'makeready');
const UI0 = { tab: null, sel: null, tool: null, plan: null, sectionChoice: null, rend: { view: 'ext' } };
const ui = (o = {}) => ({ ...UI0, ...o });
const ROW = { tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 };
const ROW_ELSEWHERE = { tool: 'du10x10', a: { x: 13, y: 3 }, b: { x: 13, y: 9 }, f: 0, axis: 'y' }; // north end, not the coached spot

// The real tutorial with the guided actions. Stops when `stopAt` is current and entered.
function play(seed, { stopAt = 'grad', row = ROW, log, hook } = {}) {
  const sim = makeMaple(seed), s = sim.s, seen = new Set();
  const flush = () => { if (log) for (const e of sim.events) log.push(JSON.stringify(e)); sim.events.length = 0; };
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { sim.step(); tutorialTick(sim); lessonTick(sim); flush(); const id = curBeat(sim)?.id; if (hook && id && !seen.has(id)) { seen.add(id); hook(sim, id); } } };
  const until = (fn, max = 1440 * 6) => { let i = 0; while (!fn() && i < max) { tick(); i++; } assert.ok(fn(), 'tutorial reached expected state'); };
  const d = (a) => { const r = sim.dispatch(a); tutorialTick(sim); flush(); return r; };
  const at = (id) => curBeat(sim)?.id === id && s.tut.entered;
  const stop = (id) => { until(() => at(id), 1440 * 3); return id === stopAt; };
  const run = () => {
    tick(2); d({ type: 'tutFlag', flag: 'welcome' }); tick();
    d({ type: 'ownerMakeReady', unit: s.objects[s.unitRoles.mapleTurnover].id }); s.speed = 4; until(() => curBeat(sim)?.id === 'money');
    for (const f of ['businessOpened', 'moneyAck', 'pricingSeen', 'pricingAck', 'actI_break']) { d({ type: 'tutFlag', flag: f }); tick(); }
    if (stop('expand')) return; s.speed = 4; assert.equal(d({ type: 'build', ...row }).ok, true);
    if (stop('repair')) return; tick(2); assert.equal(d({ type: 'ownerTask', task: lightTask(sim).id }).ok, true);
    if (stop('hire')) return; assert.equal(d({ type: 'hire', role: 'porter' }).ok, true);
    stop('actII_break');
  };
  run();
  return { sim, s, tick, until, d };
}
const ask = (sim, key, extra = {}) => { sim.convo({ key, who: 'Tester', sev: 'attention', ttl: 60, def: 0, text: 'Test ' + key, actions: [{ label: 'Default', action: { type: 'tutFlag', flag: 'def_' + key } }, { label: 'Other' }], ...extra }); return sim.s.convos.find((c) => c.key === key); };

test('Act II is beats 6-8 under "Act II · Stabilize", then the paused Act II break, then Act III and graduation', () => {
  assert.deepEqual(BEATS.map((b) => b.id), ['welcome', 'makeready', 'lease', 'money', 'pricing', 'actI_break', ...ACT2, 'actII_break', 'interior_customer', 'feedback', 'overlays', 'climate', 'actIII_break', 'vertical', 'collections', 'grad']); // + Beat 14 since Unit 7b (tact4b); // Act III since campaign Unit 6 (tact3); Act IV Beat 13 since Unit 7a (tact4)
  for (const id of [...ACT2, 'actII_break']) { const b = BEATS[beatIndex(id)]; assert.equal(b.act, 'II'); assert.equal(b.chapter, 'Stabilize'); }
  assert.deepEqual(ACT2.map((id) => beatHeader(beatIndex(id))), [6, 7, 8].map((n) => `Act II · Stabilize · Beat ${n}`));
  assert.equal(beatHeader(BREAK), 'Act II · Stabilize · Chapter break'); assert.equal(beatHeader(GRAD), 'Graduation · Part 15 of 15'); // Act IV Beats 13-14 since campaign Unit 7a/7b (tact4, tact4b)
  assert.deepEqual([...new Set(BEATS.map(beatGroup))], ['Act I · Take Over', 'Act II · Stabilize', 'Act III · Improve', 'Act IV · Grow', 'Graduation']); // Act IV since campaign Unit 7a (tact4)
  assert.deepEqual(ACT2.map((id) => BEATS[beatIndex(id)].title), ['Maple Street is full', 'A hallway light has failed', 'The Owner is the bottleneck']);
  assert.equal(brk.title, 'Maple Street is stable again'); assert.equal(brk.pause, true); assert.equal(brk.brk, true); assert.equal(brk.button, 'Continue'); assert.equal(brk.flag, 'actII_break');
  assert.match(brk.body, /Maple Street is paused/); assert.match(brk.body, /Act III · Improve/); assert.match(brk.body, /follow a customer/); assert.ok(!brk.enter, 'the break authors no event');
  // The Act II understanding contract is stated on the break card.
  for (const re of [/expansion solves a capacity problem/, /costs cash now and takes time/, /equipment needs maintenance/, /Owner can only do so much/, /daily wage/, /each role does different work/]) assert.match(brk.why, re);
  // Unlocks stay keyed by id (expand, repair) and the first act is untouched.
  const sim = makeMaple(3); sim.s.tut.beat = EXPAND; assert.equal(toolUnlocked(sim, 'du10x10'), true); assert.equal(toolUnlocked(sim, 'light'), false);
  sim.s.tut.beat = REPAIR; assert.equal(toolUnlocked(sim, 'light'), true); sim.s.tut.beat = BREAK; assert.equal(toolUnlocked(sim, 'camera'), false);
});

test('Beat 6: no pricing left; the build steps are kept with one build-status step between a green preview and Confirm', () => {
  assert.deepEqual(expand.steps.map((st) => st.t), ['Open <b>Build</b>', 'Choose <b>Units</b>', 'Pick <b>Drive-Up 10x10</b>', '<b>Drag</b> a row down the grass beside the main aisle', '<b>Green</b>: ready to build. <b>Amber</b>: can\'t earn yet. <b>Red</b>: can\'t go there. Check <b>cash after</b>', 'Tap <b>Confirm</b>', 'Let construction finish and the units open']);
  const text = JSON.stringify(expand) + expand.steps.map((st) => st.t + st.d).join('') + expand.why + expand.body;
  assert.ok(!/Asking rent|asking rent|Pricing|Business/.test(text), 'no pricing step or wording in Beat 6');
  const st = expand.steps[4];
  for (const re of [/<b>Green<\/b>/, /<b>Amber<\/b>/, /<b>Red<\/b>/, /<b>cash after<\/b>/]) assert.match(st.t, re, 'the title alone carries it: phones hide step details during the build review');
  for (const re of [/<b>Green<\/b>/, /<b>Amber<\/b>/, /<b>Red<\/b>/, /<b>cost<\/b>/, /<b>cash after<\/b>/]) assert.match(st.d, re);
  assert.equal(st.sel, '.tut [data-a="tutNext"]'); assert.equal(st.lbl, 'Got it'); assert.deepEqual(st.placement, expand.steps[3].placement, 'suggested placement stays offered');
  assert.match(expand.steps[5].d, /cash after/); assert.match(expand.why, /capital decision/); assert.match(expand.why, /open for rental automatically/);
  // Progress with real UI states: a green preview reaches the status step; Got it is offered only then.
  const { sim } = play(20260929, { stopAt: 'expand' }), green = ui({ tab: 'build', cat: 'units', tool: 'du10x10', plan: { status: 'valid' } });
  assert.equal(stepState(sim, ui({ tab: 'build', cat: 'units', tool: 'du10x10', plan: { status: 'invalid' } })).cur, 3, 'red preview: keep placing');
  assert.equal(expand.buttonWhen(sim, ui({ tool: 'du10x10', plan: { status: 'invalid' } })), false);
  assert.equal(stepState(sim, green).cur, 4); assert.equal(expand.buttonWhen(sim, green), true); assert.equal(expand.buttonWhen(sim, ui()), false, 'never before a preview');
  sim.dispatch({ type: 'tutFlag', flag: 'buildStatusAck' }); assert.equal(stepState(sim, green).cur, 5, 'then Confirm'); assert.equal(expand.buttonWhen(sim, green), false);
});

test('Beat 6 fail-forward: Confirm without Got it, or a valid row built somewhere else, completes the beat', () => {
  const a = play(20260929, { stopAt: 'expand' }); assert.equal(a.d({ type: 'build', ...ROW }).ok, true);
  assert.equal(stepState(a.sim, ui()).cur, 6, 'ordered row: wait for construction (status step not needed)'); assert.equal(expand.buttonWhen(a.sim, ui({ tool: 'du10x10', plan: { status: 'valid' } })), false);
  const b = play(20260929, { stopAt: 'expand' }); b.s.cash = Math.max(b.s.cash, 1e5);
  assert.equal(b.sim.plan({ ...ROW_ELSEWHERE }).status, 'valid', 'the other location is a valid row');
  assert.equal(b.d({ type: 'build', ...ROW_ELSEWHERE }).ok, true); b.s.speed = 4; b.until(() => curBeat(b.sim)?.id !== 'expand', 1440 * 3);
  assert.equal(curBeat(b.sim).id, 'repair', 'first_expansion counts wherever the row is');
});

test('Beat 7: the failure is shown as a queued job in Operate -> Jobs with its live length, then the unchanged repair flow', () => {
  assert.deepEqual(repair.steps.map((st) => st.t), ['Look inside: tap <b>F1</b>', 'Open <b>Operate</b> to see the job', 'Choose <b>Jobs</b>', 'Jobs wait in a <b>queue</b>', 'Tap <b>Back to map</b>', 'Tap the broken <b>light</b>', 'Tap <b>Send Owner</b>', 'Let the Owner fix it']);
  assert.equal(repair.steps[5].clearMapTap, true, 'PR #19 shield kept on the light step'); assert.equal(repair.steps.filter((st) => st.clearMapTap).length, 1);
  assert.deepEqual(repair.steps[2].section, ['operate', 'Work queue', 'Jobs']); assert.equal(repair.steps[2].sel, '.sheet [data-section-picker]');
  assert.match(repair.why, /Operate &rarr; Jobs/); assert.match(repair.steps[6].d, /waits its turn/);
  const { sim } = play(20260929, { stopAt: 'repair' }); const t = lightTask(sim);
  assert.equal(t.assigned, null, 'the job waits in the queue, unassigned, when the beat starts');
  assert.equal(sim.taskHours(t), 1.5);
  assert.match(curBeat(sim).steps[3].d, /<b>Repair Light<\/b> needs about <b>1\.5 game hours<\/b> of on-site work, plus walking time, and nobody has it yet/);
  assert.match(curBeat(sim).steps[3].d, /one job at a time/);
  assert.equal(stepState(sim, ui({ rend: { view: 'ext' } })).cur, 0, 'F1 first');
  assert.equal(stepState(sim, ui({ rend: { view: 0 } })).cur, 1, 'then Operate');
  assert.equal(stepState(sim, ui({ rend: { view: 0 }, tab: 'operate', sheetTall: true })).cur, 2, 'Operate open: choose Jobs');
  assert.equal(repair.buttonWhen(sim), false, 'no Got it before Jobs is seen');
  const jobs = ui({ rend: { view: 0 }, tab: 'operate', sheetTall: true, sectionChoice: { tab: 'operate', label: 'Work queue' } }); assert.equal(stepState(sim, jobs).cur, 3);
  sim.dispatch({ type: 'tutFlag', flag: 'jobsSeen' }); assert.equal(repair.buttonWhen(sim), true); assert.equal(stepState(sim, jobs).cur, 3, 'read, then Got it');
  sim.dispatch({ type: 'tutFlag', flag: 'jobsAck' }); assert.equal(repair.buttonWhen(sim), false);
  assert.equal(stepState(sim, jobs).cur, 4, 'panel still expanded: Back to map'); assert.equal(stepState(sim, ui({ rend: { view: 0 }, tab: 'operate', sheetTall: false })).cur, 5, 'map showing: tap the light');
  const sel = ui({ rend: { view: 0 }, sel: hallLight(sim).id }); assert.equal(stepState(sim, sel).cur, 6, 'light selected: Send Owner');
  assert.equal(sim.dispatch({ type: 'ownerTask', task: t.id }).ok, true); assert.equal(stepState(sim, ui()).cur, 7, 'sent: let the Owner fix it');
});

test('Beat 7: the production UI records Jobs seen only for the Operate work queue during the tutorial', () => {
  const { sim } = play(20260929, { stopAt: 'repair' });
  const u = Object.create(UI.prototype); u.g = { sim, audio: { play() {} } }; u.$ = () => ({ querySelector: () => null }); u.do = (a) => sim.dispatch(a);
  u.tab = 'business'; u.jumpSection('Work queue'); u.tab = 'operate'; u.jumpSection('Hire capacity'); assert.ok(!sim.s.tut.flags.jobsSeen);
  u.jumpSection('Work queue'); assert.equal(sim.s.tut.flags.jobsSeen, true); assert.deepEqual(u.sectionChoice, { tab: 'operate', label: 'Work queue' });
  const done = makeMaple(4); done.dispatch({ type: 'tutSkip' }); u.g.sim = done; u.do = (a) => done.dispatch(a); u.jumpSection('Work queue'); assert.ok(!done.s.tut.flags.jobsSeen, 'not after the tutorial');
});

test('Beat 7 fail-forward: a light fixed through its request (first_repair), or sent from the queue while the Owner is busy', () => {
  // Fixed through the light-out request's own action: the light is never selected and Jobs never opened.
  const a = play(20260929, { stopAt: 'repair' }), L = hallLight(a.sim); a.tick(2);
  assert.equal(a.d({ type: 'ownerTaskFor', obj: L.id }).ok, true, 'the request action "Assign repair"');
  a.s.speed = 4; a.until(() => curBeat(a.sim)?.id !== 'repair', 1440); assert.ok(a.s.milestones.first_repair); assert.equal(curBeat(a.sim).id, 'hire');
  assert.ok(repair.steps.every((st) => st.done(a.sim, ui())), 'every repair step reads complete via first_repair');
  // first_repair already recorded before the beat: the beat completes on entering (existing check).
  const b = play(20260929, { stopAt: 'repair' }); b.s.milestones.first_repair = b.s.t; tutorialTick(b.sim); assert.equal(curBeat(b.sim).id, 'hire');
  // Owner busy: the repair still assigns and waits in the Owner's queue as it does today.
  const c = play(20260929, { stopAt: 'repair' }), u = Object.values(c.s.objects).find((o) => o.type === 'unit' && !o.lease && o.cstate === 'operating') || c.sim.objs('unit')[0];
  const mk = c.sim.addTask({ type: 'makeready', need: 'makeready', obj: u.id, label: 'Make-ready test', work: 150, pri: 0 });
  assert.equal(c.sim.dispatch({ type: 'ownerTask', task: mk.id }).ok, true);
  const r = c.sim.dispatch({ type: 'ownerTask', task: lightTask(c.sim).id }); assert.equal(r.ok, true);
  assert.ok(lightTask(c.sim).assigned, 'assigned to the Owner'); assert.equal(stepState(c.sim, ui()).cur, 7, 'sent while busy: queued behind the make-ready');
  c.s.speed = 4; c.until(() => curBeat(c.sim)?.id !== 'repair', 1440 * 2); assert.equal(curBeat(c.sim).id, 'hire');
});

test('Beat 8: only the Porter is required; Tech, Clerk and Manager are explained with their wages; Hire step text unchanged', () => {
  assert.deepEqual(hire.steps.map((st) => st.t), ['Open <b>Operate</b>', 'Tap <b>Hire Porter</b>', 'Other roles: <b>Tech</b> $20/day, <b>Clerk</b> $15/day, <b>Manager</b> $25/day', 'Watch the Porter work']);
  assert.equal(hire.steps[1].d, 'In the Operate panel, choose <b>Hire</b> in the section selector at the top, then tap <b>Hire Porter</b>. The button shows the daily wage.', 'PR #20 card text kept');
  assert.equal(hire.steps[1].sel, `[data-cmd*='"role":"porter"']`);
  const w = (r) => `$${ROLES[r].wage % 1 ? ROLES[r].wage.toFixed(2) : ROLES[r].wage}/day`; // as the Hire list shows it ($12.50)
  for (const r of ['porter', 'tech', 'clerk', 'manager']) assert.ok(hire.why.includes(`<b>${ROLES[r].name}</b> (${w(r)})`), r);
  for (const r of ['tech', 'clerk', 'manager']) assert.ok(hire.steps[2].t.includes(`<b>${ROLES[r].name}</b> ${w(r)}`), r + ' in the card title (phones show titles)');
  for (const re of [/Tech<\/b> repairs equipment/, /Clerk<\/b> runs the office counter/, /Manager<\/b> handles routine decisions/, /You don't need them now/]) assert.match(hire.steps[2].d, re);
  assert.match(hire.why, /Only the Porter is needed now/); assert.equal(hire.steps[3].d, 'Keep time running. The Porter walks out of the office and picks up the cleaning or the make-ready on their own.', 'Watch step text as before');
  assert.ok(!hire.steps.some((st) => /"role":"(tech|clerk|manager)"/.test(st.sel || '')), 'no other hire is asked for');
  const { sim } = play(20260929, { stopAt: 'hire' });
  assert.equal(hire.buttonWhen(sim), false, 'no Got it before the hire');
  assert.equal(sim.dispatch({ type: 'hire', role: 'porter' }).ok, true); assert.equal(stepState(sim, ui()).cur, 2, 'roles card'); assert.equal(hire.buttonWhen(sim), true);
  assert.equal(hire.check(sim), false); sim.dispatch({ type: 'tutFlag', flag: 'rolesAck' }); assert.equal(stepState(sim, ui()).cur, 3); assert.equal(hire.buttonWhen(sim), false);
  assert.equal(sim.s.staff.filter((x) => x.role !== 'owner').length, 1, 'one hire: the Porter');
  // Not a gate: delegated work completes the beat whether or not the roles card was acknowledged.
  const o = play(20260929, { stopAt: 'hire' }); o.d({ type: 'hire', role: 'porter' }); o.s.milestones.first_delegated = o.s.t; o.s.visits = o.s.visits.filter((v) => v.kind !== 'moveout');
  assert.ok(!o.s.tut.flags.rolesAck); assert.equal(hire.check(o.sim), true); assert.equal(stepState(o.sim, ui()).all, true);
});

test('Beat 8 fail-forward: a Porter already on staff completes the beat once delegated work happens (no fire and re-hire)', () => {
  const { sim, s, tick, until } = play(20260929, { stopAt: 'repair' });
  assert.equal(sim.dispatch({ type: 'hire', role: 'porter' }).ok, true); tick(2); assert.equal(sim.dispatch({ type: 'ownerTask', task: lightTask(sim).id }).ok, true); const staff0 = clone(s.staff.map((x) => x.id));
  s.speed = 4; until(() => curBeat(sim)?.id === 'hire' && s.tut.entered, 1440 * 3);
  assert.equal(stepState(sim, ui()).cur >= 2 || hire.check(sim), true, 'Open Operate / Hire Porter already satisfied');
  until(() => curBeat(sim)?.id !== 'hire', 1440 * 3);
  assert.equal(curBeat(sim).id, 'actII_break'); assert.deepEqual(s.staff.map((x) => x.id), staff0, 'nobody fired or re-hired');
  assert.ok(s.milestones.first_delegated);
});

test('Beat 8 waits for its authored move-out to arrive before the act ends', () => {
  const { sim, s } = play(20260929, { stopAt: 'hire' });
  const u = s.objects[s.unitRoles.mapleInteriorMoveout], L = s.leases[u.lease];
  assert.ok(s.visits.some((v) => v.kind === 'moveout' && v.tenant === L.tenant), 'move-out scheduled on entering');
  s.milestones.first_delegated = s.t; assert.equal(hire.check(sim), false, 'not while the move-out is still on the way');
  s.visits = s.visits.filter((v) => !(v.kind === 'moveout' && v.tenant === L.tenant)); assert.equal(hire.check(sim), true);
});

test('Act II break: paused on arrival, run speeds held, Continue required, graduation not entered before it', () => {
  const { sim, s } = play(20260929, { stopAt: 'actII_break' });
  assert.equal(curBeat(sim).id, 'actII_break'); assert.equal(s.speed, 0);
  const mu = s.objects[s.unitRoles.mapleInteriorMoveout], mL = mu.lease && s.leases[mu.lease];
  assert.ok(!mL || !s.visits.some((v) => v.kind === 'moveout' && v.tenant === mL.tenant), 'the authored move-out is not still pending');
  const t0 = s.t; for (const v of [1, 2, 4]) { sim.dispatch({ type: 'speed', v }); tutorialTick(sim); assert.equal(s.speed, 0); }
  sim.poll(); assert.equal(s.t, t0, 'no game time passes on the break');
  assert.equal(curBeat(sim).id, 'actII_break'); assert.equal(brk.buttonWhen(sim), true);
  sim.dispatch({ type: 'tutFlag', flag: 'actII_break' }); while (s.convos.some((c) => c.released)) { sim.dispatch({ type: 'convo', id: s.convos.find((c) => c.released).id, i: 0 }); tutorialTick(sim); }
  tutorialTick(sim); assert.equal(curBeat(sim).id, NEXT); assert.equal(s.speed, 0, 'still paused into Act III');
});

test('owner reviews raised in Act II wait through the act; at Continue the stale light-out retires and the rest come out in order', () => {
  // `tied`: a real light-out request (tied to the light), raised in Beat 7: the existing repair path drops it when the light is
  // fixed, so it is never shown. `light`: the same request without the light link (as tact1 raises it), still held at the
  // break: the existing stale check retires it at Continue. `extra`: an actionable review raised in Beat 8.
  let tied = null, light = null, extra = null;
  const { sim, s } = play(20260929, { stopAt: 'actII_break', hook: (sim, id) => {
    if (id === 'repair') { const L = hallLight(sim); tied = ask(sim, 'light' + L.id, { obj: L.id, text: 'The light near my unit is out.' }); assert.equal(sim.reviewHeld(tied), true); }
    if (id === 'hire') { const L = hallLight(sim); light = ask(sim, 'light' + L.id, { text: 'The light near my unit is out.' }); extra = ask(sim, 'qhire'); }
  } });
  assert.ok(tied && light && extra, 'raised during the act'); assert.ok(!s.convos.includes(tied), 'tied request dropped when the light was fixed (existing)');
  const held = sim.heldReviews(); const keys = held.map((c) => c.key);
  assert.ok(keys.includes(light.key) && keys.includes('qhire'), 'held, not expired, through the act: ' + keys.join(','));
  assert.ok(!s.tut.flags['def_' + light.key] && !s.tut.flags.def_qhire, 'no default applied during the act');
  assert.ok(sim.works(hallLight(sim)), 'the light was fixed in Beat 7');
  const expected = held.filter((c) => c !== light && sim.reviewActionable(c)).map((c) => c.key);
  sim.dispatch({ type: 'tutFlag', flag: 'actII_break' }); tutorialTick(sim);
  assert.ok(!s.convos.includes(light), 'fixed light: stale, retired'); assert.ok(s.mgrLog.some((l) => l.retired && l.msg.includes('The light near my unit is out.')), 'logged, no decision');
  assert.ok(!s.tut.flags['def_' + light.key], 'retired without its default');
  assert.deepEqual(s.convos.filter((c) => c.released).map((c) => c.key), expected, 'released in saved order');
  assert.equal(curBeat(sim).id, 'actII_break', 'Act III waits for them'); assert.equal(s.speed, 0);
  assert.equal(stepState(sim, ui()).cur, 1, 'card: answer the waiting requests');
  while (s.convos.some((c) => c.released)) { sim.dispatch({ type: 'convo', id: s.convos.find((c) => c.released).id, i: 1 }); tutorialTick(sim); }
  tutorialTick(sim); assert.equal(curBeat(sim).id, NEXT); assert.equal(s.speed, 0); assert.ok(!s.tut.flags.def_qhire, 'answered, not defaulted');
});

test('reload mid-build, mid-repair and at the break resumes on the same beat and step', () => {
  // Mid-build: the row is ordered and under construction.
  const a = play(20260929, { stopAt: 'expand' }); assert.equal(a.d({ type: 'build', ...ROW }).ok, true); a.tick(30);
  assert.equal(a.s.milestones.first_expansion, undefined); const ra = new Sim(clone(a.s));
  assert.equal(ra.s.tut.beatId, 'expand'); assert.equal(curBeat(ra).id, 'expand'); assert.equal(stepState(ra, ui()).cur, 6, 'waiting for construction');
  ra.s.speed = 4; let i = 0; while (curBeat(ra)?.id === 'expand' && i++ < 1440 * 3) { ra.step(); tutorialTick(ra); } assert.equal(curBeat(ra).id, 'repair');
  // Mid-repair, on the queue card: Jobs seen, not acknowledged, nothing sent yet.
  const q = play(20260929, { stopAt: 'repair' }); q.d({ type: 'tutFlag', flag: 'jobsSeen' });
  const rq = new Sim(clone(q.s)); assert.equal(rq.s.tut.beatId, 'repair'); assert.equal(rq.s.tut.beat, REPAIR);
  assert.equal(stepState(rq, ui({ rend: { view: 0 } })).cur, 3, 'Got it on the queue card'); assert.equal(repair.buttonWhen(rq), true); assert.equal(lightTask(rq).assigned, null);
  // Mid-repair, Owner sent and not yet finished.
  const b = play(20260929, { stopAt: 'repair' }); b.tick(2); assert.equal(b.d({ type: 'ownerTask', task: lightTask(b.sim).id }).ok, true);
  const rb = new Sim(clone(b.s)); assert.equal(rb.s.tut.beatId, 'repair'); assert.equal(rb.s.tut.beat, REPAIR); assert.ok(lightTask(rb).assigned);
  assert.equal(stepState(rb, ui()).cur, 7, 'let the Owner fix it'); assert.equal(repair.buttonWhen(rb), false);
  rb.s.speed = 4; i = 0; while (curBeat(rb)?.id === 'repair' && i++ < 1440 * 3) { rb.step(); tutorialTick(rb); } assert.equal(curBeat(rb).id, 'hire');
  // At the break, before and after Continue.
  const c = play(20260929, { stopAt: 'actII_break' }); const rc = new Sim(clone(c.s));
  assert.equal(rc.s.tut.beatId, 'actII_break'); assert.equal(rc.s.tut.beat, BREAK); tutorialTick(rc); assert.equal(curBeat(rc).id, 'actII_break'); assert.equal(rc.s.speed, 0);
  c.sim.dispatch({ type: 'tutFlag', flag: 'actII_break' }); const rc2 = new Sim(clone(c.s)); tutorialTick(rc2);
  while (rc2.s.convos.some((x) => x.released)) { rc2.dispatch({ type: 'convo', id: rc2.s.convos.find((x) => x.released).id, i: 0 }); tutorialTick(rc2); }
  tutorialTick(rc2); assert.equal(curBeat(rc2).id, NEXT); assert.equal(rc2.s.speed, 0);
});

test('save ids: expand, repair and hire keep their ids; a 36d53ce save on graduation resumes on graduation', () => {
  const sim = makeMaple(5);
  for (const [id, at] of [['expand', 6], ['repair', 7], ['hire', 8], ['grad', 9]]) { // positions in the 36d53ce layout
    const st = clone(sim.s); st.tut.beatId = id; st.tut.beat = at; st.tut.beatAt = at; st.tut.entered = true; const r = new Sim(st);
    tutorialTick(r); assert.equal(r.s.tut.beatId, id); assert.equal(r.s.tut.beat, beatIndex(id)); assert.equal(curBeat(r).id, id);
  }
  const st = clone(sim.s); st.tut.beatId = 'actII_break'; st.tut.beat = BREAK; st.tut.beatAt = BREAK; const r = new Sim(st); assert.equal(tutBeatIndex(r.s), BREAK);
});

// PR #21 repair (R1-R3). A production UI over the real game with a recording renderer: any camera or view call is logged.
function camUI(sim, view = 'ext') {
  const calls = [], u = Object.create(UI.prototype);
  const rend = { view, zoom: 1, rot: 0, center: { x: 16, z: 16 }, setFocus() {}, setSelection() {}, setPreview() {}, project: () => ({ x: 195, y: 300, vis: true }),
    setView(v) { calls.push('setView:' + v); this.view = v; }, lookAt(x, y) { calls.push('lookAt'); }, pan() { calls.push('pan'); }, zoomBy() { calls.push('zoomBy'); } };
  Object.assign(u, { g: { sim, rend, audio: { play() {}, unlock() {} } }, title: false, sel: null, tab: null, tool: null, toasts: [], popupBlocks: new Set(), upgradeOptions: {} });
  for (const k of ['renderTut', 'renderSheet', 'renderActionBar', 'renderFeed', 'sfx', 'toast', 'syncFloorUi', 'resumePopup', 'pauseForPopup', 'endRetrofit']) u[k] = () => {};
  u.$ = () => ({ querySelector: () => null, firstChild: null }); u.root = { querySelector: () => null, querySelectorAll: () => [], classList: { toggle() {}, remove() {} } };
  u.do = (a) => sim.dispatch(a); u.modalOpen = () => false;
  return { u, rend, calls };
}
const cam = (r) => JSON.stringify([r.view, r.zoom, r.rot, r.center.x, r.center.z]);

test('R1: entering Beat 7, Use suggested placement in Beat 6 and Continue at the Act II break leave the camera and floor view alone', () => {
  // Entering the repair beat: the ring follows the light, but no view change or pan (the F1 step stays a real tap).
  const a = play(20260929, { stopAt: 'repair' }), A = camUI(a.sim, 'ext'), before = cam(A.rend);
  A.u.onEvent({ type: 'tut_beat', beat: REPAIR }); assert.deepEqual(A.calls, []); assert.equal(cam(A.rend), before);
  assert.equal(repair.keepCamera, true); assert.equal(repair.focus(a.sim).view, undefined); assert.equal(repair.focus(a.sim).obj, hallLight(a.sim).id, 'ring target kept');
  assert.equal(stepState(a.sim, A.u).cur, 0, 'reached on EXT: the F1 step is current, not skipped');
  // Use suggested placement on Beat 6's drag step: the row is planned with no camera or view change, from EXT and from F1.
  for (const view of ['ext', 0]) {
    const b = play(20260929, { stopAt: 'expand' }), B = camUI(b.sim, view), b0 = cam(B.rend);
    B.u.cat = 'units'; B.u.tab = 'build'; B.u.pickTool('du10x10'); B.calls.length = 0;
    assert.equal(stepState(b.sim, B.u).cur, 3, 'drag step'); B.u.suggestPlacement();
    assert.deepEqual(B.calls, [], 'no setView/lookAt/pan/zoom from ' + view); assert.equal(cam(B.rend), b0);
    assert.equal(B.u.tool, 'du10x10'); assert.equal(B.u.plan?.status, 'valid', 'the suggested row is planned and green');
    assert.equal(b.s.cash, play(20260929, { stopAt: 'expand' }).s.cash, 'nothing bought');
  }
  // Continue at the Act II break, and graduation entering: no camera call.
  const c = play(20260929, { stopAt: 'actII_break' }), C = camUI(c.sim, 0), c0 = cam(C.rend);
  C.u.onEvent({ type: 'tut_beat', beat: BREAK }); const btn = { dataset: { a: 'tutNext' } }; btn.closest = () => btn; C.u.onClick({ target: btn });
  c.tick(); C.u.onEvent({ type: 'tut_beat', beat: beatIndex(NEXT) }); assert.ok(c.s.tut.flags.actII_break);
  assert.deepEqual(C.calls, []); assert.equal(cam(C.rend), c0);
  // Unrelated framing is preserved: Act I's entry framing still runs, and Act I's suggested placement is unchanged code.
  const m = makeMaple(20260929), M = camUI(m, 'ext'); m.s.tut.beat = beatIndex('makeready'); m.s.tut.beatId = 'makeready';
  M.u.onEvent({ type: 'tut_beat', beat: beatIndex('makeready') }); assert.deepEqual(M.calls, ['lookAt'], 'Act I beat entry still frames its target');
});

test('R2: only the Beat 6 build-status step folds the review to name, cost, cash after, Rotate and Confirm', () => {
  const flagged = BEATS.flatMap((b) => (b.steps || []).map((st, i) => (st.compactReview ? b.id + ':' + i : null))).filter(Boolean);
  assert.deepEqual(flagged, ['expand:4']);
  const css = readFileSync(new URL('../../css/game.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('#ui.tut-review-compact')); const sel = rule.slice(0, rule.indexOf('{'));
  for (const k of ['.review-body', '.nm > small', '.spend-more', '.build-authorization']) assert.ok(sel.includes(k), k + ' folded');
  for (const k of ['.spending', 'review-commitment', 'confirm', '.bot', '.cost', 'rotate', '.top,', '.top {']) assert.ok(!sel.includes(k), k + ' never hidden');
  // The cash after figure sits outside the folded part of the spending line; the rest of the line is what folds.
  const ui0 = readFileSync(new URL('../../js/ui.js', import.meta.url), 'utf8');
  assert.match(ui0, /<p class="note spending">Cash after \$\{[^}]+\}: <b>\$\{money\(P\.cash\)\}<\/b><span class="spend-more">/);
  assert.match(rule.slice(rule.indexOf('{'), rule.indexOf('}')), /^\{\s*display:none;\s*$/);
  // The class follows the visible Got it: on while the card offers it, off once acknowledged.
  const { sim } = play(20260929, { stopAt: 'expand' }), on = new Set();
  const U = camUI(sim).u; U.root.classList = { toggle: (k, v) => (v ? on.add(k) : on.delete(k)), remove: (k) => on.delete(k) };
  U.renderTut = UI.prototype.renderTut; U.$ = (id) => (id === 'tut' ? { innerHTML: '' } : { querySelector: () => null, firstChild: null }); U.rend.setFocus = () => {};
  U.tool = 'du10x10'; U.plan = { status: 'valid' }; U.planArgs = null; U.currentBlueprintPlan = () => null; U.resolveStep = (st) => st;
  U.renderTut(true); assert.ok(on.has('tut-review-compact'), 'status card showing Got it');
  sim.dispatch({ type: 'tutFlag', flag: 'buildStatusAck' }); U.renderTut(true); assert.ok(!on.has('tut-review-compact'), 'after Got it: full review again');
});

test('R3: let-time-run steps count any running speed: 1x is ringed only from Pause, never at 1x/2x/4x, and no speed is changed', () => {
  const runs = BEATS.flatMap((b) => (b.steps || []).map((st, i) => (st.run ? b.id + ':' + i : null))).filter(Boolean);
  assert.deepEqual(runs, ['repair:7', 'hire:3', 'interior_customer:1', 'feedback:0', 'overlays:8', 'overlays:14', 'vertical:0', 'collections:0'], 'Act II Owner and Porter work, the Act III let-time-run steps (campaign Unit 6), the Act IV Beat 13 wait for rent (Unit 7a) and the Beat 14 wait for a real payment (Unit 7b); Act I clock steps unchanged');
  for (const [beat, at] of [['repair', 7], ['hire', 3]]) {
    const { sim } = play(20260929, { stopAt: beat }), U = camUI(sim).u, raw = BEATS[beatIndex(beat)].steps[at];
    for (const sp of [0, 1, 2, 4]) {
      sim.s.speed = sp; const before = JSON.stringify(sim.s), r = U.resolveStep(raw);
      if (sp === 0) { assert.equal(r.sel, '#speed [data-v="1"]'); assert.equal(r.redirect, undefined); }
      else { assert.equal(r.sel, null, beat + ' at ' + sp + 'x: nothing ringed'); assert.equal(r.redirect, 'running'); assert.ok(!/1x/.test(r.t + r.d)); }
      assert.equal(sim.s.speed, sp, 'no automatic speed change'); assert.equal(JSON.stringify(sim.s), before);
    }
    // Time held by an expanded panel still points at the way out, as before.
    sim.s.speed = 0; U.popupBlocks = new Set(['sheet']); U.sheetTall = true; U.$ = () => ({ querySelector: () => null, firstChild: {} });
    assert.equal(U.resolveStep(raw).redirect, 'back');
  }
});

test('guidance writes nothing: step states, buttons and card text leave the game state untouched', () => {
  for (const stop of ['expand', 'repair', 'hire', 'actII_break']) {
    const { sim } = play(20260929, { stopAt: stop }); const before = JSON.stringify(sim.s);
    for (let i = 0; i < 30; i++) for (const u of [ui(), ui({ tab: 'operate' }), ui({ tool: 'du10x10', plan: { status: 'valid' } })]) { stepState(sim, u); const b = curBeat(sim); if (b.buttonWhen) b.buttonWhen(sim, u); }
    assert.equal(JSON.stringify(sim.s), before, stop);
  }
});

test('Act II is deterministic: twin runs to the break give identical events and state', () => {
  const la = [], lb = []; const A = play(4242, { stopAt: 'actII_break', log: la }), B = play(4242, { stopAt: 'actII_break', log: lb });
  assert.equal(la.length, lb.length); assert.deepEqual(la, lb); assert.equal(JSON.stringify(A.s), JSON.stringify(B.s));
});

console.log(`${passed} Act II checks passed`);
