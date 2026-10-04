import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI } from '../../js/ui.js';
import { makeMaple } from '../../js/maple.js';
import { installTutorial } from '../../js/tutorial.js';
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
function fixture() {
  const sim = makeMaple(); sim.s.tut = { on: false, done: true, flags: {} }; sim.s.mode = 'sandbox'; installTutorial(sim);
  const ui = Object.create(UI.prototype), box = { innerHTML: '', firstChild: null };
  ui.g = { sim, audio: { unlock() {} }, rend: { view: 'ext', overlay: null } };
  ui.$ = () => box; ui.sfx = () => {}; ui.toast = () => {}; ui.renderSheet = () => {}; ui.renderTut = () => {};
  return { sim, ui, box };
}
const click = (ui, a, cmd) => ui.onClick({ target: { closest: () => ({ dataset: { a, cmd: JSON.stringify(cmd) } }) } });
test('successful loan advances financing lesson', () => {
  const { sim, ui } = fixture(); sim.dispatch({ type: 'lesson', op: 'start', id: 'financing' }); assert.equal(sim.s.lesson.id, 'financing');
  click(ui, 'cmd', { type: 'borrow', amt: 10000 }); assert.ok(sim.s.debt.length); assert.equal(sim.s.lesson, null); assert.ok(sim.s.lessonsDone.financing);
});
test('refused loan retains lesson and cash', () => {
  const { sim, ui } = fixture(); sim.dispatch({ type: 'lesson', op: 'start', id: 'financing' }); const cash = sim.s.cash;
  click(ui, 'cmd', { type: 'loan', amt: 99999999 }); assert.equal(sim.s.cash, cash); assert.equal(sim.s.lesson.id, 'financing'); assert.equal(sim.s.debt.length, 0);
});
test('continue without borrowing completes lesson without debt', () => {
  const { sim, ui } = fixture(); sim.dispatch({ type: 'lesson', op: 'start', id: 'financing' }); const cash = sim.s.cash;
  click(ui, 'tutNext'); assert.equal(sim.s.lesson, null); assert.equal(sim.s.cash, cash); assert.equal(sim.s.debt.length, 0);
});
test('held placement stays compact; release restores B+ review without spending', () => {
  const { sim, ui, box } = fixture(); ui.tool = 'du10x10'; ui.plan = { status: 'valid', cost: 2940, count: 3, dur: 720, opex: 0.75, reasons: [], missing: [] };
  const cash = sim.s.cash, bills = sim.committedBills(); ui.buildPlacing = true; ui.renderActionBar();
  assert.match(box.innerHTML, /Lift finger to review/); assert.doesNotMatch(box.innerHTML, /committed bills|data-a="confirm"/);
  ui.finishPlacement(); assert.match(box.innerHTML, /committed bills/); assert.match(box.innerHTML, /Available after bills/); assert.match(box.innerHTML, /data-a="confirm"/);
  assert.equal(sim.s.cash, cash); assert.equal(sim.committedBills(), bills);
});
test('shortcuts expose sections and keep header outside scroll body', () => {
  const { ui } = fixture();
  for (const [title, heading] of [['Business', 'Financing'], ['Operate', 'Work queue (5)'], ['Growth', 'Growth Readiness']]) {
    const html = ui.sheet(title, '', `<h3>${heading}</h3><p>Retained detail</p>`); assert.match(html, /section-shortcuts/); assert.match(html, /data-a="section"/); assert.match(html, /Retained detail/);
    assert.ok(html.indexOf('aria-label="Close"') < html.indexOf('class="body"'));
  }
});
test('growth readiness leads customer experience', () => { const { ui } = fixture(); const html = ui.growthSheet(); assert.ok(html.indexOf('Growth Readiness') < html.indexOf('Customer experience')); });
test('guide never moves targets while touching or scrolling menus', () => {
  const { ui, box } = fixture(); ui.guideTarget = () => { throw new Error('target should remain untouched'); };
  ui.menuTouch = true; ui.updateGuide(); assert.equal(box.hidden, true);
  ui.menuTouch = false; ui.menuScrollUntil = performance.now() + 500; ui.updateGuide(); assert.equal(box.hidden, true);
});
test('map input wires a bounded double-tap to anchored camera zoom', () => {
  const main = readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');
  const render = readFileSync(new URL('../../js/render.js', import.meta.url), 'utf8');
  assert.match(main, /DOUBLE_TAP_MS\s*=\s*320/);
  assert.match(main, /DOUBLE_TAP_PX\s*=\s*28/);
  assert.match(main, /game\.rend\.zoomAt\(e\.clientX, e\.clientY, 1\.65\)/);
  assert.match(render, /zoomAt\(cx, cy, k\)/);
  assert.match(render, /before\.fx - after\.fx/);
});
console.log(`ALL PASS: ${n} menu/touch checks`);
