// Campaign Unit 3: paused graduation. Entering the graduation beat pauses time (sim-side, so headless runs and saves
// agree) and keeps it paused; the card says "Maple Street is yours" with Finish tutorial; a run speed cannot dismiss it;
// Finish closes the tutorial with time still paused and no earlier run speed restored; held owner reviews appear only
// after Finish, with time still paused. Also: reload on the card, graduated legacy saves, and skip cleanup.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { BEATS, beatIndex, curBeat, tutorialTick, installTutorial } from '../../js/tutorial.js';
import { UI } from '../../js/ui.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844; // phone viewport for the card layout paths
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const GRAD = beatIndex('grad');
// A tutorial on the hire beat with a porter hired: the next tutorial tick completes it and enters graduation.
function atHire(speed = 4) {
  const sim = makeMaple(77), s = sim.s; s.cash = 1e6; s.open = true;
  s.tut.beat = beatIndex('hire'); s.tut.entered = true; tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'hire');
  assert.equal(sim.dispatch({ type: 'hire', role: 'porter' }).ok, true); s.milestones.first_delegated = s.t; // the porter's first job, as in play
  s.speed = speed; sim.events.length = 0; return sim;
}
const atGrad = (speed = 4) => { const sim = atHire(speed); tutorialTick(sim); assert.equal(curBeat(sim).id, 'grad'); return sim; };
const finish = (sim) => { sim.dispatch({ type: 'tutFlag', flag: 'grad' }); tutorialTick(sim); };
const ask = (sim, key) => { sim.convo({ key, who: 'Tester', sev: 'attention', ttl: 60, def: 0, text: 'Test ' + key, actions: [{ label: 'Default', action: { type: 'tutFlag', flag: 'def_' + key } }, { label: 'Other' }] }); return sim.s.convos.find((c) => c.key === key); };
// A UI with just enough DOM to run the production speed, popup and tutorial-card paths.
function uiFor(sim) {
  installTutorial(sim); // as main.js does for every played property
  const ui = Object.create(UI.prototype), box = { innerHTML: '' };
  ui.g = { sim, audio: { unlock() {} }, rend: { setFocus() {}, view: 'ext' } }; ui.title = false; ui.tutMin = true; ui.tutWhy = false;
  ui.$ = () => box; ui.root = { querySelector: () => null, querySelectorAll: () => [] };
  ui.sfx = () => {}; ui.toasts = []; ui.renderTutBox = box;
  return ui;
}

test('the final card is "Maple Street is yours" with Finish tutorial, never Keep playing', () => {
  const b = BEATS[GRAD]; assert.equal(b.id, 'grad'); assert.equal(GRAD, BEATS.length - 1);
  assert.equal(b.title, 'Maple Street is yours'); assert.equal(b.button, 'Finish tutorial'); assert.equal(b.pause, true);
  assert.match(b.body, /Maple Street is paused/); assert.match(b.body, /start the clock when you’re ready/);
  for (const x of BEATS) { assert.ok(!/Keep playing/.test(JSON.stringify(x) + x.steps.map((st) => st.t + st.d).join(''))); }
  assert.equal(BEATS.filter((x) => x.pause).length, 1, 'only graduation pauses');
});

for (const v of [1, 2, 4]) test(`graduation reached at ${v}x pauses the sim the moment it begins`, () => {
  const sim = atHire(v); tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'grad'); assert.equal(sim.s.speed, 0);
  assert.ok(sim.events.some((e) => e.type === 'speed' && e.v === 0));
  tutorialTick(sim); assert.equal(sim.s.tut.entered, true); assert.equal(sim.s.speed, 0);
});

test('while the card is up, time cannot run: any run speed is held at Pause', () => {
  const sim = atGrad();
  for (const v of [1, 2, 4]) { sim.dispatch({ type: 'speed', v }); tutorialTick(sim); assert.equal(sim.s.speed, 0); }
  const before = sim.s.t; sim.poll(); assert.equal(sim.s.t, before);
});

test('Finish tutorial closes the tutorial with time still paused and no speed restored', () => {
  const sim = atGrad(4); finish(sim);
  const t = sim.s.tut; assert.equal(t.done, true); assert.equal(t.on, false); assert.equal(t.beat, BEATS.length);
  assert.equal(t.beatId, undefined); assert.equal(t.beatAt, undefined); assert.ok(sim.s.milestones.graduated);
  assert.equal(sim.s.speed, 0); assert.equal(curBeat(sim), null);
  sim.s.speed = 2; tutorialTick(sim); assert.equal(sim.s.speed, 2, 'after graduation the player owns the clock');
});

test('UI: Pause is selected, a run speed keeps the card up, and Finish never restores the earlier speed', () => {
  const sim = atHire(4), ui = uiFor(sim);
  ui.pauseForPopup('panel'); assert.equal(ui.popupResume, 4, 'a panel opened while running would restore 4x');
  tutorialTick(sim); ui.renderTut(true);
  assert.equal(sim.s.speed, 0); assert.equal(ui.tutMin, false); assert.ok(ui.popupBlocks.has('tutorial')); assert.equal(ui.popupResume, 0);
  assert.match(ui.renderTutBox.innerHTML, /Maple Street is yours/); assert.match(ui.renderTutBox.innerHTML, /class="tut  has-btn final"/); assert.match(ui.renderTutBox.innerHTML, /<p class="intro">[^<]*Maple Street from a property[^]*Maple Street is paused/); assert.match(ui.renderTutBox.innerHTML, /data-a="tutNext">Finish tutorial/);
  assert.ok(!/data-a="tutSkip"/.test(ui.renderTutBox.innerHTML), 'no Skip on the final card'); assert.ok(!/data-a="tutMin"/.test(ui.renderTutBox.innerHTML), 'the final card cannot be minimized');
  for (const v of [1, 2, 4]) { ui.requestSpeed(v); assert.equal(sim.s.speed, 0); assert.ok(curBeat(sim)); assert.equal(ui.tutMin, false); }
  ui.onClick({ target: { closest: () => ({ dataset: { a: 'tutNext' } }) } });
  ui.renderTut(true); ui.resumePopup('panel');
  assert.equal(sim.s.tut.done, true); assert.equal(curBeat(sim), null); assert.equal(sim.s.speed, 0); assert.equal(ui.popupBlocks.size, 0);
  ui.requestSpeed(2); assert.equal(sim.s.speed, 2, 'the player then chooses a speed');
});

test('UI: a manual Pause before graduation stays paused through the card and Finish', () => {
  const sim = atHire(0), ui = uiFor(sim); tutorialTick(sim); ui.renderTut(true);
  assert.equal(sim.s.speed, 0); ui.onClick({ target: { closest: () => ({ dataset: { a: 'tutNext' } }) } }); ui.renderTut(true);
  assert.equal(sim.s.tut.done, true); assert.equal(sim.s.speed, 0);
});

test('held owner reviews wait through the card and appear only after Finish, with time still paused', () => {
  const sim = atHire(4), early = ask(sim, 'h1'); sim.convoTick(); assert.ok(early.heldSince != null);
  tutorialTick(sim); const late = ask(sim, 'h2'); sim.convoTick();
  assert.equal(sim.heldReviews().length, 2, 'held on the graduation card'); assert.equal(sim.s.speed, 0);
  const ui = uiFor(sim); ui.renderTut(true); assert.match(ui.renderTutBox.innerHTML, /2 owner requests are waiting\. They will appear after you finish the tutorial/);
  ui.onClick({ target: { closest: () => ({ dataset: { a: 'tutNext' } }) } }); ui.renderTut(true);
  assert.equal(sim.s.tut.done, true); assert.equal(sim.heldReviews().length, 0);
  assert.deepEqual(sim.s.convos.map((c) => c.key), ['h1', 'h2'], 'both released, in order, none expired or defaulted');
  assert.ok(!sim.s.tut.flags.def_h1 && !sim.s.tut.flags.def_h2); assert.equal(sim.s.speed, 0);
  ui.pauseForPopup('convo'); assert.equal(ui.popupResume, 0); ui.resumePopup('convo'); assert.equal(sim.s.speed, 0, 'answering does not start time');
});

test('a save on the graduation card reloads paused on the card', () => {
  const sim = atGrad(4); const re = new Sim(clone(sim.s));
  assert.equal(curBeat(re).id, 'grad'); assert.equal(re.s.speed, 0); assert.equal(re.s.tut.beatId, 'grad');
  // A save from an older build sitting on the final beat at 4x is paused on its first tutorial tick.
  const old = clone(sim.s); old.speed = 4; delete old.tut.beatId; delete old.tut.beatAt; const o = new Sim(old);
  tutorialTick(o); assert.equal(o.s.speed, 0); assert.equal(curBeat(o).id, 'grad');
  finish(o); assert.equal(o.s.tut.done, true); assert.equal(o.s.speed, 0);
});

test('graduated and sentinel saves are untouched, speed included', () => {
  for (const tut of [{ on: false, beat: 8, flags: { grad: true }, done: true, gradDay: 12, idMark: 400 }, { on: false, beat: 99, flags: {}, done: true }]) {
    const st = clone(makeMaple(5).s); st.tut = clone(tut); st.speed = 4; const sim = new Sim(st);
    tutorialTick(sim); sim.poll(); assert.deepEqual(sim.s.tut, tut); assert.equal(sim.s.speed, 4);
  }
});

test('Skip tutorial leaves no beat id behind (in play, and on an older skipped save once played)', () => {
  const sim = makeMaple(9); tutorialTick(sim); assert.equal(sim.s.tut.beatId, 'welcome');
  sim.s.speed = 4; sim.dispatch({ type: 'tutSkip' }); tutorialTick(sim);
  assert.equal(sim.s.tut.beatId, undefined); assert.equal(sim.s.tut.beatAt, undefined); assert.equal(sim.s.tut.done, true);
  assert.equal(sim.s.speed, 4, 'skipping is not graduation: speed untouched');
  // A save skipped by an older build still carries the id: loading leaves the save as it was, the first tick tidies it.
  const st = clone(sim.s); st.tut.beatId = 'welcome'; st.tut.beatAt = 0; const re = new Sim(st);
  assert.equal(re.s.tut.beatId, 'welcome'); tutorialTick(re); assert.equal(re.s.tut.beatId, undefined); assert.equal(re.s.tut.beatAt, undefined);
  assert.equal(re.s.tut.done, true); assert.equal(re.s.speed, 4);
});

test('graduation reached with the Operate panel open closes the panel so the full card shows', () => {
  const sim = atHire(4), ui = uiFor(sim); let sheets = 0;
  ui.g.rend.setSelection = () => {}; ui.renderSheet = () => { sheets++; }; ui.tab = 'operate'; ui.sel = null; // the hire beat leaves Operate open
  tutorialTick(sim); const entered = sim.events.filter((e) => e.type === 'tut_beat');
  assert.equal(curBeat(sim).id, 'grad'); assert.equal(entered.length, 0, 'entered on the next tick');
  tutorialTick(sim); for (const e of sim.events.filter((x) => x.type === 'tut_beat')) ui.onEvent(e);
  assert.equal(ui.tab, null); assert.equal(ui.sel, null); assert.ok(sheets > 0, 'the sheet was re-rendered closed');
  assert.equal(sim.s.speed, 0); assert.equal(ui.tutMin, false);
  assert.match(ui.renderTutBox.innerHTML, /<h4>Maple Street is yours<\/h4>/); assert.match(ui.renderTutBox.innerHTML, /Maple Street is paused/); assert.match(ui.renderTutBox.innerHTML, /Finish tutorial<\/button>/);
  // Other beats keep their panel: only the pausing graduation beat closes it.
  const other = makeMaple(78), u2 = uiFor(other); u2.g.rend.setSelection = () => {}; u2.renderSheet = () => {}; u2.tab = 'operate';
  tutorialTick(other); for (const e of other.events.filter((x) => x.type === 'tut_beat')) u2.onEvent(e); assert.equal(u2.tab, 'operate');
});

console.log(`${passed} paused graduation checks passed`);
