// Campaign Unit 7c: Act IV Beat 15 "Can Maple afford to build up?" (D3 Option 2, P1 inspection-only) and the Act IV
// chapter break. Focus: the live quote of the unbuilt upper-floor route and the money, demand and ways to pay, all read
// from the current state; a read-only review that must be opened before the decision; Continue without borrowing completes
// it with no penalty and no state change; no borrowing, debt, draw or build is possible or dispatched; the tutorial loan
// lock holds; the break pauses and releases held reviews before graduation; manual Pause; save/reload; old saves.
// Fixture: the ordinary Day 18 Act III break (recorded 54-action replay), Beats 13-14 played with real actions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { UI } from '../../js/ui.js';
import { BEATS, beatIndex, beatHeader, curBeat, stepState, tutorialTick, installTutorial, financingReview, syncTutBeat } from '../../js/tutorial.js';
import { upRouteQuote } from '../../js/blueprint.js';
import { creditNeeded, outlook } from '../../js/finance.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
const quiet = (sim) => { sim.events.length = 0; };
const until = (sim, fn, max = 1440 * 10) => { for (let i = 0; i < max && !fn(); i++) { sim.step(); quiet(sim); } assert.ok(fn(), 'expected state reached'); };
const fromJSON = (j) => { const c = new Sim(JSON.parse(j)); c.ensure(); installTutorial(c); return c; };
const idle = (sim) => !sim.s.orders.some((o) => o.st === 'construction');
const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/ ([.,;:])/g, '$1');
const sgn = (v) => (v < 0 ? '-' : '') + usd(Math.abs(v));

// Day 18 break -> Beat 13 (structure-only Go Vertical + F2 hall, light, unit) -> Beat 14 (returned payment, Collections
// inspected, Got it) -> Beat 15 entered, paused.
function beat15() {
  const sim = makeMaple(TRACE.seed); installTutorial(sim); const s = sim.s;
  for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); quiet(sim); } sim.dispatch(x.a); quiet(sim); }
  until(sim, () => s.tut.beatId === 'actIII_break' && s.tut.entered, 2000);
  sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim);
  const sh = sim.objs('shell')[0], q = sim.verticalPlan(sh.id, { fitout: false });
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: sh.id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  for (const a of [{ tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'iu5x10', a: { x: 18, y: 5 }, b: { x: 18, y: 5 }, f: 1, axis: 'y' }]) { assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true); until(sim, () => idle(sim)); }
  until(sim, () => curBeat(sim).id === 'collections'); s.speed = 4; until(sim, () => s.tut.flags.act4Account != null);
  sim.dispatch({ type: 'tutFlag', flag: 'act4Seen' }); sim.dispatch({ type: 'tutFlag', flag: 'collAck' }); tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'financing'); s.speed = 0; tutorialTick(sim); quiet(sim); assert.equal(s.tut.entered, true);
  return JSON.stringify(s);
}
const B15 = beat15();
const at15 = () => fromJSON(B15);
// The production UI with the DOM replaced by string boxes (geometry is checked by the browser walk).
function makeUI(sim) {
  const boxes = { tut: { innerHTML: '' }, modal: { innerHTML: '', get firstChild() { return this.innerHTML ? {} : null; }, querySelector: () => null } };
  const u = Object.create(UI.prototype);
  u.g = { sim, audio: { unlock() {}, play() {} }, rend: { setFocus() {}, setSelection() {}, setPreview() {}, setView(v) { this.view = v; }, view: 'ext', lookAt() {} } };
  Object.assign(u, { title: false, tutMin: true, tutWhy: false, toasts: [], tab: null, sel: null, tool: null, plan: null, verticalReview: null, popupBlocks: new Set() });
  u.$ = (id) => boxes[id] || { innerHTML: '', querySelector: () => null, firstChild: null };
  u.root = { querySelector: () => null, querySelectorAll: () => [], classList: { toggle() {}, remove() {}, contains() { return false; } } };
  for (const k of ['sfx', 'renderSheet', 'renderActionBar', 'syncFloorUi', 'currentBlueprintPlan', 'syncPopupProperty']) u[k] = () => null;
  u.resolveStep = (st) => st; u.phone = () => true; u.modalOpen = () => !!boxes.modal.innerHTML;
  return { u, boxes };
}
const card = (sim) => { const { u, boxes } = makeUI(sim); u.renderTut(true); return boxes.tut.innerHTML; };
const money = (sim) => ({ cash: sim.s.cash, ledger: sim.s.ledger.length, debt: JSON.stringify(sim.s.debt), loan: JSON.stringify(sim.s.loan), orders: sim.s.orders.length, objs: Object.keys(sim.s.objects).length, leases: JSON.stringify(sim.s.leases) });

test('Act IV order and headers: Beat 15 after Beat 14, then the paused Act IV break, then graduation (Part 16 of 16)', () => {
  const ids = BEATS.map((b) => b.id), f = beatIndex('financing'), k = beatIndex('actIV_break');
  assert.deepEqual(ids.slice(beatIndex('actIII_break')), ['actIII_break', 'vertical', 'collections', 'financing', 'actIV_break', 'grad']);
  assert.equal(beatHeader(f), 'Act IV · Grow · Beat 15'); assert.equal(beatHeader(k), 'Act IV · Grow · Chapter break'); assert.equal(beatHeader(beatIndex('grad')), 'Graduation · Part 16 of 16');
  const b = BEATS[k]; assert.equal(b.pause, true); assert.equal(b.brk, true); assert.equal(b.next, 'Graduation'); assert.match(b.body, /Maple Street is paused/);
  assert.equal(BEATS[beatIndex('actIII_break')].next, 'Act IV · Grow'); assert.ok(!BEATS[f].pause, 'Beat 15 itself never pauses or runs time');
});
test('live figures: the card and the review read the current quote, position, credit, loan terms and 30-day schedule', () => {
  const sim = at15(), R = financingReview(sim), q = upRouteQuote(sim), ctx = { spend: q.total, extraDaily: q.dailyCost };
  assert.equal(R.ok, true); assert.deepEqual(R.q, q); assert.equal(q.total, 19101, 'fixture oracle only');
  assert.deepEqual(R.now, sim.financialPosition()); assert.deepEqual(R.after, sim.financialPosition(ctx)); assert.equal(R.gap, Math.max(0, Math.round(-R.after.available * 100) / 100));
  assert.ok(R.gap > 0, 'on this fixture the route does not fit with the reserve'); assert.equal(R.credit.needed, creditNeeded(sim, ctx)); assert.deepEqual(R.saving, outlook(sim));
  const c = fromJSON(B15); c.s.tut.done = true; c.s.tut.on = false; assert.equal(R.loan.limit, c.loanLimit()); assert.equal(R.loan.amount, Math.max(5000, Math.ceil(R.gap / 5000) * 5000));
  assert.equal(R.loan.pmt, c.loanPmt(R.loan.amount, R.loan.rate, R.loan.months)); assert.equal(R.loan.lockedHere, true);
  const html = card(sim); assert.ok(plain(html).includes(`Review the upper-floor project Upper-floor route ${usd(q.total)} · available ${usd(R.now.available)} · ${usd(R.gap)} short`), plain(html));
  // a cheaper state (a building already reinforced is not this route; use more cash): the line follows the state
  const rich = at15(); rich.s.cash += 30000; const R2 = financingReview(rich); assert.equal(R2.gap, 0); assert.doesNotMatch(plain(card(rich)), /short/);
});
test('inspection before the decision: no Continue until the review was opened; Continue alone never completes', () => {
  const sim = at15(); let html = card(sim);
  assert.match(html, /data-a="finReview">Review the project<\/button>/); assert.doesNotMatch(html, /data-a="tutNext"/);
  // The phone card starts collapsed and a collapsed card shows only its primary action (shipped CSS): before the review that
  // action is Review the project; afterwards it is Continue without borrowing, and the review stays reopenable from Details.
  const CSS = readFileSync(new URL('../../css/game.css', import.meta.url), 'utf8'); assert.match(CSS, /\.tut\.min \.tut-actions > :not\(\.pri\) \{ display: none; \}/);
  assert.match(html, /<button class="btn sm pri" data-a="finReview">/); assert.equal((html.match(/class="btn[^"]*\bpri\b/g) || []).length, 1, 'one primary action');
  sim.dispatch({ type: 'tutFlag', flag: 'finAck' }); tutorialTick(sim); assert.equal(curBeat(sim).id, 'financing', 'no decision without the review');
  delete sim.s.tut.flags.finAck; const { u } = makeUI(sim); u.showFinancingReview(); assert.equal(sim.s.tut.flags.finSeen, true);
  assert.equal(stepState(sim, u).cur, 1); html = card(sim); assert.match(html, /data-a="tutNext">Continue without borrowing<\/button>/); assert.match(html, /<button class="btn sm" data-a="finReview">/, 'the review can be reopened (secondary)');
  assert.equal((html.match(/class="btn[^"]*\bpri\b/g) || []).length, 1, 'one primary action: Continue');
  tutorialTick(sim); assert.equal(curBeat(sim).id, 'financing', 'the review alone does not complete');
});
test('the review is read-only and complete: project rows, money, demand evidence, credit line, term-loan quote only, saving, decline; no Confirm, draw, loan or build control', () => {
  const sim = at15(), before = JSON.stringify(sim.s), m0 = money(sim), { u, boxes } = makeUI(sim), R = financingReview(sim);
  const spy = []; const d0 = sim.dispatch.bind(sim); sim.dispatch = (a) => { spy.push(a.type); return d0(a); };
  u.showFinancingReview(); const h = boxes.modal.innerHTML, t = plain(h);
  assert.deepEqual(money(sim), m0); assert.deepEqual(spy, ['tutFlag'], 'only the inspection flag');
  const after = JSON.parse(JSON.stringify(sim.s)), b0 = JSON.parse(before); delete after.tut.flags.finSeen; assert.equal(JSON.stringify(after), JSON.stringify(b0), 'nothing else changed');
  for (const sec of ['The project', 'Maple’s money', 'Demand', 'Ways to pay', 'Credit line', 'Term loan (quote only)', 'Save up', 'Decline for now']) assert.ok(t.includes(sec), sec);
  assert.ok(t.includes(`Total ${usd(R.q.total)}`)); assert.ok(t.includes(`Available after this project ${sgn(R.after.available)}`), t);
  assert.ok(t.includes(`${usd(R.gap)} short of its reserve`)); assert.ok(t.includes(R.demand.text.replace(/\s+/g, ' ').slice(0, 40)));
  assert.ok(t.includes(`${usd(R.loan.amount)} over ${R.loan.months} months`)); assert.ok(t.includes('Term loans open after the tutorial; nothing can be borrowed here'));
  assert.ok(/cannot cover this|draw would cover it|Not needed/.test(t)); assert.ok(t.includes('This is a schedule, not a promise'));
  assert.match(t, /Act IV · Grow · Beat 15 · Step 2 of 2/); assert.match(h, /data-a="finDecline"/);
  assert.doesNotMatch(h, /data-a="(borrow|termLoanReview|termLoanConfirm|creditReview|creditConfirm|build|confirm|verticalConfirm)"/); assert.doesNotMatch(t, /\b(is|are|would be) profitable|will rent|guaranteed? (profit|return|income)/i, "no profitability claim");
});
test('decline: Continue without borrowing completes Beat 15 with no penalty: money, debt, leases and build state unchanged; lesson marked done', () => {
  const sim = at15(), { u, boxes } = makeUI(sim); u.g.saveStartup = false; u.closeModal = UI.prototype.closeModal; u.showFinancingReview(); const m0 = money(sim), rep = sim.s.rep, sat = JSON.stringify(sim.s.tenants);
  const click = (a) => u.onClick({ target: { closest: () => ({ dataset: { a } }) } });
  click('finDecline'); assert.equal(sim.s.tut.flags.finAck, true, 'the review’s Continue without borrowing'); assert.equal(boxes.modal.innerHTML, '', 'review closed'); tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'actIV_break'); assert.deepEqual(money(sim), m0); assert.equal(sim.s.rep, rep); assert.equal(JSON.stringify(sim.s.tenants), sat);
  assert.equal(sim.s.debt.length, 0); assert.equal(sim.loanLimit(), 0); assert.equal(sim.s.lessonsDone.financing, sim.day);
});
test('P1 inspection-only: the tutorial loan lock holds before, during and after Beat 15; a borrow attempt is refused and creates no debt', () => {
  const sim = at15(); assert.equal(sim.loanLimit(), 0);
  const r = sim.dispatch({ type: 'borrow', amt: 20000 }); assert.equal(r.ok, false); assert.match(r.msg, /Term loans open after the tutorial/); assert.equal(sim.s.debt.length, 0);
  financingReview(sim); assert.equal(sim.loanLimit(), 0); assert.equal(sim.s.tut.done, false); assert.equal(sim.s.tut.on, true);
});
test('no tutorial dispatch: ticks through Beat 15, the review and the decline dispatch nothing but tutorial flags', () => {
  const sim = at15(), spy = []; const d0 = sim.dispatch.bind(sim); sim.dispatch = (a) => { spy.push(a.type); return d0(a); };
  for (let i = 0; i < 1440; i++) { sim.s.speed = 4; sim.step(); quiet(sim); }
  const { u } = makeUI(sim); u.showFinancingReview(); sim.dispatch({ type: 'tutFlag', flag: 'finAck' }); tutorialTick(sim);
  assert.ok(spy.every((t) => t === 'tutFlag' || t === 'speed'), spy.join(','));
});
test('Act IV break: paused, Continue releases held owner reviews, then graduation (paused)', () => {
  const sim = at15(); sim.s.speed = 4; sim.convo({ key: 'u7c', who: 'Tester', sev: 'attention', ttl: 60, def: 0, text: 'Held review', actions: [{ label: 'OK' }] });
  const c = sim.s.convos.find((x) => x.key === 'u7c'); assert.equal(sim.reviewHeld(c), true);
  Object.assign(sim.s.tut.flags, { finSeen: true, finAck: true }); tutorialTick(sim); assert.equal(curBeat(sim).id, 'actIV_break');
  tutorialTick(sim); assert.equal(sim.s.speed, 0, 'the break holds Pause'); sim.s.speed = 4; tutorialTick(sim); assert.equal(sim.s.speed, 0);
  assert.match(plain(card(sim)), /You are managing Maple Street now/); assert.match(card(sim), /Continue<\/button>/);
  sim.dispatch({ type: 'tutFlag', flag: 'actIV_break' }); tutorialTick(sim);
  const held = sim.s.convos.find((x) => x.key === 'u7c'); assert.ok(held && held.released, 'released after Continue'); assert.equal(curBeat(sim).id, 'actIV_break', 'waits for the released review');
  sim.dispatch({ type: 'convo', id: held.id, i: 0 }); tutorialTick(sim); assert.equal(curBeat(sim).id, 'grad'); tutorialTick(sim); assert.equal(sim.s.speed, 0);
});
test('manual Pause: Beat 15 and its review never start time; a running game pauses for the review and returns to its speed', () => {
  const sim = at15(); for (let i = 0; i < 5; i++) tutorialTick(sim); assert.equal(sim.s.speed, 0);
  const { u } = makeUI(sim); u.showFinancingReview(); assert.equal(sim.s.speed, 0); u.closeModal(); assert.equal(sim.s.speed, 0, 'closing never starts time');
  const run = at15(); run.s.speed = 4; const r = makeUI(run); r.u.showFinancingReview(); assert.equal(run.s.speed, 0, 'paused while reviewing'); r.u.closeModal(); assert.equal(run.s.speed, 4, 'returns to the chosen speed');
});
test('save/reload: before the review it must be opened again; after it the flag persists, the quote is recomputed identically, and Continue completes', () => {
  const sim = at15(); const r1 = fromJSON(JSON.stringify(sim.s)); assert.equal(stepState(r1, makeUI(r1).u).cur, 0); assert.doesNotMatch(card(r1), /data-a="tutNext"/);
  makeUI(r1).u.showFinancingReview(); const j = JSON.stringify(r1.s), r2 = fromJSON(j);
  assert.equal(JSON.stringify(r2.s), j); assert.equal(r2.s.tut.flags.finSeen, true); assert.deepEqual(financingReview(r2).q, financingReview(r1).q);
  assert.ok(!/"quote"|"upRoute"/.test(j), 'no quote is saved'); r2.dispatch({ type: 'tutFlag', flag: 'finAck' }); tutorialTick(r2); assert.equal(curBeat(r2).id, 'actIV_break');
  const r3 = fromJSON(JSON.stringify(r2.s)); tutorialTick(r3); assert.equal(curBeat(r3).id, 'actIV_break'); assert.equal(r3.s.speed, 0);
});
test('old saves: an Act III-era graduation save still resumes at the Act III break; a Unit 7b-era save on Beat 14 resumes there and continues to Beat 15', () => {
  const t = { on: true, done: false, beat: 15, beatId: 'grad', beatAt: 15, entered: true, flags: { actIII_break: true } }; syncTutBeat(t); assert.equal(t.beatId, 'actIII_break');
  const b = fromJSON(B15); const C = beatIndex('collections'); Object.assign(b.s.tut, { beat: 16, beatAt: 16, beatId: 'collections', entered: true }); delete b.s.tut.flags.finSeen;
  assert.equal(curBeat(b).id, 'collections'); tutorialTick(b); assert.equal(curBeat(b).id, 'financing'); assert.equal(C, 16);
});
test('no route to price: the card drops the figures, the review says so honestly, and declining still completes', () => {
  const sim = at15(); const P = sim.s.parcel; Object.assign(P, { x1: P.x0 + 6, y1: P.y0 + 6 }); sim.ensure();
  const R = financingReview(sim); assert.equal(R.ok, false); assert.doesNotMatch(card(sim), /tut-fin-money/);
  const { u, boxes } = makeUI(sim); u.showFinancingReview(); assert.match(plain(boxes.modal.innerHTML), /nothing to finance\. Continue without borrowing/);
  sim.dispatch({ type: 'tutFlag', flag: 'finAck' }); tutorialTick(sim); assert.equal(curBeat(sim).id, 'actIV_break');
});
console.log(`${passed} Act IV Beat 15 checks passed`);
