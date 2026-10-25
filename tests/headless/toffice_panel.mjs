import assert from 'node:assert/strict';
import { officePanelState } from '../../js/officepanel.js';
import { UI } from '../../js/ui.js';
import { makeMaple } from '../../js/maple.js';

let passed = 0;
const test = (name, run) => { run(); passed++; console.log('PASS ' + name); };
function fixture() {
  const sim = makeMaple(4242);
  sim.s.t = 10 * 60; sim.s.speed = 0; sim.s.tut.on = false; sim.s.tut.done = true;
  sim.s.convos = []; sim.s.officeQ = []; sim.s.tasks = [];
  const owner = sim.s.staff.find(st => st.role === 'owner');
  Object.assign(owner, { workDay: sim.day, workUsed: 0, officeUsed: 0 });
  const ag = sim.s.agents.find(a => a.sid === owner.id);
  Object.assign(ag, { st: 'office', task: null, queue: [] });
  const ui = Object.create(UI.prototype);
  ui.g = { sim, rend: { view: 'ext', setSelection() {} }, audio: { unlock() {} } };
  ui.title = false; ui.sfx = () => {}; ui.renderSheet = () => {};
  ui.root = { querySelectorAll: () => [] };
  return { sim, owner, ag, ui };
}
function hire(sim, role) { assert.equal(sim.dispatch({ type: 'hire', role }).ok, true); }
const click = (ui, dataset) => ui.onClick({ target: { closest: () => ({ dataset, closest: () => null }) } });

test('counter matches actual server eligibility, excludes Manager, and separates service from waiting', () => {
  const { sim, owner, ag } = fixture();
  sim.s.agents.push({ id: 900001, kind: 'cust', serveT: 25 }, { id: 900002, kind: 'cust', serveT: 0 });
  sim.s.officeQ = [900001, 900002];
  let p = officePanelState(sim);
  assert.deepEqual([p.waiting, p.serving, p.counter], [1, 1, 'Covered by Owner']);
  assert.deepEqual(sim.officeServerAgents().map(a => a.role), ['owner']);
  ag.st = 'work'; hire(sim, 'manager');
  assert.equal(sim.officeServerAgents().length, 0);
  assert.equal(officePanelState(sim).counter, 'Counter uncovered');
  hire(sim, 'clerk');
  assert.equal(officePanelState(sim).counter, 'Covered by Clerk');
  assert.deepEqual(sim.officeServerAgents().map(a => a.role), ['clerk']);
  ag.st = 'office'; owner.workUsed = 8;
  assert.equal(officePanelState(sim).counter, 'Covered by Clerk');
  sim.s.t = 19 * 60;
  assert.equal(officePanelState(sim).counter, 'Outside office hours');
  sim.s.open = false;
  assert.equal(officePanelState(sim).counter, 'Business not open');
});

test('reserved property capacity is distinct from recorded completions; stale days are read without mutation', () => {
  const { sim, owner, ag } = fixture();
  Object.assign(owner, { workUsed: 5, officeUsed: 1 }); ag.queue = [700001, 700002];
  sim.s.workReport = { v: 1, fromT: sim.s.t, days: [{ day: sim.day, payroll: 0, roles: { owner: { jobs: 1, hours: 2 } } }] };
  const before = JSON.stringify(sim.s), p = officePanelState(sim);
  assert.deepEqual([p.officeCharged, p.propertyCharged, p.remaining, p.ownerQueued, p.completedJobs], [1, 4, 3, 2, 1]);
  assert.equal(JSON.stringify(sim.s), before);
  owner.workDay = sim.day - 1;
  const stale = JSON.stringify(sim.s), next = officePanelState(sim);
  assert.deepEqual([next.officeCharged, next.propertyCharged, next.remaining], [0, 0, 8]);
  assert.equal(JSON.stringify(sim.s), stale);
});

test('critical, manual, takeover and failed requests are owner decisions; eligible routine requests stay delegated', () => {
  const { sim } = fixture(); hire(sim, 'clerk');
  for (const extra of [{}, { sev: 'critical' }, { ownerReview: 'owner' }, { ownerReview: 'failed' }, { ownerReview: 'coverage' }]) {
    sim.convo({ key: 'q' + sim.s.convos.length, who: 'Tenant', text: 'Question', auto: 0, actions: [{ label: 'Noted' }], ...extra });
  }
  const before = JSON.stringify(sim.s), p = officePanelState(sim);
  assert.equal(p.decisions.length, 4); assert.equal(p.decisions[0].sev, 'critical');
  assert.equal(p.delegatedRequests.length, 1);
  assert.equal(JSON.stringify(sim.s), before);
  sim.s.policies.manualRequests = true;
  assert.equal(officePanelState(sim).decisions.length, 5);
  assert.equal(officePanelState(sim).delegatedRequests.length, 0);
});

test('after-hours retention shows delegated waiting rather than a new owner decision', () => {
  const { sim } = fixture(); hire(sim, 'clerk'); sim.s.t = 19 * 60;
  const tn = Object.values(sim.s.tenants)[0], L = sim.s.leases[tn.lease];
  tn.leaving = true; tn.retainTried = false;
  sim.moveoutConvo(tn, L, sim.s.objects[L.unit], true);
  const before = JSON.stringify(sim.s), p = officePanelState(sim);
  assert.equal(p.decisions.length, 0); assert.equal(p.delegatedRequests.length, 1);
  assert.equal(p.delegatedRequests[0].waiting, true);
  assert.equal(JSON.stringify(sim.s), before);
});

test('property delegation excludes unassigned and Owner work and includes staff/vendor jobs once', () => {
  const { sim, owner, ui } = fixture(); hire(sim, 'porter');
  const porter = sim.s.staff.find(st => st.role === 'porter');
  sim.s.tasks = [
    { id: 1, label: 'Unassigned', assigned: null },
    { id: 2, label: 'Owner work', assigned: owner.id },
    { id: 3, label: 'Staff active', assigned: porter.id },
    { id: 4, label: 'Staff queued', assigned: porter.id, queued: true },
    { id: 5, label: 'Vendor booked', assigned: 'vendor', vendor: sim.s.t + 300 },
  ];
  const before = JSON.stringify(sim.s);
  assert.equal(officePanelState(sim).delegatedJobs.length, 3);
  assert.match(ui.officePanelHtml(), /Jobs: 1 active · 1 queued · 1 vendor booked/);
  assert.equal(JSON.stringify(sim.s), before);
});

test('Office inspector retains four actionable rows, escapes request text, and discloses current authority without purchases', () => {
  const { sim, ui } = fixture(); hire(sim, 'manager');
  sim.s.policies.manualRequests = true;
  sim.convo({ key: 'unsafe', who: '<img>', text: '<script>bad()</script>', sev: 'critical', actions: [{ label: 'Dismiss' }] });
  ui.sel = sim.objs('office')[0].id;
  const before = JSON.stringify(sim.s), html = ui.inspector();
  assert.match(html, /sheet compact office-panel/);
  assert.equal((html.match(/class="office-row"/g) || []).length, 4);
  assert.match(html, /&lt;script&gt;/); assert.ok(!html.includes('<script>'));
  for (const text of ['Manager authority active', 'does not serve the counter', '$250 simple / $650 complex', '$180 carts', 'approximately +3%', 'acceptance changes that tenant', 'does not turn off Manager', 'sends them anyway', '$80 haul-away', '$120 for clean-out']) assert.ok(html.includes(text), text);
  assert.match(html, /property jobs recorded complete today/);
  assert.ok(!html.includes('data-cmd='), 'no new purchase/authority command');
  assert.equal(JSON.stringify(sim.s), before);
});

test('Office section buttons navigate to existing destinations without dispatch or camera movement', () => {
  const { sim, ui } = fixture(); const calls = [];
  ui.select = id => calls.push(['select', id]);
  ui.setTab = (tab, expanded) => calls.push(['tab', tab, expanded]);
  ui.jumpSection = section => calls.push(['section', section]);
  const before = JSON.stringify(sim.s);
  click(ui, { a: 'officeSection', v: 'operate', section: 'Work queue' });
  assert.deepEqual(calls, [['select', null], ['tab', 'operate', true], ['section', 'Work queue']]);
  assert.equal(JSON.stringify(sim.s), before);
  const html = ui.sheet('Operate', '', '<h3>Manager log</h3>');
  assert.match(html, /data-section="Manager log"/);
});

test('Office coverage, chores and request actions reach existing handlers and never start manual Pause', () => {
  const { sim, ui } = fixture(), calls = [];
  ui.toast = () => {};
  ui.select = id => calls.push(['select', id]);
  ui.setTab = tab => calls.push(['tab', tab]);
  ui.jumpSection = section => calls.push(['section', section]);
  ui.showRequests = settings => calls.push(['requests', settings]);
  const before = structuredClone(sim.s), chores = sim.s.policies.ownerChores;
  click(ui, { a: 'staffHelp', v: 'clerk' });
  assert.equal(ui.hireRoleFocus, 'clerk');
  assert.deepEqual(calls.splice(0), [['select', null], ['tab', 'operate'], ['section', 'Hire capacity']]);
  click(ui, { a: 'requests' }); click(ui, { a: 'requests', v: 'settings' });
  assert.deepEqual(calls.splice(0), [['requests', false], ['requests', true]]);
  click(ui, { a: 'policy', v: 'ownerChores' });
  assert.equal(sim.s.policies.ownerChores, !chores);
  const expected = structuredClone(before); expected.policies.ownerChores = !chores;
  assert.deepEqual(sim.s, expected, 'only the deliberately toggled existing policy changes');
  assert.equal(sim.s.speed, 0);
});

test('selecting Office never schedules camera recentering, preserves Pause, and keeps other inspector framing', () => {
  let frames = 0; globalThis.requestAnimationFrame = () => frames++;
  for (const speed of [0, 1, 2, 4]) {
    const { sim, ui } = fixture(); sim.s.speed = speed;
    const before = JSON.stringify(sim.s);
    ui.select(sim.objs('office')[0].id);
    assert.equal(frames, 0); assert.equal(JSON.stringify(sim.s), before);
  }
  const { sim, ui } = fixture(); ui.select(sim.objs('unit')[0].id);
  assert.equal(frames, 1);
});
console.log(`${passed} focused Office checks passed; physical Safari NOT TESTED`);
