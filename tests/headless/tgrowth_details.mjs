import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';

function fixture(speed) {
  const sim = makeSandbox({start: 'empty', cash: 60000}); sim.ensure(); sim.s.speed = speed;
  const ui = Object.create(UI.prototype), body = {scrollTop: 0, getBoundingClientRect: () => ({top: 100})};
  let html = '';
  const picker = {textContent: '', setAttribute() {}};
  const box = {querySelector(selector) {
    if (selector === '.body') return body;
    if (selector === '[data-section-picker]') return picker;
    if (selector === '[data-section-menu]' && html.includes('data-section-menu=')) return {};
    return null;
  }};
  body.querySelectorAll = () => [...html.matchAll(/<h3 data-section="([^"]+)"/g)].map(m => ({dataset: {section: m[1]}, getBoundingClientRect: () => ({top: 180})}));
  Object.defineProperty(box, 'innerHTML', {get: () => html, set(value) {html = value; box.firstChild = value ? {classList: {add() {}}} : null;}});
  ui.g = {sim, audio: {unlock() {}}, rend: {view: 'ext', setSelection() {}}};
  ui.root = {querySelectorAll: () => []}; ui.$ = () => box;
  ui.syncFeedbackProperty = () => {}; ui.sfx = () => {};
  ui.tab = null; ui.sel = null; ui.sheetTall = false;
  // Initialize the baseline panel's lazy staff/lesson defaults before state comparisons.
  ui.growthSheet();
  const click = (a, v) => ui.onClick({target: {closest: () => ({dataset: {a, v}})}});
  return {sim, ui, box, body, click};
}

let checks = 0;
for (const speed of [0, 1, 2, 4]) {
  const {sim, ui, box, body, click} = fixture(speed), before = JSON.stringify(sim.s);
  click('tab', 'growth');
  assert.equal(ui.sheetTall, true, 'choosing Growth must expose details without a Details tap');
  assert.match(box.innerHTML, /sheet tall/);
  assert.match(box.innerHTML, />Back to map<\/button>/);
  assert.doesNotMatch(box.innerHTML, />Details<\/button>/);
  assert.match(box.innerHTML, /data-section="Growth Readiness"/);
  assert.equal(sim.s.speed, 0);
  for (const section of ['Growth Readiness', 'Customer experience', 'Lessons', 'Acquisitions']) {
    click('sectionMenu'); click('section', section);
    assert.equal(ui.sectionChoice.label, section);
    assert.equal(ui.sheetTall, true); assert.equal(ui.sectionMenuKey, null);
    assert.match(box.innerHTML, /sheet tall/); assert.ok(body.scrollTop > 0);
    ui.renderSheet(true); assert.match(box.innerHTML, /sheet tall/);
  }
  click('tab', 'growth');
  assert.equal(ui.tab, null); assert.equal(sim.s.speed, speed);
  const prior = JSON.parse(before); const changed = Object.keys(sim.s).filter(k => JSON.stringify(sim.s[k]) !== JSON.stringify(prior[k])); assert.deepEqual(changed, [], 'navigation must preserve the complete simulation/save state');
  console.log(`PASS Growth entry, section choices, refresh and exact state restoration at ${speed}x`); checks++;
}
{
  const {sim, ui, click} = fixture(4);
  click('tab', 'growth'); ui.requestSpeed(0); click('tab', 'growth');
  assert.equal(sim.s.speed, 0, 'manual Pause must survive closing Growth');
  for (const tab of ['operate', 'business', 'build']) {click('tab', tab); assert.equal(ui.sheetTall, false); click('tab', tab);}
  console.log('PASS manual Pause and unchanged compact defaults for other tabs'); checks++;
}
console.log(`${checks} focused Growth details checks passed; DOM fixture, not rendered Safari`);
