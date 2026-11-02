// Campaign Unit 4: Act I "Take Over" (beats 1-5) and the generic chapter break.
// Checks: Act I beat order and presentation (header, Tutorial list); the Act I fail-forward table; the chapter break
// (paused, nothing authored pending, run speeds held, Continue required, next act not entered before it); owner reviews
// held through Act I and released at Continue in saved order, stale ones retired with no decision or default, the next
// act waiting until they are answered; reload at the break; old expand saves resuming at Beat 5 (or expand); graduated
// and sentinel saves untouched; the production UI card; and a deterministic Act I run.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { BEATS, beatIndex, beatHeader, beatGroup, curBeat, stepState, tutorialTick, lessonTick, installTutorial, tutBeatIndex } from '../../js/tutorial.js';
import { UI } from '../../js/ui.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const ACT1 = ['welcome', 'makeready', 'lease', 'money', 'pricing'];
const BREAK = beatIndex('actI_break'), EXPAND = beatIndex('expand');
const rentsOf = (s) => Object.fromEntries(Object.entries(s.leases).map(([k, L]) => [k, L.rent]));
const ask = (sim, key, extra = {}) => { sim.convo({ key, who: 'Tester', sev: 'attention', ttl: 60, def: 0, text: 'Test ' + key, actions: [{ label: 'Default', action: { type: 'tutFlag', flag: 'def_' + key } }, { label: 'Other' }], ...extra }); return sim.s.convos.find((c) => c.key === key); };
const hallLight = (sim) => sim.objs('light').find((l) => l.x === 20 && l.y === 8);

// The real tutorial, played through Act I with the guided actions (same path as twalk). `hook(sim, id)` runs once per beat.
function play(seed, { hook, stopAt = 'actI_break', log } = {}) {
  const sim = makeMaple(seed), s = sim.s, seen = new Set();
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { sim.step(); tutorialTick(sim); lessonTick(sim); if (log) for (const e of sim.events) log.push(JSON.stringify(e)); sim.events.length = 0; const id = curBeat(sim)?.id; if (hook && id && !seen.has(id)) { seen.add(id); hook(sim, id); } } };
  const until = (fn, max = 1440 * 6) => { let i = 0; while (!fn() && i < max) { tick(); i++; } assert.ok(fn(), 'tutorial reached expected state'); };
  const d = (a) => { const r = sim.dispatch(a); tutorialTick(sim); if (log) for (const e of sim.events) log.push(JSON.stringify(e)); sim.events.length = 0; return r; };
  const at = (id) => curBeat(sim)?.id === id;
  tick(2); if (!at(stopAt)) { d({ type: 'tutFlag', flag: 'welcome' }); tick(); }
  if (!at(stopAt)) { const u = s.objects[s.unitRoles.mapleTurnover]; d({ type: 'ownerMakeReady', unit: u.id }); s.speed = 4; until(() => at('money') || at(stopAt)); }
  if (!at(stopAt)) { d({ type: 'tutFlag', flag: 'businessOpened' }); tick(); d({ type: 'tutFlag', flag: 'moneyAck' }); tick(); }
  if (!at(stopAt)) { d({ type: 'tutFlag', flag: 'pricingSeen' }); tick(); d({ type: 'tutFlag', flag: 'pricingAck' }); tick(); }
  return { sim, s, tick, until, d };
}

test('Act I is beats 1-5, then the Act I break, then the rest of the tutorial in its old order', () => {
  assert.deepEqual(BEATS.map((b) => b.id), [...ACT1, 'actI_break', 'expand', 'repair', 'hire', 'grad']);
  for (const id of [...ACT1, 'actI_break']) { const b = BEATS[beatIndex(id)]; assert.equal(b.act, 'I'); assert.equal(b.chapter, 'Take Over'); }
  assert.deepEqual(ACT1.map((id) => beatHeader(beatIndex(id))), [1, 2, 3, 4, 5].map((n) => `Act I · Take Over · Beat ${n}`));
  assert.equal(beatHeader(BREAK), 'Act I · Take Over · Chapter break');
  assert.equal(beatHeader(EXPAND), 'Add Capacity · Part 6 of 9'); assert.equal(beatHeader(beatIndex('grad')), 'Graduation · Part 9 of 9');
  assert.deepEqual([...new Set(BEATS.map(beatGroup))], ['Act I · Take Over', 'Add Capacity', 'Keep the Property Working', 'Graduation']);
  const brk = BEATS[BREAK]; assert.equal(brk.title, 'You have control of Maple Street'); assert.equal(brk.pause, true); assert.equal(brk.brk, true);
  assert.equal(brk.button, 'Continue'); assert.match(brk.body, /Act II · Stabilize/); assert.match(brk.body, /Maple Street is paused/);
  assert.ok(!brk.enter, 'the break authors no event');
  // Beat 1 introduces the clock and floor views; beats 2-4 keep their content.
  const w = BEATS[0]; assert.match(w.body, /paused/); assert.match(w.body, /top left/); assert.match(w.body, /<b>Pause<\/b>, <b>1x<\/b>, <b>2x<\/b> and <b>4x<\/b>/);
  assert.match(w.steps[0].d, /<b>EXT<\/b>/); assert.match(w.steps[0].d, /<b>F1<\/b>/); assert.equal(w.steps.length, 2);
  assert.match(w.steps[1].d, /top left: <b>Pause<\/b>, <b>1x<\/b>, <b>2x<\/b> and <b>4x<\/b>/, 'the clock is named in a step (coach cards show steps, not the body)');
  assert.match(w.steps[1].t, /clock \(top left\) is <b>paused<\/b>/, 'and in the step title, which the compact phone card shows');
  assert.deepEqual(BEATS.slice(1, 4).map((b) => b.title), ['Turn over Unit 107', 'Rent-ready units can lease', 'Money without a spreadsheet']);
  assert.deepEqual(BEATS.slice(1, 4).map((b) => b.steps.length), [4, 3, 2]);
  assert.match(BEATS[1].steps[2].d, /<b>Pause<\/b>/); assert.match(BEATS[1].steps[2].d, /24 real seconds/);
  assert.ok(BEATS.every((b) => b.steps.every((st) => typeof st.t === 'string' && typeof st.d === 'string')), 'step texts stay plain strings');
  // Act I contract is stated on the break card.
  for (const re of [/make-ready/, /game time/, /Pause/, /leases/, /every month/, /cash alone/, /future/]) assert.match(brk.why, re);
});

test('fail-forward: Unit 107 already rent-ready or leased completes the turnover beat', () => {
  for (const [f, all] of [[(u) => { u.commercial = 'ready'; }, true], [(u) => { u.lease = 'L1'; }, false]]) {
    const sim = makeMaple(3); sim.s.tut.beat = beatIndex('makeready'); sim.s.tut.entered = true; const u = sim.s.objects[sim.s.unitRoles.mapleTurnover];
    assert.equal(curBeat(sim).check(sim), false); f(u); assert.equal(curBeat(sim).check(sim), true);
    if (all) assert.equal(stepState(sim, { tab: null, sel: null }).all, true, 'every step reads complete');
    tutorialTick(sim); assert.equal(curBeat(sim).id, 'lease', 'advances on the next tick (existing behaviour)');
  }
});

test('fail-forward: Business already open skips Open Business (money and Beat 5)', () => {
  const sim = makeMaple(3);
  sim.s.tut.beat = beatIndex('money'); sim.s.tut.flags.businessOpened = true; assert.equal(stepState(sim, { tab: 'business', sel: null }).cur, 1);
  sim.s.tut.beat = beatIndex('pricing'); assert.equal(stepState(sim, { tab: 'business', sel: null }).cur, 1, 'Business showing: choose Pricing');
});

test('fail-forward: Pricing opened during the money beat counts (the production UI records it on any beat)', () => {
  const sim = makeMaple(3); sim.s.tut.beat = beatIndex('money'); sim.s.tut.entered = true; tutorialTick(sim);
  const ui = Object.create(UI.prototype); ui.g = { sim, audio: { play() {} } }; ui.tab = 'business'; ui.$ = () => ({ querySelector: () => null });
  ui.do = (a) => sim.dispatch(a); ui.jumpSection('Asking rents');
  assert.equal(sim.s.tut.flags.pricingSeen, true); assert.deepEqual(ui.sectionChoice, { tab: 'business', label: 'Asking rents' });
  ui.jumpSection('Collections'); ui.tab = 'operate'; ui.jumpSection('Asking rents'); // other sections and tabs never count
  sim.s.tut.flags.businessOpened = true; sim.s.tut.flags.moneyAck = true; tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'pricing'); assert.equal(stepState(sim, { tab: null, sel: null }).cur, 2, 'only Got it left'); assert.equal(curBeat(sim).buttonWhen(sim), true);
  // No flag outside an active tutorial.
  const done = makeMaple(4); done.s.tut = { on: false, beat: 99, flags: {}, done: true }; const u2 = Object.create(UI.prototype);
  u2.g = { sim: done }; u2.tab = 'business'; u2.$ = () => ({ querySelector: () => null }); u2.do = (a) => done.dispatch(a); u2.jumpSection('Asking rents');
  assert.deepEqual(done.s.tut.flags, {});
});

test('fail-forward: an asking rent changed early is accepted and never reverted; signed leases keep their rent', () => {
  let key, changed, signed;
  const { sim, s } = play(20261102, { hook: (sim, id) => { if (id === 'makeready') { key = '10x10:std' in sim.s.market.ask ? '10x10:std' : Object.keys(sim.s.market.ask)[0]; changed = sim.s.market.ask[key] + 15; signed = rentsOf(sim.s); assert.equal(sim.dispatch({ type: 'setRent', key, v: changed }).ok, true); } } });
  assert.equal(curBeat(sim).id, 'actI_break'); assert.equal(s.market.ask[key], changed, 'kept through Act I');
  const now = rentsOf(s); for (const [k, r] of Object.entries(signed)) if (k in now) assert.equal(now[k], r, 'signed lease ' + k);
  sim.dispatch({ type: 'tutFlag', flag: 'actI_break' }); tutorialTick(sim); tutorialTick(sim); assert.equal(curBeat(sim).id, 'expand'); assert.equal(s.market.ask[key], changed);
});

test('the break: paused on entry, nothing authored pending, run speeds held, the next act waits for Continue', () => {
  const { sim, s, tick } = play(20261102, { stopAt: 'pricing' });
  s.speed = 4; sim.dispatch({ type: 'tutFlag', flag: 'pricingSeen' }); sim.dispatch({ type: 'tutFlag', flag: 'pricingAck' }); sim.events.length = 0;
  tutorialTick(sim); assert.equal(curBeat(sim).id, 'actI_break'); assert.equal(s.speed, 0, 'paused the moment the break begins');
  assert.deepEqual(sim.events.filter((e) => e.type === 'speed').map((e) => e.v), [0]);
  assert.equal(s.visits.filter((v) => v.keen || v.kind === 'moveout').length, 0, 'no authored visit pending'); assert.equal(s.tasks.filter((t) => t.type !== 'makeready' && t.obj === hallLight(sim).id).length, 0, 'no authored repair pending');
  const tBreak = s.t;
  for (let i = 0; i < 30; i++) { s.speed = 4; tick(); } // any run speed is put back to Pause on the next minute
  assert.equal(s.speed, 0); assert.ok(s.t - tBreak <= 30, 'at most a minute per forced step'); assert.equal(curBeat(sim).id, 'actI_break');
  assert.equal(s.tut.entered, true); const lightBefore = hallLight(sim).cond;
  assert.equal(s.tut.flags.actI_break, undefined); assert.equal(hallLight(sim).cond, lightBefore);
  sim.dispatch({ type: 'tutFlag', flag: 'actI_break' }); sim.events.length = 0;
  tutorialTick(sim); assert.equal(curBeat(sim).id, 'expand'); assert.equal(s.tut.entered, false, 'expand not entered yet');
  tutorialTick(sim); assert.equal(s.tut.entered, true); assert.equal(sim.events.filter((e) => e.type === 'tut_beat').length, 1);
  assert.equal(s.speed, 0, 'Continue never starts time');
});

test('owner reviews: held through Act I, released at Continue in saved order, stale ones retired, next act waits', () => {
  let A, B, C;
  const { sim, s } = play(20261102, { hook: (sim, id) => {
    if (id === 'lease') A = ask(sim, 'hA').id;
    if (id === 'money') { const L = hallLight(sim); L.cond = 0.05; sim.markDirty(); B = ask(sim, 'light' + L.id).id; } // a light that gets fixed before the break
    if (id === 'pricing') { C = ask(sim, 'hC').id; const L = hallLight(sim); L.cond = 1; sim.markDirty(); }
  } });
  assert.equal(curBeat(sim).id, 'actI_break'); assert.equal(s.speed, 0);
  assert.deepEqual(sim.heldReviews().map((c) => c.id), [A, B, C], 'all three held, in creation order');
  const before = clone(s.convos); s.speed = 0;
  for (let i = 0; i < 3; i++) { sim.step(); tutorialTick(sim); } assert.deepEqual(sim.heldReviews().map((c) => c.id), [A, B, C], 'still held on the break card');
  assert.ok(!s.tut.flags.def_hA && !s.tut.flags.def_hC, 'no default ran');
  const mgr = s.mgrLog.length;
  sim.dispatch({ type: 'tutFlag', flag: 'actI_break' }); tutorialTick(sim);
  assert.deepEqual(s.convos.filter((c) => c.released).map((c) => c.id), [A, C], 'actionable ones released, order kept');
  assert.ok(!s.convos.some((c) => c.id === B), 'the fixed light is retired'); assert.ok(s.mgrLog.slice(0, s.mgrLog.length - mgr + 1).some((m) => /No longer needed/.test(m.msg)));
  assert.equal(sim.heldReviews().length, 0); assert.equal(sim.releasedPending(), 2);
  for (const id of [A, C]) { const was = before.find((c) => c.id === id), now = s.convos.find((c) => c.id === id); assert.equal(now.text, was.text); assert.deepEqual(now.actions, was.actions); }
  assert.ok(!s.tut.flags.def_hA && !s.tut.flags.def_hC, 'released without a decision or default');
  for (let i = 0; i < 5; i++) { s.speed = 2; sim.step(); tutorialTick(sim); }
  assert.equal(curBeat(sim).id, 'actI_break', 'the next act waits for the released reviews'); assert.equal(s.speed, 0); assert.equal(stepState(sim, { tab: null, sel: null }).cur, 1, 'card: answer the waiting requests');
  assert.equal(sim.dispatch({ type: 'convo', id: A, i: 1 }).ok, true); tutorialTick(sim); assert.equal(curBeat(sim).id, 'actI_break');
  assert.equal(sim.dispatch({ type: 'convo', id: C, i: 1 }).ok, true); tutorialTick(sim); tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'expand'); assert.equal(s.tut.entered, true); assert.equal(s.speed, 0, 'time still paused');
  const D = ask(sim, 'hD'); assert.equal(sim.reviewHeld(D), true, 'Act II reviews are held again');
});

test('reload at the break: before Continue, and with released reviews still waiting', () => {
  let A;
  const { sim, s } = play(20261102, { hook: (sim, id) => { if (id === 'pricing') A = ask(sim, 'hA').id; } });
  const r1 = new Sim(clone(s)); assert.equal(curBeat(r1).id, 'actI_break'); assert.equal(r1.s.tut.beatId, 'actI_break'); assert.equal(r1.s.speed, 0);
  assert.deepEqual(r1.heldReviews().map((c) => c.id), [A]); tutorialTick(r1); assert.equal(curBeat(r1).id, 'actI_break'); assert.equal(r1.s.speed, 0);
  sim.dispatch({ type: 'tutFlag', flag: 'actI_break' }); tutorialTick(sim);
  const r2 = new Sim(clone(s)); installTutorial(r2); assert.equal(r2.releasedPending(), 1); tutorialTick(r2); assert.equal(curBeat(r2).id, 'actI_break');
  r2.dispatch({ type: 'convo', id: A, i: 1 }); tutorialTick(r2); tutorialTick(r2); assert.equal(curBeat(r2).id, 'expand'); assert.equal(r2.s.speed, 0);
  assert.equal(JSON.stringify(new Sim(clone(s)).s), JSON.stringify(s), 'load is an identity at the break');
});

test('old expand saves: no row ordered -> Beat 5 (entered fresh, nothing completed); row ordered or expansion open -> expand', () => {
  const { sim } = play(20261102, { stopAt: 'pricing' });
  const old = (patch) => { const st = clone(sim.s); st.tut.beatId = 'expand'; st.tut.beat = 4; st.tut.beatAt = 4; st.tut.entered = true; delete st.tut.flags.pricingSeen; delete st.tut.flags.pricingAck; patch && patch(st); return new Sim(st); };
  const a = old(); assert.equal(curBeat(a).id, 'pricing', 'read-only resolve'); tutorialTick(a);
  assert.equal(a.s.tut.beatId, 'pricing'); assert.equal(a.s.tut.beat, 4); assert.equal(a.s.tut.beatAt, 4); assert.equal(a.s.tut.entered, true); assert.equal(a.events.filter((e) => e.type === 'tut_beat').length, 1, 'Beat 5 entered');
  assert.ok(!a.s.tut.flags.pricingSeen && !a.s.tut.flags.pricingAck && !a.s.tut.flags.actI_break, 'no completion fabricated');
  tutorialTick(a); assert.equal(a.s.tut.beatId, 'pricing', 'stable on later ticks');
  const b = old((st) => { st.tut.built = [{ tool: 'du10x10', f: 0, id: st.tut.idMark || 0 }]; }); tutorialTick(b); assert.equal(b.s.tut.beatId, 'expand'); assert.equal(b.s.tut.beat, EXPAND); assert.equal(b.s.tut.entered, true);
  const c = old((st) => { st.milestones.first_expansion = st.t; }); tutorialTick(c); assert.ok(['expand', 'repair'].includes(c.s.tut.beatId)); assert.ok(tutBeatIndex(c.s) >= EXPAND);
  // A save from before beat ids at old position 4 behaves the same.
  const d = old((st) => { delete st.tut.beatId; delete st.tut.beatAt; }); assert.equal(d.s.tut.beatId, 'expand'); assert.equal(curBeat(d).id, 'pricing'); tutorialTick(d); assert.equal(d.s.tut.beatId, 'pricing');
  // Other saved ids keep their beat at its new position.
  for (const [id, at] of [['repair', 5], ['hire', 6], ['grad', 7], ['money', 3]]) { const st = clone(sim.s); st.tut.beatId = id; st.tut.beat = at; st.tut.beatAt = at; const r = new Sim(st); assert.equal(r.s.tut.beatId, id); assert.equal(r.s.tut.beat, beatIndex(id)); }
});

test('graduated and sentinel saves are untouched', () => {
  for (const tut of [{ on: false, beat: 8, flags: { grad: true }, done: true, gradDay: 12, idMark: 400 }, { on: false, beat: 99, flags: {}, done: true }]) {
    const st = clone(makeMaple(9).s); st.tut = clone(tut); st.speed = 2; const r = new Sim(st); tutorialTick(r);
    assert.deepEqual(r.s.tut, tut); assert.equal(r.s.speed, 2); assert.equal(curBeat(r), null);
  }
});

test('production UI: the break card, run speeds held, Continue, then the request flow, all paused', () => {
  let A;
  const { sim, s } = play(20261102, { stopAt: 'pricing', hook: (sim, id) => { if (id === 'money') A = ask(sim, 'hA').id; } });
  installTutorial(sim);
  const ui = Object.create(UI.prototype), box = { innerHTML: '' };
  ui.g = { sim, audio: { unlock() {}, play() {} }, rend: { setFocus() {}, setSelection() {}, view: 'ext', lookAt() {} } }; ui.title = false; ui.tutMin = true; ui.tutWhy = false;
  ui.$ = () => box; ui.root = { querySelector: () => null, querySelectorAll: () => [] }; ui.sfx = () => {}; ui.toasts = []; ui.renderSheet = () => {}; ui.tab = 'business'; ui.sel = null;
  s.speed = 4; sim.dispatch({ type: 'tutFlag', flag: 'pricingSeen' }); sim.dispatch({ type: 'tutFlag', flag: 'pricingAck' }); sim.events.length = 0;
  sim.poll(); sim.poll(); for (const e of sim.events) ui.onEvent(e); sim.events.length = 0;
  assert.equal(curBeat(sim).id, 'actI_break'); assert.equal(ui.tab, null, 'the open Business panel is closed'); assert.equal(s.speed, 0);
  const html = box.innerHTML;
  assert.match(html, /Act I · Take Over · Chapter break/); assert.match(html, /<h4>You have control of Maple Street<\/h4>/); assert.match(html, /Act II · Stabilize/);
  assert.match(html, /data-a="tutNext">Continue<\/button>/); assert.doesNotMatch(html, /data-a="tutSkip"/); assert.doesNotMatch(html, /data-a="tutMin"/);
  assert.match(html, /class="tut[^"]* final break/); assert.match(html, /1 owner request is waiting\. It will appear after you tap Continue\./);
  ui.requestSpeed(4); assert.equal(s.speed, 0); assert.equal(curBeat(sim).id, 'actI_break'); ui.requestSpeed(1); assert.equal(s.speed, 0);
  ui.onClick({ target: { closest: () => ({ dataset: { a: 'tutNext' } }) } });
  assert.equal(s.tut.flags.actI_break, true); assert.equal(sim.releasedPending(), 1); assert.equal(curBeat(sim).id, 'actI_break');
  assert.match(box.innerHTML, /Answer the waiting owner requests/); assert.doesNotMatch(box.innerHTML, /data-a="tutNext"/);
  assert.equal(sim.reviewHeld(s.convos.find((c) => c.id === A)), false, 'shown through the normal request flow');
  sim.dispatch({ type: 'convo', id: A, i: 1 }); sim.poll(); sim.poll(); for (const e of sim.events) ui.onEvent(e); ui.renderTut(true);
  assert.equal(curBeat(sim).id, 'expand'); assert.equal(s.speed, 0); assert.equal(ui.popupResume ?? 0, 0, 'nothing will restore a run speed');
  assert.match(box.innerHTML, /Add Capacity · Part 6 of 9/); assert.match(box.innerHTML, /data-a="tutSkip"/);
});

test('Act I is deterministic: twin runs to the break give identical events and state', () => {
  const la = [], lb = []; const A = play(4242, { log: la }), B = play(4242, { log: lb });
  assert.equal(la.length, lb.length); assert.deepEqual(la, lb); assert.equal(JSON.stringify(A.s), JSON.stringify(B.s));
  assert.ok(la.filter((e) => /"tut_done"/.test(e)).length === ACT1.length);
});

console.log(`${passed} Act I checks passed`);
