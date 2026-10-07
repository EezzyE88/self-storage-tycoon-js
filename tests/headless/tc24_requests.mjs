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
  const f = fixture('manager', speed); request(f); f.ui.showRequests(true);
  assert.equal(f.sim.s.speed, 0); assert.match(f.boxes.modal.innerHTML, /Manager handling this/);
  f.ui.closeModal(); assert.equal(f.sim.s.speed, speed);
});
test('manual Pause remains sticky through review, mode changes and answering', () => {
  const f = fixture('manager', 4), c = request(f); f.ui.showRequests(true);
  f.click({a: 'speed', v: '0'}); f.click({a: 'requestMode'}); f.ui.closeModal();
  assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.policies.manualRequests, true);
  f.ui.showRequests(true); f.click({a: 'requestMode'}); f.click({a: 'convo', id: c.id, i: 0}); f.ui.closeModal();
  assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.drama.noted, 1);
});
test('per-request owner intervention remains held after closing review', () => {
  const f = fixture('manager', 4), c = request(f); f.ui.showRequests(true);
  f.click({a: 'requestReview', id: c.id}); f.ui.closeModal(); f.ticks(240);
  assert.equal(c.ownerReview, 'owner'); assert.equal(f.sim.s.speed, 0); assert.equal(f.sim.s.drama?.noted || 0, 0);
  f.click({a: 'convo', id: c.id, i: 1}); assert.equal(f.sim.s.speed, 4); assert.equal(f.sim.s.convos.length, 0);
});
test('saved manual preference and pending escalation survive reload; old saves default to staff handling', () => {
  const f = fixture('manager'), c = request(f); f.ui.showRequests(true); f.click({a: 'requestMode'});
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
  f.ui.showRequests(true); assert.match(f.boxes.modal.innerHTML, /No active requests/);
  assert.match(f.boxes.modal.innerHTML, /Recent staff responses/); assert.match(f.boxes.modal.innerHTML, /Review every request myself/);
  const src = readFileSync(new URL('../../js/ui.js', import.meta.url), 'utf8');
  assert.match(src, /data-a="requests" data-v="settings">Customer requests/); assert.match(src, /Requests &amp; staff responses/);
});
for (const speed of [0, 1, 2, 4]) test(`stale or empty decision review does nothing at prior ${speed}x`, () => {
  const f = fixture('manager', speed); f.click({a: 'requests'});
  assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, speed);
  assert.equal(f.ui.popupBlocks?.size || 0, 0);
});
for (const speed of [0, 1, 2, 4]) test(`answering the final owner decision dismisses it and restores prior ${speed}x`, () => {
  const f = fixture(null, speed); f.sim.s.policies.manualRequests = false;
  const c = request(f); f.click({a: 'requests'});
  assert.match(f.boxes.modal.innerHTML, /Your decision/);
  assert.doesNotMatch(f.boxes.modal.innerHTML, /requestMode|preference|Recent staff responses/);
  f.click({a: 'convo', id: c.id, i: 0});
  assert.equal(f.sim.s.convos.length, 0); assert.equal(f.ui.modalOpen(), false);
  assert.equal(f.sim.s.speed, speed); assert.equal(f.sim.s.policies.manualRequests, false);
  assert.equal(f.ui.popupBlocks.size, 0); assert.equal(f.boxes.feed.children.length, 0);
  f.click({a: 'requests'}); assert.equal(f.ui.modalOpen(), false);
});
test('staff-only progress stays passive and never opens a decision or pauses time', () => {
  const f = fixture('manager', 4); request(f);
  assert.equal(f.boxes.feed.children[0].dataset.a, undefined);
  assert.doesNotMatch(f.boxes.feed.children[0].textContent, /Review/);
  f.ui.showRequests(); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 4);
  f.ticks(15); assert.equal(f.sim.s.convos.length, 0); assert.equal(f.sim.requestHistory().length, 1);
  assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 4);
});
test('multiple owner decisions remain visible until the final response', () => {
  const f = fixture(null, 2), first = request(f); request(f, {key: 'second', text: 'Second decision'});
  f.ui.showRequests(); f.click({a: 'convo', id: first.id, i: 1});
  assert.equal(f.ui.modalOpen(), true); assert.equal(f.sim.s.speed, 0);
  assert.match(f.boxes.modal.innerHTML, /Second decision/); assert.doesNotMatch(f.boxes.modal.innerHTML, /requestMode/);
  f.click({a: 'convo', id: f.sim.s.convos[0].id, i: 1}); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 2);
});
test('mixed queues show only owner decisions and resume the remaining staff response', () => {
  const f = fixture('manager', 4), staff = request(f, {text: 'Staff-only question'});
  const owner = request(f, {key: 'owner', text: 'Owner-only decision', auto: undefined});
  f.ui.showRequests(); assert.match(f.boxes.modal.innerHTML, /Owner-only decision/);
  assert.doesNotMatch(f.boxes.modal.innerHTML, /Staff-only question|requestMode|Recent staff responses/);
  f.click({a: 'convo', id: owner.id, i: 1});
  assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 4); assert.ok(f.sim.s.convos.includes(staff));
  f.ticks(15); assert.equal(f.sim.s.convos.length, 0); assert.equal(f.sim.requestHistory().length, 1);
});
test('manual Pause selected during a decision survives automatic dismissal', () => {
  const f = fixture(null, 4), c = request(f); f.ui.showRequests(); f.click({a: 'speed', v: '0'});
  f.click({a: 'convo', id: c.id, i: 1}); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 0);
});
test('a decision removed by the simulation closes its obsolete window', () => {
  const f = fixture(null, 2); request(f); f.ui.showRequests(); f.sim.dropConvo('probe'); f.ui.renderFeed(true);
  assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 2);
});
test('explicit Menu settings remain accessible when empty and retain the saved choice', () => {
  const f = fixture('manager', 4); f.click({a: 'requests', v: 'settings'});
  assert.match(f.boxes.modal.innerHTML, /Request settings &amp; history|requestMode|No active requests/);
  f.ui.renderFeed(true); assert.equal(f.ui.modalOpen(), true);
  f.click({a: 'requestMode'}); assert.equal(f.sim.s.policies.manualRequests, true);
  const loaded = new Sim(JSON.parse(JSON.stringify(f.sim.s))); assert.equal(loaded.s.policies.manualRequests, true);
  f.click({a: 'requestMode'}); assert.equal(f.sim.s.policies.manualRequests, false);
  const staffMode = new Sim(JSON.parse(JSON.stringify(f.sim.s))); assert.equal(staffMode.s.policies.manualRequests, false);
  f.ui.closeModal(); assert.equal(f.sim.s.speed, 4);
});
test('an explicitly opened settings window remains open after its final request is answered', () => {
  const f = fixture(null, 1), c = request(f); f.ui.showRequests(true); f.click({a: 'convo', id: c.id, i: 1});
  assert.equal(f.ui.modalOpen(), true); assert.match(f.boxes.modal.innerHTML, /No active requests/);
  assert.equal(f.sim.s.speed, 0); f.ui.closeModal(); assert.equal(f.sim.s.speed, 1);
});
test('automatic decision dismissal preserves another panel pause', () => {
  const f = fixture(null, 4); f.ui.pauseForPopup('panel'); const c = request(f); f.ui.showRequests();
  f.click({a: 'convo', id: c.id, i: 1}); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 0);
  assert.equal(f.ui.popupBlocks.size, 1); assert.ok(f.ui.popupBlocks.has('panel'));
  f.ui.resumePopup('panel'); assert.equal(f.sim.s.speed, 4);
});
for (const speed of [1, 2, 4]) test(`in-window Keep paused records manual Pause and prevents ${speed}x restart`, () => {
  const f = fixture(null, speed); f.sim.s.policies.manualRequests = false; const c = request(f); f.ui.showRequests();
  assert.match(f.boxes.modal.innerHTML, /class="row request-decision-head"/);
  assert.match(f.boxes.modal.innerHTML, /data-a="requestPause" data-qa="request-keep-paused" aria-pressed="false">Keep paused after answering/);
  f.click({a: 'requestPause'}); assert.equal(f.ui.popupResume, 0); assert.equal(f.sim.s.speed, 0);
  assert.match(f.boxes.modal.innerHTML, /aria-pressed="true">Will stay paused after answering/);
  f.click({a: 'convo', id: c.id, i: 1}); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 0);
  const t = f.sim.s.t; f.ticks(240); assert.equal(f.sim.s.t, t); assert.equal(f.sim.s.policies.manualRequests, false);
});
test('a decision opened from manual Pause already reports the correct stay-paused state', () => {
  const f = fixture(null, 0), c = request(f); f.ui.showRequests();
  assert.match(f.boxes.modal.innerHTML, /aria-pressed="true">Will stay paused after answering/);
  f.click({a: 'convo', id: c.id, i: 1}); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 0);
});
test('in-window Pause persists across multiple decisions and repeated taps', () => {
  const f = fixture(null, 4), first = request(f); request(f, {key: 'second'}); f.ui.showRequests();
  f.click({a: 'requestPause'}); f.click({a: 'requestPause'}); f.click({a: 'convo', id: first.id, i: 1});
  assert.equal(f.ui.modalOpen(), true); assert.match(f.boxes.modal.innerHTML, /aria-pressed="true">Will stay paused after answering/);
  f.click({a: 'convo', id: f.sim.s.convos[0].id, i: 1}); assert.equal(f.ui.modalOpen(), false); assert.equal(f.sim.s.speed, 0);
});
test('Keep paused does not change saved staff policy or create a permanent resume preference', () => {
  const f = fixture(null, 4); f.sim.s.policies.manualRequests = false; const c = request(f); f.ui.showRequests(); f.click({a: 'requestPause'});
  f.click({a: 'convo', id: c.id, i: 1}); const loaded = new Sim(JSON.parse(JSON.stringify(f.sim.s)));
  assert.equal(loaded.s.policies.manualRequests, false); f.click({a: 'speed', v: '4'});
  const next = request(f); f.ui.showRequests(); assert.match(f.boxes.modal.innerHTML, /aria-pressed="false">Keep paused after answering/);
  f.click({a: 'convo', id: next.id, i: 1}); assert.equal(f.sim.s.speed, 4);
});
test('stale Pause actions do nothing after dismissal or inside request settings', () => {
  const f = fixture(null, 2), c = request(f); f.ui.showRequests(); f.click({a: 'convo', id: c.id, i: 1});
  f.click({a: 'requestPause'}); assert.equal(f.sim.s.speed, 2);
  f.ui.showRequests(true); assert.doesNotMatch(f.boxes.modal.innerHTML, /data-a="requestPause"/);
  f.click({a: 'requestPause'}); f.ui.closeModal(); assert.equal(f.sim.s.speed, 2);
});
test('in-window Pause survives X, later response and other panel closure', () => {
  const f = fixture(null, 4); f.ui.pauseForPopup('panel'); const c = request(f); f.ui.showRequests(); f.click({a: 'requestPause'}); f.ui.closeModal();
  f.click({a: 'convo', id: c.id, i: 1}); f.ui.resumePopup('panel'); assert.equal(f.sim.s.speed, 0);
});
test('old saved attempted offers disable repeat actions without losing valid move-out response', () => {
  const f=fixture('manager',4),u=f.sim.objs('unit').find(u=>u.lease),L=f.sim.s.leases[u.lease],tn=f.sim.s.tenants[L.tenant];
  tn.leaving=true;tn.retainTried=true;f.sim.moveoutConvo(tn,L,u,true);
  const loaded=new Sim(JSON.parse(JSON.stringify(f.sim.s)));f.ui.g.sim=loaded;f.ui.renderFeed(true);
  const c=loaded.s.convos.at(-1),rent=loaded.s.leases[L.id].rent;
  assert.equal(c.auto,1);assert.match(f.ui.requestCards.join(''),/Offer already sent/);assert.match(f.ui.requestCards.join(''),/disabled aria-disabled/);
  assert.equal(loaded.dispatch({type:'convo',id:c.id,i:0}).ok,false);assert.ok(loaded.s.convos.includes(c));assert.equal(loaded.s.leases[L.id].rent,rent);
  assert.equal(loaded.dispatch({type:'convo',id:c.id,i:1}).ok,true);assert.equal(loaded.s.convos.length,0);
});
test('declined staff offer resolves once without a false owner failure or repeat discount', () => {
  const f=fixture('manager',4),u=f.sim.objs('unit').find(u=>u.lease),L=f.sim.s.leases[u.lease],tn=f.sim.s.tenants[L.tenant];
  tn.leaving=true;f.sim.rnd=()=>0.99;f.sim.moveoutConvo(tn,L,u,true);const rent=L.rent,cash=f.sim.s.cash;
  f.ticks(15);assert.equal(f.sim.s.convos.length,0);assert.equal(f.sim.s.speed,4);assert.equal(L.rent,rent);assert.equal(f.sim.s.cash,cash);
  assert.equal(tn.retainTried,true);assert.match(f.sim.requestHistory()[0].msg,/declined.*Move-out steps/);
});
for(const role of ['manager','clerk']) test(`midnight routine move-out waits for ${role} office coverage across save/load`,()=>{
  const f=fixture(role,4);f.sim.s.t=0;const u=f.sim.objs('unit').find(u=>u.lease),L=f.sim.s.leases[u.lease],tn=f.sim.s.tenants[L.tenant];tn.leaving=true;
  f.sim.moveoutConvo(tn,L,u,false);f.ui.renderFeed(true);const c=f.sim.s.convos.at(-1);
  assert.equal(c.staffWaiting,true);assert.equal(f.sim.s.speed,4);assert.match(f.ui.requestCards.join(''),/when the office opens/);
  f.ticks(20);assert.ok(f.sim.s.convos.includes(c));const loaded=new Sim(JSON.parse(JSON.stringify(f.sim.s)));loaded.s.t=10*60;loaded.convoTick();
  assert.equal(loaded.s.convos.length,0);assert.equal(loaded.requestHistory().length,1);assert.match(loaded.requestHistory()[0].msg,/Move-out explained/);
});
test('midnight routine still requires owner if staff absent or manual review selected',()=>{
  for(const manual of [false,true]){const f=fixture(manual?'manager':null,4);f.sim.s.t=0;f.sim.s.policies.manualRequests=manual;
  const u=f.sim.objs('unit').find(u=>u.lease),L=f.sim.s.leases[u.lease],tn=f.sim.s.tenants[L.tenant];tn.leaving=true;f.sim.moveoutConvo(tn,L,u,false);f.ui.renderFeed(true);
  assert.equal(f.sim.s.speed,0);assert.equal(f.sim.s.convos.at(-1).staffHandling,null);}
});
test('firing deferred staff escalates; active routine coverage loss remains sticky',()=>{
  for(const midnight of [true,false]){const f=fixture('manager',4);if(midnight)f.sim.s.t=0;
  const u=f.sim.objs('unit').find(u=>u.lease),L=f.sim.s.leases[u.lease],tn=f.sim.s.tenants[L.tenant];tn.leaving=true;f.sim.moveoutConvo(tn,L,u,false);f.ui.renderFeed(true);
  const c=f.sim.s.convos.at(-1);if(midnight)f.sim.dispatch({type:'fire',id:f.sim.s.staff.find(st=>st.role==='manager').id});else f.sim.s.t=OFFICE_HOURS[1]*60;
  f.ui.renderFeed(true);assert.equal(c.ownerReview,'coverage');assert.equal(f.sim.s.speed,0);}
});
test('stale double taps and invalid indices cannot consume another pending decision',()=>{
  const f=fixture(null,4),a=request(f),b=request(f,{key:'second'});f.ui.showRequests();
  assert.equal(f.sim.dispatch({type:'convo',id:a.id,i:99}).ok,false);assert.equal(f.sim.s.convos.length,2);
  f.click({a:'convo',id:a.id,i:1});f.click({a:'convo',id:a.id,i:1});assert.ok(f.sim.s.convos.includes(b));assert.equal(f.sim.s.speed,0);
  f.click({a:'convo',id:b.id,i:1});assert.equal(f.sim.s.speed,4);assert.equal(f.ui.modalOpen(),false);
});
test('previously attempted price offer at midnight becomes routine staff steps',()=>{
  const f=fixture('manager',4);f.sim.s.t=0;const u=f.sim.objs('unit').find(u=>u.lease),L=f.sim.s.leases[u.lease],tn=f.sim.s.tenants[L.tenant];tn.leaving=true;tn.retainTried=true;
  f.sim.moveoutConvo(tn,L,u,true);f.ui.renderFeed(true);const c=f.sim.s.convos.at(-1);assert.equal(c.auto,1);assert.equal(c.staffWaiting,true);assert.equal(f.sim.s.speed,4);
});
console.log(`${passed} request handling and window checks passed`);
