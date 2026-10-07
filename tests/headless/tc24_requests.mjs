import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {OFFICE_HOURS} from '../../js/data.js';

let passed = 0;
const test = (name, f) => { f(); console.log('PASS ' + name); passed++; };
function element() {
  const e = {dataset: {}, children: [], className: '', textContent: '',
    appendChild(x) { this.children.push(x); }, prepend(x) { this.children.unshift(...x.children); },
    querySelectorAll() { return this.children.map(x => ({remove: () => {this.children = this.children.filter(y => y !== x);}})); },
    classList: {toggle() {}, add() {}, remove() {}}, setAttribute() {}};
  let html = '';
  Object.defineProperties(e, {
    innerHTML: {get: () => html, set(v) {html = v; this.firstChild = v ? {} : null;}},
    outerHTML: {get: () => `<div class="${e.className}">${html}</div>`}
  });
  return e;
}
globalThis.document = {createDocumentFragment: element, createElement: element};
const main = readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');
const tickCode = main.slice(main.indexOf('function stepTicks('), main.indexOf('\nlet last =', main.indexOf('function stepTicks(')));
function fixture(role = 'clerk', speed = 1) {
  const sim = makeMaple(4242); sim.s.t = 10 * 60; sim.s.speed = speed;
  sim.s.tut.on = false; sim.s.tut.done = true; sim.onTick = null;
  if (role) assert.equal(sim.dispatch({type: 'hire', role}).ok, true);
  sim.events.length = 0;
  const ui = Object.create(UI.prototype), boxes = {}, toasts = [];
  const game = {sim, audio: {unlock() {}}, company: null, syncTier() {}, drain() {
    for (const e of sim.events.splice(0)) if (['convo', 'manager', 'convo_expired'].includes(e.type)) ui.onEvent(e);
  }};
  game.ui = ui; ui.g = game; ui.title = false; ui.toasts = []; ui.sfx = () => {};
  ui.toast = t => toasts.push(t); ui.$ = id => boxes[id] ||= element();
  ui.renderSheet = () => {}; ui.renderTut = () => {}; ui.syncFloorUi = () => {};
  game.rend = {}; // no rendering needed for the real request and pause handlers
  const context = vm.createContext({game, BG_EVENTS: {}});
  vm.runInContext(tickCode, context);
  const ticks = n => context.stepTicks(n);
  const click = dataset => ui.onClick({target: {closest: () => ({dataset, closest: () => null})}});
  return {sim, ui, boxes, ticks, click, toasts};
}
function request(f, extra = {}) {
  f.sim.convo({key: 'probe', who: 'A shopper', text: 'Routine question', auto: 0, def: 1, ttl: 40,
    actions: [{label: 'Acknowledge', action: {type: 'cv', op: 'noted'}}, {label: 'Dismiss'}], ...extra});
  f.ui.renderFeed(true); return f.sim.s.convos.at(-1);
}
for (const role of ['clerk', 'manager']) for (const speed of [1, 2, 4]) {
  test(`${role} request runs at ${speed}x and resolves exactly once after the existing delay`, () => {
    const f = fixture(role, speed), c = request(f), start = f.sim.s.t;
    assert.equal(f.sim.s.speed, speed); assert.equal(c.staffHandling, role === 'clerk' ? 'Clerk' : 'Manager');
    assert.match(f.boxes.feed.children[0].textContent, /handling 1 request/);
    f.ticks(14); assert.equal(f.sim.s.convos.length, 1); assert.equal(f.sim.s.drama?.noted || 0, 0);
    f.ticks(1); assert.equal(f.sim.s.t, start + 15); assert.equal(f.sim.s.convos.length, 0);
    assert.equal(f.sim.s.drama.noted, 1); f.sim.convoTick(); assert.equal(f.sim.s.drama.noted, 1);
    assert.equal(f.sim.requestHistory().length, 1); assert.equal(f.toasts.length, 0, 'routine outcomes do not become popups');
  });
}
test('owner decisions block a 240-tick frame before any time or default advances', () => {
  const f = fixture('manager', 4), c = request(f, {auto: undefined, sev: 'critical', ttl: 1});
  const start = f.sim.s.t; f.ticks(240);
  assert.match(f.ui.requestCards.join(''), /Time stays paused/);
  assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.t, start); assert.ok(f.sim.s.convos.includes(c));
});
test('a new owner decision stops the same fast frame immediately after its creation', () => {
  const f = fixture('manager', 4), start = f.sim.s.t;
  f.sim.onTick = sim => { if (sim.s.t === start + 1) sim.convo({key: 'owner', who: 'Owner decision', text: 'Review', ttl: 1, def: 0, actions: [{label: 'Noted', action: {type: 'cv', op: 'noted'}}]}); };
  f.ticks(240); assert.equal(f.sim.s.t, start + 1); assert.equal(f.sim.s.speed, 0);
  assert.equal(f.sim.s.convos.length, 1); assert.equal(f.sim.s.drama?.noted || 0, 0);
});
test('coverage loss escalates before expiry and remains an owner decision when staff return', () => {
  const f = fixture('clerk', 4); f.sim.s.t = OFFICE_HOURS[1] * 60 - 5;
  const c = request(f), start = f.sim.s.t; f.ticks(240);
  assert.equal(f.sim.s.t, start + 5); assert.equal(f.sim.s.speed, 0); assert.equal(c.ownerReview, 'coverage');
  assert.match(f.ui.requestCards.join(''), /Staff coverage ended/);
  f.sim.s.t = c.t + c.ttl + 100; f.sim.convoTick(); assert.ok(f.sim.s.convos.includes(c));
  f.sim.s.t = (f.sim.day * 1440) + OFFICE_HOURS[0] * 60; f.ui.renderFeed(true);
  assert.equal(f.sim.requestHandler(c), null); assert.equal(f.sim.s.speed, 0);
});
test('firing the last handler hands the request back, while alternate coverage continues', () => {
  const f = fixture('clerk', 4), c = request(f), clerk = f.sim.s.staff.find(s => s.role === 'clerk');
  f.sim.dispatch({type: 'hire', role: 'manager'}); f.sim.dispatch({type: 'fire', id: clerk.id}); f.ui.renderFeed();
  assert.equal(c.staffHandling, 'Manager'); assert.equal(f.sim.s.speed, 4);
  f.sim.dispatch({type: 'fire', id: f.sim.s.staff.find(s => s.role === 'manager').id}); f.ticks(240);
  assert.equal(c.ownerReview, 'coverage'); assert.equal(f.sim.s.speed, 0); assert.ok(f.sim.s.convos.includes(c));
});
test('missing staff leave an owner request rather than silently applying its default', () => {
  const f = fixture(null), c = request(f), start = f.sim.s.t; f.ticks(240);
  assert.equal(f.sim.s.t, start); assert.equal(f.sim.s.speed, 0);
  f.sim.s.t += 100; f.sim.convoTick(); assert.ok(f.sim.s.convos.includes(c));
});
for (const speed of [0, 1, 2, 4]) test(`request review and its closure preserve prior ${speed}x`, () => {
  const f = fixture('manager', speed); request(f); f.ui.showRequests();
  assert.equal(f.sim.s.speed, 0); assert.match(f.boxes.modal.innerHTML, /Manager handling this/);
  f.ui.closeModal(); assert.equal(f.sim.s.speed, speed);
});
test('manual Pause remains sticky through review, mode changes and answering', () => {
  const f = fixture('manager', 4), c = request(f); f.ui.showRequests();
  f.click({a: 'speed', v: '0'}); f.click({a: 'requestMode'}); f.ui.closeModal();
  assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.policies.manualRequests, true);
  f.ui.showRequests(); f.click({a: 'requestMode'}); f.click({a: 'convo', id: c.id, i: 0}); f.ui.closeModal();
  assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.drama.noted, 1);
});
test('per-request owner intervention remains held after closing review', () => {
  const f = fixture('manager', 4), c = request(f); f.ui.showRequests();
  f.click({a: 'requestReview', id: c.id}); f.ui.closeModal(); f.ticks(240);
  assert.equal(c.ownerReview, 'owner'); assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.drama?.noted || 0, 0);
  f.click({a: 'convo', id: c.id, i: 1}); assert.equal(f.sim.s.speed, 4); assert.equal(f.sim.s.convos.length, 0);
});
test('saved manual preference and pending escalation survive reload; old saves default to staff handling', () => {
  const f = fixture('manager'), c = request(f); f.ui.showRequests(); f.click({a: 'requestMode'});
  f.sim.dispatch({type: 'requestReview', id: c.id});
  const loaded = new Sim(JSON.parse(JSON.stringify(f.sim.s)));
  assert.equal(loaded.s.policies.manualRequests, true); assert.equal(loaded.s.convos[0].ownerReview, 'owner');
  assert.equal(loaded.requestHandler(loaded.s.convos[0]), null);
  const old = fixture('manager'); const oldRequest = request(old); delete oldRequest.staffHandling;
  assert.equal(old.sim.s.policies.manualRequests, undefined); assert.equal(old.sim.requestHandler(oldRequest), 'Manager');
});
test('existing retention policy controls the response without adding concessions or charges', () => {
  for (const retention of [false, true]) {
    const f = fixture('manager'); f.sim.s.policies.retention = retention;
    const u = f.sim.objs('unit').find(u => u.lease), L = f.sim.s.leases[u.lease], tn = f.sim.s.tenants[L.tenant];
    tn.leaving = true; const rent = L.rent, cash = f.sim.s.cash;
    f.sim.moveoutConvo(tn, L, u, true); f.ui.renderFeed(true); const c = f.sim.s.convos.at(-1);
    assert.equal(c.auto, retention ? 0 : 1); f.ticks(15);
    assert.equal(L.rent, retention ? Math.round(rent * 0.9) : rent); assert.equal(f.sim.s.cash, cash);
    assert.equal(tn.leaving, !retention);
  }
});
test('a failed staff action is handed back once, without a retry or cash debit', () => {
  const f = fixture('manager'); f.sim.s.cash = 0;
  const c = request(f, {actions: [{label: 'Cover deductible', action: {type: 'cv', op: 'biCover', tenant: 99999}}, {label: 'Dismiss'}]});
  f.ticks(240); assert.equal(c.ownerReview, 'failed'); assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.cash, 0);
  f.sim.convoTick(); assert.equal(f.sim.requestHistory().length, 1); assert.match(f.sim.requestHistory()[0].msg, /Not enough cash/);
});
test('history remains compact and Requests stays accessible without a pending card', () => {
  const f = fixture('manager');
  for (let i = 0; i < 25; i++) f.sim.mgr('Clerk answered ' + i, {request: true});
  assert.equal(f.sim.s.mgrLog.length, 20); assert.equal(f.sim.requestHistory().length, 5);
  f.ui.showRequests(); assert.match(f.boxes.modal.innerHTML, /No active requests/);
  assert.match(f.boxes.modal.innerHTML, /Recent staff responses/); assert.match(f.boxes.modal.innerHTML, /Review every request myself/);
  const src = readFileSync(new URL('../../js/ui.js', import.meta.url), 'utf8');
  assert.match(src, /data-a="requests">Customer requests/); assert.match(src, /Requests &amp; staff responses/);
});
console.log(`${passed} Candidate 24 request checks passed`);
