// F2 (graduation free-play review, 061daad): the automatic "Build a working two-floor property" lesson offer.
// Option (b): the automatic offer also needs the property to be nearly full by the coach's own boundary (ui.js coachHint:
// at least 4 operating units, >= 95% leased); below it the coach says "N rent-ready units vacant ... before expanding".
// The offer also waits while a product shoppers were lost for still has rent-ready vacancies AND no product has full
// Growth Readiness demand support (economics.js investmentEvidence, per size|env). A pending offer that no longer
// stands is withdrawn on any poll (paused frame, load) without the clock advancing, without being marked seen,
// and the UI never shows or holds time for it. Growth -> Lessons access, valid-offer Pause and speed restore unchanged.
// Real Maple sim on a graduated property with the Act III climate set built through normal build actions; the
// evidence (lost-shopper log, leases) is then shaped directly as a documented setup shortcut.
import assert from 'node:assert/strict';
globalThis.window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
const { makeMaple } = await import('../../js/maple.js');
const { Sim } = await import('../../js/sim.js');
const T = await import('../../js/tutorial.js');
const { investmentEvidence } = await import('../../js/economics.js');
const { UI } = await import('../../js/ui.js');

let n = 0; const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const key = (u) => `${u.size}|${u.env || 'std'}`;
const quiet = (sim) => { sim.events.length = 0; sim.s.convos.length = 0; };

// Graduated Maple, Act III climate set (HVAC, west-corridor light, 7 climate 5x5 units) built and operating, 16 days observed.
// The three Act III lessons are marked done, as a natural graduation does, so `up` is the lesson under test.
function graduated(seed = 77) {
  const sim = makeMaple(seed); T.installTutorial(sim); const s = sim.s;
  s.open = true; Object.assign(s.tut, { on: false, done: true, gradDay: 1 }); s.cash += 20000;
  for (const a of [{ tool: 'hvac', a: { x: 14, y: 8 }, b: { x: 14, y: 8 }, f: 0 }, { tool: 'light', a: { x: 17, y: 8 }, b: { x: 17, y: 8 }, f: 0 },
    { tool: 'iu5x5', a: { x: 16, y: 5 }, b: { x: 16, y: 11 }, f: 0, axis: 'y', climate: true }]) assert.ok(sim.dispatch({ type: 'build', ...a }).ok, a.tool);
  for (let i = 0; i < 1440 * 16; i++) { sim.step(); quiet(sim); s.lessonOffer = null; }
  s.lessonsDone = { interior: 1, quality: 1, climate: 1 }; s.lessonsSeen = {};
  assert.ok(sim.objs('unit').length > 26); assert.equal(sim.objs('unit').filter((u) => u.env === 'climate' && u.cstate === 'operating').length, 7);
  return sim;
}
const products = (sim) => { const P = {}; for (const u of sim.objs('unit').filter((u) => u.cstate === 'operating')) (P[key(u)] ||= []).push(u); return P; };
const lease = (sim, u) => { const s = sim.s, tmpl = Object.values(s.leases)[0], id = 'G' + u.id; s.leases[id] = { ...tmpl, id, unit: u.id, status: 'current' }; u.lease = id; u.commercial = 'ready'; };
const vacate = (sim, u) => { if (u.lease) delete sim.s.leases[u.lease]; u.lease = null; u.commercial = 'ready'; };
const toHour = (sim) => { while (sim.mod % 60 !== 0) { sim.step(); quiet(sim); } };
const lose = (sim, sz, nLost = 8, r = 'noReady') => { sim.s.mkt.lostLog = Array.from({ length: nLost }, () => ({ d: sim.day, r, sz, climate: false })); };
// Every operating unit leased, then `otherVacant` of the 7 climate 5x5 units vacated (ready) and optionally one unit of the
// largest standard product; 8 matching losses for that standard product, on an hourly offer check. 30 operating units:
// one vacancy = 29/30 (nearly full); two or more = below the coach's 95% boundary.
function shaped({ vacantInTarget = false, otherVacant = 1 } = {}) {
  const sim = graduated(), P = products(sim);
  const target = Object.keys(P).filter((k) => k.endsWith('|std')).sort((a, b) => P[b].length - P[a].length)[0];
  for (const u of Object.values(P).flat()) if (!u.lease) lease(sim, u);
  if (vacantInTarget) vacate(sim, P[target][0]);
  for (const u of P['5x5|climate'].slice(0, otherVacant)) vacate(sim, u);
  toHour(sim); lose(sim, target.split('|')[0]); sim.s.lessonOffer = null;
  return { sim, target, ev: (k) => investmentEvidence(sim).products.find((p) => p.key === k) };
}
const offStandsNow = (sim) => T.offerStands(sim, 'up');
function el() { const c = new Set(); return { dataset: {}, innerHTML: '', textContent: '', hidden: false, firstChild: null, classList: { toggle: (k, on) => on ? c.add(k) : c.delete(k), contains: (k) => c.has(k), add: (k) => c.add(k), remove: (k) => c.delete(k) }, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }) }; }
function uiFor(sim) {
  const ui = Object.create(UI.prototype), boxes = {}; ui.g = { sim, rend: { view: 0, setFocus() {} }, audio: { unlock() {}, play() {} } }; ui.title = false;
  ui.$ = (id) => boxes[id] || (boxes[id] = el()); ui.toasts = []; ui.modalOpen = () => false; ui.sfx = () => {};
  ui.root = { querySelectorAll: () => [], querySelector: () => null, classList: el().classList }; globalThis.innerWidth = 393; globalThis.innerHeight = 659; return ui;
}

const occ = (sim) => sim.occupancy();
test('supported near-full scenario: a vacancy in another product does not suppress a supported product, up is offered', () => {
  const { sim, target, ev } = shaped();
  assert.equal(ev(target).demandSupported, true); assert.equal(ev('5x5|climate').readyVacancies, 1);
  assert.ok(occ(sim).n >= 4 && occ(sim).pct >= 0.95, JSON.stringify(occ(sim)));
  sim.poll(); assert.equal(sim.s.lessonOffer, 'up');
});
test('option (b), natural graduation case: supported product but substantial vacancies elsewhere (below 95%): no automatic offer', () => {
  const { sim, target, ev } = shaped({ otherVacant: 7 });
  assert.equal(ev(target).demandSupported, true); assert.equal(ev('5x5|climate').readyVacancies, 7); assert.ok(occ(sim).pct < 0.95);
  sim.poll(); assert.equal(sim.s.lessonOffer, null); assert.ok(!(sim.s.lessonsSeen || {}).up);
  assert.equal(T.offerStands(sim, 'up'), false);
});
test('option (b), boundary: one extra vacancy (28/30) suppresses an offer that 29/30 allows', () => {
  const { sim } = shaped({ otherVacant: 2 }); assert.ok(occ(sim).pct < 0.95); sim.poll(); assert.equal(sim.s.lessonOffer, null);
  lease(sim, products(sim)['5x5|climate'].find((u) => !u.lease)); assert.ok(occ(sim).pct >= 0.95); toHour(sim); sim.poll(); assert.equal(sim.s.lessonOffer, 'up');
});
test('nearly full but a rent-ready vacancy in the lost product, nothing supported: no automatic offer (product evidence still required)', () => {
  const { sim, target, ev } = shaped({ vacantInTarget: true, otherVacant: 0 }); assert.ok(occ(sim).pct >= 0.95);
  assert.deepEqual(ev(target).demandReasons, ['ready_vacancies']); assert.equal(ev(target).losses, 8);
  sim.poll(); assert.equal(sim.s.lessonOffer, null); assert.ok(!(sim.s.lessonsSeen || {}).up);
});
test('lost product without operating stock (5x5 standard), no relevant vacancy anywhere: up is offered', () => {
  const sim = graduated(); for (const u of sim.objs('unit').filter((u) => u.cstate === 'operating' && !u.lease)) lease(sim, u);
  toHour(sim); lose(sim, '5x5', 8, 'noSize'); sim.s.lessonOffer = null;
  assert.deepEqual(investmentEvidence(sim).products.find((p) => p.key === '5x5|std').demandReasons, ['no_operating_stock']);
  sim.poll(); assert.equal(sim.s.lessonOffer, 'up');
});
test('short observation window with relevant vacancies: no automatic offer', () => {
  const { sim, target } = shaped({ otherVacant: 0 }); vacate(sim, products(sim)[target][0]); assert.ok(occ(sim).pct >= 0.95); sim.s.finance.observedFrom = sim.day - 5;
  assert.equal(investmentEvidence(sim).products.some((p) => p.demandSupported), false); sim.poll(); assert.equal(sim.s.lessonOffer, null);
});
test('the original threshold still applies: fewer than 8 noReady/noSize losses never offers', () => {
  const { sim, target } = shaped(); lose(sim, target.split('|')[0], 7); sim.poll(); assert.equal(sim.s.lessonOffer, null);
});
test('stale pending offer survives save/load unchanged, then a paused off-hour poll withdraws it: clock, Pause and save keys kept', () => {
  const { sim } = shaped({ vacantInTarget: true, otherVacant: 0 }); sim.step(); quiet(sim); assert.notEqual(sim.mod % 60, 0);
  sim.s.lessonOffer = 'up'; sim.s.speed = 0; const keys = Object.keys(sim.s).sort().join();
  const loaded = new Sim(JSON.parse(JSON.stringify(sim.s))); T.installTutorial(loaded); const t0 = loaded.s.t;
  assert.equal(loaded.s.lessonOffer, 'up', 'no save-format change: the field loads as written'); assert.equal(offStandsNow(loaded), false);
  loaded.poll(); loaded.poll();
  assert.equal(loaded.s.lessonOffer, null); assert.equal(loaded.s.t, t0); assert.equal(loaded.s.speed, 0);
  assert.ok(!(loaded.s.lessonsSeen || {}).up, 'withdrawn, not dismissed'); assert.equal(Object.keys(loaded.s).sort().join(), keys);
});
test('option (b): a valid pending offer is withdrawn by a paused off-hour poll and on load once occupancy falls below 95%', () => {
  const { sim } = shaped(); sim.poll(); assert.equal(sim.s.lessonOffer, 'up'); sim.step(); quiet(sim); assert.notEqual(sim.mod % 60, 0); sim.s.speed = 0;
  for (const u of products(sim)['5x5|climate'].filter((u) => u.lease).slice(0, 3)) vacate(sim, u); assert.ok(occ(sim).pct < 0.95);
  const keys = Object.keys(sim.s).sort().join();
  const loaded = new Sim(JSON.parse(JSON.stringify(sim.s))); T.installTutorial(loaded); const t0 = loaded.s.t; assert.equal(loaded.s.lessonOffer, 'up');
  loaded.poll(); assert.equal(loaded.s.lessonOffer, null); assert.equal(loaded.s.t, t0); assert.equal(loaded.s.speed, 0); assert.ok(!(loaded.s.lessonsSeen || {}).up);
  assert.equal(Object.keys(loaded.s).sort().join(), keys);
  const t1 = sim.s.t; sim.poll(); assert.equal(sim.s.lessonOffer, null); assert.equal(sim.s.t, t1); assert.equal(sim.s.speed, 0); assert.ok(!(sim.s.lessonsSeen || {}).up);
});
test('a pending offer that still stands is kept by a paused poll', () => {
  const { sim } = shaped(); sim.step(); quiet(sim); sim.s.lessonOffer = 'up'; sim.s.speed = 0; sim.poll();
  assert.equal(sim.s.lessonOffer, 'up'); assert.equal(sim.s.speed, 0);
});
test('a withdrawn offer can be offered again when the evidence later supports it', () => {
  const { sim, target } = shaped({ vacantInTarget: true, otherVacant: 0 }); sim.s.lessonOffer = 'up'; sim.poll(); assert.equal(sim.s.lessonOffer, null);
  lease(sim, products(sim)[target].find((u) => !u.lease)); toHour(sim); lose(sim, target.split('|')[0]); sim.poll(); assert.equal(sim.s.lessonOffer, 'up');
});
test('UI: a stale offer is never shown and never holds time (2x stays 2x; manual Pause stays Pause)', () => {
  for (const [v, o] of [[2, { vacantInTarget: true, otherVacant: 0 }], [0, { vacantInTarget: true, otherVacant: 0 }], [2, { otherVacant: 7 }], [0, { otherVacant: 7 }]]) {
    const { sim } = shaped(o); sim.s.lessonOffer = 'up'; sim.s.speed = v; const ui = uiFor(sim); ui.renderTut(true);
    assert.ok(!(ui.popupBlocks || new Set()).has('lessonOffer')); assert.doesNotMatch(ui.$('tut').innerHTML, /lesson-chip/); assert.equal(sim.s.speed, v);
  }
});
test('UI: a valid offer still shows, holds time, and X restores the prior speed', () => {
  const { sim } = shaped(); sim.poll(); assert.equal(sim.s.lessonOffer, 'up'); sim.s.speed = 2; const ui = uiFor(sim);
  ui.renderTut(true); assert.ok(ui.popupBlocks.has('lessonOffer')); assert.equal(sim.s.speed, 0); assert.match(ui.$('tut').innerHTML, /lesson-chip/);
  ui.onClick({ target: { closest: () => ({ dataset: { a: 'lessonLater', v: 'up' } }) } });
  assert.equal(sim.s.speed, 2); assert.ok(!ui.popupBlocks.has('lessonOffer')); assert.equal(sim.s.lessonsSeen.up, sim.day);
});
test('UI: a manual Pause chosen while a valid offer holds time is what closing it restores', () => {
  const { sim } = shaped(); sim.poll(); sim.s.speed = 4; const ui = uiFor(sim); ui.renderTut(true); assert.equal(sim.s.speed, 0);
  ui.notePause(0); ui.onClick({ target: { closest: () => ({ dataset: { a: 'lessonLater', v: 'up' } }) } }); assert.equal(sim.s.speed, 0);
});
test('Growth -> Lessons keeps explicit access while the offer is suppressed (product evidence or occupancy)', () => {
  for (const o of [{ vacantInTarget: true, otherVacant: 0 }, { otherVacant: 7 }]) {
    const { sim } = shaped(o); sim.poll(); assert.equal(sim.s.lessonOffer, null);
    assert.equal(T.lessonAllowed(sim, T.lessonById('up')), true);
    const r = sim.dispatch({ type: 'lesson', op: 'start', id: 'up' }); assert.ok(r.ok); assert.equal(sim.s.lesson.id, 'up');
  }
});
test('coach agreement: whenever the automatic offer stands, the coach is not saying "rent-ready units vacant"', () => {
  for (const o of [{}, { otherVacant: 0 }, { otherVacant: 2 }, { otherVacant: 7 }, { vacantInTarget: true, otherVacant: 0 }]) {
    const { sim } = shaped(o); sim.step(); quiet(sim); const h = uiFor(sim).coachHint(); assert.ok(h && h.text, JSON.stringify(o));
    if (T.offerStands(sim, 'up')) assert.doesNotMatch(h.text, /rent-ready units vacant/, JSON.stringify(o) + ' ' + h.text);
    else if (occ(sim).pct < 0.95) assert.match(h.text, /rent-ready units vacant/, JSON.stringify(o) + ' ' + h.text);
  }
});
test('other lessons are unchanged: offer predicates byte-identical to 061daad, no revalidate flag', () => {
  const want = { interior: '(sim) => sim.day >= (sim.s.tut.gradDay || 0) + 2', quality: '(sim) => sim.s.exp.security < 0.66 || sim.day >= (sim.s.tut.gradDay || 0) + 6',
    climate: '(sim) => (sim.lostRecent(14).noClimate || 0) >= 2', collections: "(sim) => Object.values(sim.s.leases).some((L) => ['delinquent', 'lien'].includes(L.status))", financing: '() => false' };
  const sim0 = makeMaple(3);
  for (const [id, src] of Object.entries(want)) { const L = T.lessonById(id); assert.equal(String(L.offer), src, id); assert.ok(!L.revalidate, id); assert.equal(T.offerStands(sim0, id), true, id); }
});
console.log(`${n} lesson offer gate checks passed`);
