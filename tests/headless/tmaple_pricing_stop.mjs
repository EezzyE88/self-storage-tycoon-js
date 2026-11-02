// Maple Street Beat 5 "What should new tenants pay?" (campaign Unit 4): the read-only Business -> Asking rents stop,
// moved out of the expand beat into its own beat. Checks step order, progression from real UI states, skip-safety and
// fail-forward, the unchanged expand build sequence and trigger, and that guidance never writes state (asking rents and
// signed lease rents unchanged). Each check carries over an assertion of the former expand-beat version of this test.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { tutorialTick, lessonTick, BEATS, beatIndex, stepState, curBeat } from '../../js/tutorial.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const PRICING = beatIndex('pricing'), EXPAND = beatIndex('expand');
const pricing = BEATS[PRICING], expand = BEATS[EXPAND];
const rents = (label) => ({ tab: 'business', sel: null, tool: null, sectionChoice: label ? { tab: 'business', label } : null });
const rentsOf = (s) => JSON.stringify(Object.fromEntries(Object.entries(s.leases).map(([k, L]) => [k, L.rent])));

// Play the real tutorial up to the start of Beat 5 (same path as twalk).
function toPricing(seed) {
  const sim = makeMaple(seed), s = sim.s;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { sim.step(); tutorialTick(sim); lessonTick(sim); sim.events.length = 0; } };
  const until = (fn, max = 1440 * 6) => { let i = 0; while (!fn() && i < max) { tick(); i++; } assert.ok(fn(), 'tutorial reached expected state'); };
  const d = (a) => { const r = sim.dispatch(a); tutorialTick(sim); return r; };
  tick(2); d({ type: 'tutFlag', flag: 'welcome' }); tick();
  const u = s.objects[s.unitRoles.mapleTurnover]; d({ type: 'ownerMakeReady', unit: u.id }); s.speed = 4;
  until(() => curBeat(sim)?.id === 'money');
  d({ type: 'tutFlag', flag: 'businessOpened' }); tick(); d({ type: 'tutFlag', flag: 'moneyAck' }); tick();
  assert.equal(curBeat(sim).id, 'pricing');
  return { sim, tick, until, d };
}

test('Beat 5 carries the three pricing steps; the expand build sequence follows unchanged', () => {
  assert.deepEqual(BEATS.slice(PRICING - 1, EXPAND + 1).map((b) => b.id), ['money', 'pricing', 'actI_break', 'expand']);
  assert.equal(PRICING, 4, 'Beat 5'); assert.equal(pricing.title, 'What should new tenants pay?');
  assert.deepEqual(pricing.steps.map((st) => st.t), ['Open <b>Business</b>', 'Choose <b>Pricing</b>', 'Asking rents apply to <b>future leases</b>']);
  assert.deepEqual(expand.steps.map((st) => st.t), ['Open <b>Build</b>', 'Choose <b>Units</b>', 'Pick <b>Drive-Up 10x10</b>', '<b>Drag</b> a row down the grass beside the main aisle', 'Tap <b>Confirm</b>', 'Let construction finish and the units open']);
  assert.match(pricing.steps[2].d, /future leases|leases signed after the change/); assert.match(pricing.steps[2].d, /keep their current rent/); assert.match(pricing.steps[2].d, /don't need to change anything/);
  assert.equal(pricing.steps[0].sel, '#tabs [data-v="business"]'); assert.equal(pricing.steps[1].sel, '.sheet [data-section-picker]'); assert.deepEqual(pricing.steps[1].section, ['business', 'Asking rents', 'Pricing']);
  assert.equal(pricing.steps[2].sel, '.tut [data-a="tutNext"]', 'read, then Got it (was: open Build)');
  assert.ok(pricing.steps.every((st) => !st.placement && !st.blueprint), 'no placement on pricing steps');
  // The beat is acknowledged like the money beat: Got it, offered once Pricing has been seen.
  assert.equal(pricing.button, 'Got it'); assert.equal(pricing.flag, 'pricingAck');
  assert.equal(expand.button, undefined); assert.equal(expand.flag, undefined); assert.ok(!/Asking rents|Business/.test(expand.steps.map((st) => st.t + st.d).join('')), 'no pricing step left in expand');
  assert.ok(!/First look at your asking rents/.test(expand.body));
});

test('progression follows the real Business -> Pricing -> Got it path', () => {
  const { sim, d } = toPricing(20260929);
  assert.equal(stepState(sim, { tab: null, sel: null }).cur, 0, 'map: open Business');
  assert.equal(stepState(sim, rents(null)).cur, 1, 'Business open, no section: choose Pricing');
  assert.equal(stepState(sim, rents('Operating performance')).cur, 1, 'Statement left over from money beat: still choose Pricing');
  assert.equal(stepState(sim, rents('Asking rents')).cur, 2, 'Asking rents showing: read, then Got it');
  assert.equal(stepState(sim, { tab: 'operate', sel: null, sectionChoice: { tab: 'operate', label: 'Asking rents' } }).cur, 0, 'wrong tab never counts');
  assert.equal(stepState(sim, { tab: 'build', cat: 'site', sel: null }).cur, 0, 'Build open does not pass the stop');
  assert.equal(pricing.buttonWhen(sim), false, 'no Got it before Pricing is seen');
  d({ type: 'tutFlag', flag: 'pricingSeen' }); // what the UI records when Business -> Pricing is shown
  assert.equal(pricing.buttonWhen(sim), true);
  assert.equal(stepState(sim, { tab: null, sel: null }).cur, 2, 'seen, panel closed since: still read, then Got it');
  assert.equal(curBeat(sim).id, 'pricing', 'seeing Pricing alone never advances the beat');
  d({ type: 'tutFlag', flag: 'pricingAck' }); assert.equal(curBeat(sim).id, 'actI_break');
});

test('skip-safety: Pricing seen during the money beat counts; after the break the row builds straight away on the existing milestone', () => {
  const { sim, until, d, tick } = toPricing(20260929); const s = sim.s;
  const ask = JSON.stringify(s.market.ask), signed = rentsOf(s);
  // Opened during the money beat (the UI flag is recorded whatever the beat): only Got it is left.
  const early = makeMaple(20260929); early.s.tut.flags.pricingSeen = true; early.s.tut.beat = PRICING;
  assert.equal(stepState(early, { tab: null, sel: null }).cur, 2); assert.equal(pricing.buttonWhen(early), true);
  assert.equal(pricing.check(sim), false);
  d({ type: 'tutFlag', flag: 'pricingSeen' }); d({ type: 'tutFlag', flag: 'pricingAck' }); d({ type: 'tutFlag', flag: 'actI_break' }); tick();
  assert.equal(curBeat(sim).id, 'expand');
  d({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 });
  assert.equal(stepState(sim, { tab: null, sel: null }).cur, expand.steps.length - 1, 'ordered row: wait for construction');
  s.speed = 4; until(() => !!s.milestones.first_expansion, 1440 * 3);
  assert.equal(expand.check(sim), true); until(() => curBeat(sim)?.id === 'repair', 10);
  assert.equal(JSON.stringify(s.market.ask), ask, 'asking rents untouched');
  const now = JSON.parse(rentsOf(s)); assert.ok(Object.entries(JSON.parse(signed)).every(([k, r]) => !(k in now) || now[k] === r), 'signed lease rents untouched');
  // Skip tutorial on Beat 5 is still safe: tutorial off, rents untouched.
  const sk = toPricing(31).sim, ask2 = JSON.stringify(sk.s.market.ask); assert.equal(sk.dispatch({ type: 'tutSkip' }).ok, true);
  assert.equal(sk.s.tut.on, false); assert.equal(JSON.stringify(sk.s.market.ask), ask2);
});

test('guidance is read-only: evaluating every pricing state writes nothing and keeps the run identical', () => {
  const A = toPricing(777), B = toPricing(777);
  assert.equal(JSON.stringify(A.sim.s), JSON.stringify(B.sim.s), 'twins identical at Beat 5 start');
  const leases = JSON.stringify(A.sim.s.leases), ask = JSON.stringify(A.sim.s.market.ask), cash = A.sim.s.cash, flags = JSON.stringify(A.sim.s.tut.flags);
  const uis = [{ tab: null, sel: null }, rents(null), rents('Operating performance'), rents('Asking rents'), { tab: 'build', cat: 'units', sel: null }];
  const before = JSON.stringify(A.sim.s);
  for (const ui of uis) { stepState(A.sim, ui); curBeat(A.sim); }
  assert.equal(JSON.stringify(A.sim.s), before, 'stepState/curBeat do not mutate state');
  A.sim.s.speed = 1; B.sim.s.speed = 1;
  for (let i = 0; i < 1440; i++) { A.tick(); B.tick(); stepState(A.sim, uis[i % uis.length]); curBeat(A.sim); }
  assert.equal(JSON.stringify(A.sim.s), JSON.stringify(B.sim.s), 'one game day with guidance polled every minute matches the unpolled twin');
  assert.equal(JSON.stringify(A.sim.s.market.ask), ask, 'asking rents unchanged');
  assert.equal(JSON.stringify(A.sim.s.tut.flags), flags, 'no tutorial flag written');
  assert.equal(curBeat(A.sim).id, 'pricing', 'pricing stop alone never advances the beat');
  assert.ok(Object.keys(JSON.parse(leases)).every((k) => !A.sim.s.leases[k] || A.sim.s.leases[k].rent === JSON.parse(leases)[k].rent), 'existing lease rents unchanged');
  assert.ok(typeof cash === 'number');
});

test('the story uses live occupancy and vacancy', () => {
  const { sim } = toPricing(20260929); const o = sim.occupancy(), vac = o.n - o.occ;
  const body = curBeat(sim).body; const shown = curBeat(sim).steps.slice(0, 2).map((st) => st.d);
  for (const d of shown) assert.ok(d.includes(vac ? `<b>${o.occ} of ${o.n}</b> units are leased` : `All <b>${o.n}</b> units are leased`), 'the coach steps carry the live figures: ' + d);
  if (vac) assert.ok(body.includes(`<b>${o.occ} of ${o.n}</b> units are leased`) && body.includes(`<b>${vac}</b>`), body);
  else assert.ok(body.includes(`All <b>${o.n}</b> units are leased`), body); // this scripted run reaches Beat 5 full
  // A vacancy is reported as it is: free one unit on a fresh game positioned at Beat 5.
  const part = makeMaple(5); part.s.tut.beat = PRICING; const p = part.occupancy();
  assert.ok(curBeat(part).body.includes(p.n - p.occ ? `<b>${p.occ} of ${p.n}</b> units are leased and <b>${p.n - p.occ}</b>` : `All <b>${p.n}</b>`));
  assert.ok(p.n - p.occ > 0, 'fresh Maple Street has vacancy');
});

test('save/reload mid-stop restores the same step', () => {
  const { sim, d } = toPricing(20260929);
  const re = new Sim(JSON.parse(JSON.stringify(sim.s)));
  for (const ui of [{ tab: null, sel: null }, rents(null), rents('Asking rents'), { tab: 'build', cat: 'site', sel: null }]) assert.equal(stepState(re, ui).cur, stepState(sim, ui).cur);
  assert.equal(JSON.stringify(re.s), JSON.stringify(sim.s));
  d({ type: 'tutFlag', flag: 'pricingSeen' }); const re2 = new Sim(JSON.parse(JSON.stringify(sim.s)));
  assert.equal(curBeat(re2).id, 'pricing'); assert.equal(stepState(re2, { tab: null, sel: null }).cur, 2); assert.equal(pricing.buttonWhen(re2), true);
});

console.log(`${passed} Maple pricing stop checks passed`);
