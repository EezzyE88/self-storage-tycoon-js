// Targeted PR #32 regressions. DOM stubs observe production control text/visibility;
// production Maple simulation supplies the naturally scheduled arrival.
import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {installVisualLab} from '../../js/visual-lab.js';
const test = (name, fn) => { fn(); console.log('PASS ' + name); };

function fixture(sim = makeMaple(4401)) {
  const nodes = new Map(['summary', 'button', '[data-visit]', '[data-close]'].map(key => [key, {
    textContent: key === 'summary' ? 'Visual Lab · Original' : '',
    setAttribute() {}, addEventListener() {}, removeEventListener() {},
  }]));
  const panel = { open: false, hidden: false, querySelector: k => nodes.get(k), addEventListener() {}, removeEventListener() {}, remove() {} };
  globalThis.document = { createElement: () => panel, body: { append() {} } };
  const game = {sim, rend: {sim, mat: {}}, showcase: {photo: false}, ui: {title: false, tab: null, tool: null, tutMin: true, modalOpen: () => false}};
  game.visualLab = installVisualLab(game);
  return {game, panel, nodes, status: () => nodes.get('[data-visit]').textContent};
}

test('natural arriving customer is not described as inside a unit', () => {
  const sim = makeMaple(4401);
  let arriving;
  for (let n = 0; n < 2880; n++) {
    sim.step(); sim.events.length = 0;
    arriving = sim.s.agents.find(a => a.kind === 'cust' && a.hidden && a.st === 'arrive' && sim.s.objects[a.unit]?.access === 'interior');
    if (arriving) break;
  }
  assert.ok(arriving, 'a real scheduled interior-target customer arrives');
  const before = JSON.stringify(sim.s), f = fixture(sim);
  assert.match(f.status(), /arrive/);
  assert.doesNotMatch(f.status(), /inside unit/);
  assert.equal(sim.s.vehicles.find(v => v.id === arriving.veh).parked, null);
  assert.equal(JSON.stringify(sim.s), before);
});

test('hidden office/restroom/departure phases never imply unit occupancy', () => {
  const f = fixture(), s = f.game.sim.s;
  const unit = f.game.sim.objs('unit').find(u => u.access === 'interior').id;
  for (const st of ['arrive', 'office', 'inRest', 'leave']) {
    // Explicit state fixtures cover the simulator's different uses of hidden.
    s.agents = [{id: 100, kind: 'cust', unit, hidden: true, st}];
    const before = JSON.stringify(s);
    f.game.visualLab.update();
    assert.ok(f.status().includes(`· ${st}`));
    assert.doesNotMatch(f.status(), /inside unit/);
    assert.equal(JSON.stringify(s), before);
  }
});

test('visible walking/at-unit visit is preferred over an earlier hidden arrival', () => {
  const f = fixture(), s = f.game.sim.s;
  const unit = f.game.sim.objs('unit').find(u => u.access === 'interior').id;
  for (const st of ['walk', 'atunit']) {
    s.agents = [{id: 100, kind: 'cust', unit, hidden: true, st: 'arrive'}, {id: 101, kind: 'cust', unit, hidden: false, st}];
    const before = JSON.stringify(s);
    f.game.visualLab.update();
    assert.equal(f.game.visualLab.lab.currentVisit().agentId, 101);
    assert.match(f.status(), /Live customer 101/);
    assert.equal(JSON.stringify(s), before);
  }
});

test('Photo mode hides collapsed and expanded Lab without resetting the palette or Pause', () => {
  for (const open of [false, true]) {
    const f = fixture();
    f.panel.open = open;
    f.game.visualLab.lab.setEnabled(true);
    const before = JSON.stringify(f.game.sim.s);
    f.game.showcase.photo = true;
    f.game.visualLab.update();
    assert.equal(f.panel.hidden, true);
    assert.equal(f.game.visualLab.lab.enabled, true);
    f.game.showcase.photo = false;
    f.game.visualLab.update();
    assert.equal(f.panel.hidden, false);
    assert.equal(f.panel.open, open);
    assert.equal(JSON.stringify(f.game.sim.s), before);
  }
});

console.log("4 Visual Lab review regression groups passed");
