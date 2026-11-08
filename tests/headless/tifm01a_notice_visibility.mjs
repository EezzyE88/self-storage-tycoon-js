// IFM-01A successor: the restored-access notice waits until the toast area is visible, then is not displaced by later toasts.
import assert from 'node:assert/strict';
let now = 10000; globalThis.performance = { now: () => now };
const element = () => ({ innerHTML: '', removed: false, className: '', classList: { remove() {}, add() {} }, remove() { this.removed = true; } });
globalThis.document = { createElement: element };
const { makeScenario } = await import('../../js/scenarios.js');
const { UI } = await import('../../js/ui.js');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('PASS ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + (e.stack || e.message)); } }
const MSG = 'Elevator repaired: 49 units regained customer access';
function ui({ phone = true } = {}) {
  const sim = makeScenario('vertical'); const u = Object.create(UI.prototype); const cls = new Set(); let banner = false, modal = null;
  u.g = { sim, showcase: { bannerBusy: () => banner } }; Object.defineProperty(u, 'sim', { get: () => sim, configurable: true });
  u.toasts = []; u.title = false; u.phone = () => phone; u.sfx = () => {};
  u.root = { classList: { contains: (c) => cls.has(c) } };
  const feed = { kids: [], appendChild(e) { this.kids.push(e); } };
  u.$ = (id) => (id === 'feed' ? feed : id === 'modal' ? { firstChild: modal } : null);
  return { u, sim, sheet: (on) => (on ? cls.add('has-sheet') : cls.delete('has-sheet')), banner: (on) => { banner = on; }, modal: (on) => { modal = on ? {} : null; },
    shown: () => u.toasts.map((t) => t.text) };
}
const restored = { type: 'access_restored', n: 49, equip: 'Elevator', name: 'Unit 2001' };
const lease = 'Lease signed: Unit 2020 at $168.75/mo · reserved for move-in';

test('clear screen: notice shows at once, as a kept toast', () => { const f = ui(); f.u.onEvent(restored); assert.deepEqual(f.shown(), [MSG]); assert.equal(f.u.toasts[0].keep, true); assert.equal(f.u.heldNotice, null); });
test('sheet open: notice waits, then shows when the sheet closes', () => {
  const f = ui(); f.sheet(true); f.u.onEvent(restored); assert.deepEqual(f.shown(), []); assert.equal(f.u.heldNotice.text, MSG);
  now += 60000; f.u.flushNotice(); assert.deepEqual(f.shown(), []); f.sheet(false); f.u.flushNotice(); assert.deepEqual(f.shown(), [MSG]); assert.equal(f.u.heldNotice, null);
});
test('celebration banner: notice waits for it, then replaces the autosave toast', () => {
  const f = ui(); f.banner(true); f.u.onEvent(restored); f.u.toast('Progress saved', 'good'); assert.deepEqual(f.shown(), ['Progress saved']);
  now += 4000; f.banner(false); f.u.flushNotice(); assert.deepEqual(f.shown(), [MSG]);
});
test('dialog open: notice waits', () => { const f = ui(); f.modal(true); f.u.onEvent(restored); assert.deepEqual(f.shown(), []); f.modal(false); f.u.flushNotice(); assert.deepEqual(f.shown(), [MSG]); });
test('phone: autosave and an immediate lease show beside the notice instead of replacing it', () => {
  const f = ui(); f.u.onEvent(restored); now += 20; f.u.toast(lease, 'good'); assert.deepEqual(f.shown(), [MSG, lease]);
  now += 20; f.u.toast('Progress saved', 'good'); assert.deepEqual(f.shown(), [MSG, 'Progress saved']); // the newer routine toast takes the ordinary slot
  assert.equal(f.u.toasts[0].el.removed, false);
});
test('phone: ordinary toasts still replace each other one at a time', () => { const f = ui(); f.u.toast('A'); f.u.toast('B'); assert.deepEqual(f.shown(), ['B']); });
test('kept notice keeps its normal life, then the one-toast rule returns', () => {
  const f = ui(); f.u.onEvent(restored); now += 4700; f.u.toast('Later'); f.u.toast('Later 2'); assert.deepEqual(f.shown(), ['Later 2']);
});
test('desktop keeps three toasts and the notice is not pushed out early', () => {
  const f = ui({ phone: false }); f.u.onEvent(restored); for (const t of ['a', 'b', 'c', 'd']) f.u.toast(t); assert.deepEqual(f.shown(), [MSG, 'b', 'c', 'd']);
});
test('a held notice is dropped if customer access is lost again before it shows', () => {
  const f = ui(); f.sheet(true); f.u.onEvent(restored); f.u.onEvent({ type: 'access_lost', n: 49, why: 'Elevator is out of service' }); f.sheet(false); f.u.flushNotice();
  assert.ok(!f.shown().includes(MSG)); assert.equal(f.u.heldNotice, null);
});
test('one slot: a newer restored notice replaces a held one', () => {
  const f = ui(); f.sheet(true); f.u.onEvent(restored); f.u.onEvent({ ...restored, n: 1 }); f.sheet(false); f.u.flushNotice();
  assert.deepEqual(f.shown(), ['Elevator repaired: Unit 2001 regained customer access']);
});
test('other notices are unchanged: a lost-access toast still shows at once', () => {
  const f = ui(); f.u.onEvent({ type: 'access_lost', n: 49, why: 'Elevator is out of service' }); assert.deepEqual(f.shown(), ['49 units lost customer access - Elevator is out of service']); assert.equal(f.u.toasts[0].keep, false);
});
test('no restored event, no notice (zero-restore stays silent)', () => { const f = ui(); f.u.onEvent({ type: 'repaired', obj: 1, x: 0, y: 0, f: 0 }); assert.equal(f.u.heldNotice ?? null, null); assert.ok(!f.shown().some((t) => /regained/.test(t))); });
test('the held notice is UI-only and never enters the saved state', () => { const f = ui(); f.sheet(true); f.u.onEvent(restored); assert.ok(!JSON.stringify(f.sim.s).includes('regained')); assert.ok(!JSON.stringify(f.sim.s).includes('heldNotice')); });
console.log(`${passed} IFM-01A notice visibility groups passed`); if (failed) { console.log('SOME FAILED'); process.exitCode = 1; }
