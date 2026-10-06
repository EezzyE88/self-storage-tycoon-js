// Candidate 22 browser-emulation QA (headless Chromium with iPhone-sized viewports; NOT a physical iPhone).
// Usage: python3 -m http.server 5173 &  then  node tests/browser-qa/c22-emulation.cjs [screenshot-dir]
// Playwright: resolved from node_modules, or set PLAYWRIGHT_MODULE to its path.
const assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs');
let pw; try { pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const OUT = path.resolve(process.argv[2] || '/tmp/c22-shots'); fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.QA_URL || 'http://localhost:5173/?cid=qa';
const results = []; const errors = [];
async function open(width, height) {
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const phone = Math.min(width, height) < 600; // phone sizes emulate touch at 2x; desktop uses a mouse at 1x (2x software-GL desktop frames starve Playwright's stability checks)
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_(TUNNEL|CONNECTION|NAME)|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.addInitScript(() => window.addEventListener('unhandledrejection', (e) => console.error('unhandledrejection ' + (e.reason && e.reason.message || e.reason))));
  await p.goto(URL); await p.waitForFunction(() => window.__game && __game.ui, null, { timeout: 30000 });
  return { browser, p };
}
const frames = async (p, n = 5) => { const f = (n) => p.evaluate((n) => { const g = __game; for (let i = 0; i < n; i++) { g.rend.frame(1 / 30); g.ui.update(1 / 30); } }, n); await f(n); await p.waitForTimeout(400); await f(3); };
const guide = (p) => p.evaluate(() => { const r = document.querySelector('#guide'); return r && !r.hidden ? { lbl: r.innerText, cls: r.className } : null; });
const tutText = (p) => p.evaluate(() => document.querySelector('#tut').innerText.replace(/\s+/g, ' ').trim());
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null; // optional subset, e.g. QA_ONLY='^[A-F]\.'
async function scenario(name, w, h, fn) { if (ONLY && !ONLY.test(name)) return; const { browser, p } = await open(w, h); try { await fn(p); results.push({ name, viewport: `${w}x${h}`, pass: true }); console.log('PASS', name); } catch (e) { results.push({ name, viewport: `${w}x${h}`, pass: false, error: e.message }); console.log('FAIL', name, e.message); await p.screenshot({ path: path.join(OUT, name.replace(/\W+/g, '_') + '-fail.png') }).catch(() => {}); } finally { await browser.close(); } }
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
const tutorialBeat = (p, id) => p.evaluate(async (id) => { const g = __game; const m = await import('./js/tutorial.js'); g.sim.s.tut.beat = m.BEATS.findIndex((b) => b.id === id); g.ui.tutMin = true; g.ui.renderTut(true); }, id);
const plainGame = (p) => p.evaluate(() => { const g = __game; g.newGame('maple'); g.ui.title = false; g.ui.closeModal(); const s = g.sim.s; s.tut.on = false; s.tut.done = true; s.cash = 1e6; s.open = true; });

(async () => {
  await scenario('tutorial 1x is never targeted while inert; Back to map keeps the paused clock, then 1x works', 393, 659, async (p) => {
    await p.click('[data-a="new"][data-v="maple"]'); await p.evaluate(() => { __game.ui.tutLooked = true; }); await frames(p); await p.click('.tut [data-a="tutNext"]'); await frames(p);
    await p.evaluate(() => { const g = __game; g.ui.select(g.sim.objs('unit').find((u) => u.num === 107).id); }); await frames(p);
    assert.match(await tutText(p), /Owner Make-Ready/); assert.ok(await p.isVisible('#tut .how-line'), 'how-to line visible in the docked strip'); await p.click(`[data-cmd*='"ownerMakeReady"']`); await frames(p);
    assert.match(await tutText(p), /Start the clock: tap 1x/); await shot(p, 'tut-1x');
    await p.click('[data-a="sheetGrow"]'); await frames(p);
    assert.match(await tutText(p), /Back to map/); assert.equal((await guide(p)).lbl, 'Back to map'); await shot(p, 'tut-back-to-map');
    await p.click('#speed [data-v="1"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.speed), 0);
    await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.speed), 0, 'Back to map restores the paused clock');
    assert.match(await tutText(p), /Start the clock: tap 1x/); await p.click('#speed [data-v="1"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.speed), 1);
    assert.match(await tutText(p), /Watch the Owner finish/); assert.equal((await guide(p)).lbl, 'Watch here');
  });
  await scenario('selected Units category advances to the revealed Drive-Up 10x10 card; staff uses the section selector', 393, 659, async (p) => {
    await p.click('[data-a="new"][data-v="maple"]'); await frames(p); await tutorialBeat(p, 'expand'); await frames(p);
    await p.click('#tabs [data-v="build"]'); await frames(p); assert.match(await tutText(p), /Pick Drive-Up 10x10/);
    const r = await p.evaluate(() => { const e = document.querySelector('[data-a="tool"][data-v="du10x10"]'); const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, w: innerWidth }; }); assert.ok(r.l >= 0 && r.r <= r.w, 'card on screen');
    const ring = await p.evaluate(() => { const g = document.querySelector('#guide'), e = document.querySelector('[data-a="tool"][data-v="du10x10"]'); if (g.hidden) return null; const a = g.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom; }); assert.equal(ring, true, 'ring surrounds the card'); await shot(p, 'tut-card');
    await p.evaluate(() => { const g = __game; g.ui.tool = null; g.ui.renderActionBar(); g.ui.setTab(null); }); await tutorialBeat(p, 'hire'); await frames(p);
    await p.click('#tabs [data-v="operate"]'); await frames(p); assert.match(await tutText(p), /Choose Hire in the section selector/); assert.ok(await p.evaluate(() => { const g = document.querySelector('#guide'), e = document.querySelector('.sheet [data-section-picker]'); if (g.hidden) return false; const a = g.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom; }), 'ring on the section selector');
    await p.selectOption('.sheet [data-section-picker]', 'Hire capacity'); await frames(p); assert.ok(await p.evaluate(() => !!document.querySelector(`[data-cmd*='"role":"porter"']`))); assert.match(await tutText(p), /Tap Hire Porter/);
  });
  await scenario('Requests: security map and Cause & remedy open above, paused, and return predictably', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => { const g = __game, u = g.sim.objs('unit')[0]; g.sim.convo({ key: 'bi' + u.id, obj: u.id, who: 'Tenant', text: 'It feels unsafe at night.', sev: 'attention', overlay: 'security', actions: [{ label: 'Dismiss' }] }); g.ui.renderFeed(true); }); await frames(p);
    await p.click('[data-a="requests"]'); await frames(p); await p.click('.modal [data-a="overlay"]'); await frames(p);
    assert.deepEqual(await p.evaluate(() => [!!document.querySelector('.modal-bg'), __game.rend.overlay, __game.sim.s.speed]), [false, 'security', 0]);
    await p.click('[data-a="requests"]'); await frames(p); await p.click('.modal [data-a="requestHelp"]'); await frames(p);
    assert.deepEqual(await p.evaluate(() => [!!document.querySelector('.modal-bg'), __game.ui.tab, __game.sim.s.speed]), [false, 'feedback', 0]); await shot(p, 'requests-remedy');
    await p.click('.sheet [data-a="close"]'); await frames(p); assert.ok(await p.evaluate(() => /Requests/.test(document.querySelector('.modal')?.innerText || '')));
  });
  await scenario('new game and import isolate transient UI; import is validated and confirmed; saved floor restores', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => { __game.rend.setOverlay('security'); __game.ui.setView(0); }); const code = await p.evaluate(() => __game.saveCode());
    await p.evaluate(() => __game.newGame('custom', { kind: 'business', start: 'empty' })); await frames(p);
    assert.deepEqual(await p.evaluate(() => [__game.rend.overlay, __game.rend.view]), [null, 'ext']);
    await p.evaluate(() => __game.ui.showLoad()); await frames(p); await p.fill('#loadTa', 'garbage'); await p.click('[data-a="loadCode"]'); await frames(p);
    assert.equal(await p.evaluate(() => localStorage.getItem('sst.kept.previous')), null); assert.ok(await p.evaluate(() => __game.metaName().includes('Lot')));
    await p.fill('#loadTa', code); await p.click('[data-a="loadCode"]'); await frames(p);
    const c = await p.evaluate(() => document.querySelector('.confirm-import').innerText); assert.match(c, /Incoming: Maple Street Storage/); assert.match(c, /Currently running: Suburban Lot/); assert.match(c, /Stored as your previous game: Suburban Lot/); await shot(p, 'import-confirm');
    await p.click('[data-a="importYes"]'); await frames(p);
    assert.deepEqual(await p.evaluate(() => [__game.metaName(), __game.sim.s.speed, __game.rend.overlay, __game.rend.view, JSON.parse(localStorage.getItem('sst.kept.previous')).meta.name]), ['Maple Street Storage', 0, null, 0, 'Suburban Lot']);
    // A second import displaces Suburban Lot into Older saved games instead of discarding it.
    await p.evaluate(() => __game.ui.showLoad()); await p.fill('#loadTa', code); await p.click('[data-a="loadCode"]'); await frames(p);
    assert.match(await p.evaluate(() => document.querySelector('.confirm-import').innerText), /existing previous game \(Suburban Lot.*\) moves to Older saved games/);
    await p.click('[data-a="importYes"]'); await frames(p); assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('sst.kept.archive'))[0].meta.name), 'Suburban Lot');
  });
  await scenario('F2/F3 floor selection, labels, completion and save/reload agree', 393, 659, async (p) => {
    await plainGame(p);
    const done = await p.evaluate(() => { const g = __game, sim = g.sim, out = []; const t = g.ui.toast.bind(g.ui); g.ui.toast = (m, k) => { if (/finished/.test(m)) out.push(m); t(m, k); };
      for (let n = 0; n < 2; n++) { const R = sim.verticalPlan(12); sim.dispatch({ type: 'verticalUpgrade', ...R }); const o = sim.s.orders.at(-1); for (let i = 0; i < 60000 && o.st === 'construction'; i++) { sim.step(); if (sim.events.length > 50) g.drain(); } g.drain(); sim.dispatch({ type: 'commission', order: o.id }); } return out; });
    assert.deepEqual(done.filter((m) => /→ F/.test(m)), ['Building 12 → F2 finished - 14/14 order units ready to commission', 'Building 12 → F3 finished - 14/14 order units ready to commission']);
    for (const [f, num, label] of [[1, 307, 'Floor 2'], [2, 315, 'Floor 3']]) {
      await p.click('[data-a="floorChoose"]'); await frames(p); await p.click(`[data-a="floorPick"][data-building="12"][data-v="${f}"]`); await frames(p);
      await p.evaluate((n) => __game.ui.select(__game.sim.objs('unit').find((u) => u.num === n).id), num); await frames(p);
      assert.deepEqual(await p.evaluate(() => [__game.rend.view, [...document.querySelectorAll('#floors button.on')].map((b) => b.textContent)]), [f, [`F${f + 1} ▾`]]);
      assert.match(await p.evaluate(() => document.querySelector('.sheet').innerText), new RegExp(label)); await shot(p, 'floor-' + (f + 1));
    }
    await p.click('#floors [data-v="0"]'); await frames(p); assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('#floors button.on')].map((b) => b.textContent)), ['F1']);
    await p.evaluate(() => { __game.ui.select(null); __game.ui.setView(2); }); const code = await p.evaluate(() => __game.saveCode()); await p.evaluate(async (c) => { await __game.loadCode(c); }, code); await frames(p);
    assert.deepEqual(await p.evaluate(() => [__game.rend.view, [...document.querySelectorAll('#floors button.on')].map((b) => b.textContent)]), [2, ['F3 ▾']]);
  });
  await scenario('iPhone expansion review: full terms, preview on map keeps the quote, single charge', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => __game.ui.showVertical(12)); await frames(p);
    const t = await p.evaluate(() => document.querySelector('.vr-body').innerText); for (const re of [/REQUIRED/i, /Freight elevator access/, /Extend existing stairs/, /UNIT MIX & DEMAND EVIDENCE/i, /Complete package \$17,810/i, /Cancellation:/]) assert.match(t, re);
    const sizes = await p.evaluate(() => [...document.querySelectorAll('.vr-opt input')].map((i) => Math.round(i.getBoundingClientRect().width))); assert.ok(sizes.every((w) => w >= 24)); await shot(p, 'review');
    await p.click('[data-a="verticalPreview"]'); await frames(p); await shot(p, 'review-preview');
    assert.deepEqual(await p.evaluate(() => [!!document.querySelector('.modal-bg'), __game.ui.verticalQuote.cost, __game.rend.previewG.children.length > 0, __game.sim.s.speed, document.querySelector('[data-a="floorChoose"]').textContent]), [false, 17810, true, 0, 'F2 new ▾']);
    const bar = await p.evaluate(() => document.querySelector('#abar .actionbar').getBoundingClientRect()); assert.ok(bar.top > 659 * 0.5, 'compact bar leaves the map visible');
    await p.click('[data-a="verticalBack"]'); await frames(p); assert.ok(await p.evaluate(() => !!document.querySelector('.modal.vreview')));
    await p.click('[data-a="verticalPreview"]'); await frames(p); const cash = await p.evaluate(() => __game.sim.s.cash); await p.click('#abar [data-a="verticalConfirm"]'); await frames(p);
    assert.equal(cash - await p.evaluate(() => __game.sim.s.cash), 17810);
  });
  await scenario('landscape 734x343: rotate prompt pauses; portrait restores the previous speed', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => __game.sim.dispatch({ type: 'speed', v: 2 })); await frames(p);
    await p.setViewportSize({ width: 734, height: 343 }); await frames(p); await shot(p, 'landscape');
    assert.deepEqual(await p.evaluate(() => [getComputedStyle(document.querySelector('#rotate')).display, getComputedStyle(document.querySelector('#ui')).visibility, __game.sim.s.speed]), ['flex', 'hidden', 0]);
    await p.setViewportSize({ width: 393, height: 659 }); await frames(p); assert.deepEqual(await p.evaluate(() => [getComputedStyle(document.querySelector('#rotate')).display, __game.sim.s.speed]), ['none', 2]);
  });


  await scenario('P. temporary pauses restore the previous speed; manual Pause survives panels, dialogs, confirmations and requests', 393, 659, async (p) => {
    const speed = () => p.evaluate(() => __game.sim.s.speed);
    // Real time runs between steps, so a genuine request or milestone banner may hold its own pause; it must then restore v.
    const restored = async (v, msg) => { const r = await p.evaluate(() => ({ s: __game.sim.s.speed, n: (__game.ui.popupBlocks || new Set()).size, r: __game.ui.popupResume, k: [...(__game.ui.popupBlocks || [])] })); assert.ok(r.s === v || (r.n > 0 && r.r === v), `${msg}: ${JSON.stringify(r)}`); };
    // Optional-lesson offers legitimately hold time (and make run speeds inert) until dismissed; keep them out of this scenario.
    await plainGame(p); await p.evaluate(async () => { const m = await import('./js/tutorial.js'); for (const L of m.LESSONS) __game.sim.dispatch({ type: 'lesson', op: 'dismiss', id: L.id }); __game.ui.resumePopup('lessonOffer'); });
    await p.click('#speed [data-v="2"]'); await frames(p); assert.equal(await speed(), 2);
    await p.click('#tabs [data-v="business"]'); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await speed(), 0, 'Details pauses');
    await p.click('[data-a="sheetGrow"]'); await frames(p); await restored(2, 'Back to map restores 2x');
    await p.click('.sheet [data-a="close"]'); await frames(p);
    await p.click('#speed [data-v="0"]'); await frames(p); await p.evaluate(() => __game.ui.showVertical(12)); await frames(p); await p.click('[data-qa="vr-preview"]'); await frames(p);
    await p.click('#abar [data-qa="vp-confirm"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.orders.at(-1).st), 'construction'); assert.equal(await speed(), 0, 'confirmation keeps a manual Pause');
    await p.click('#speed [data-v="4"]'); await frames(p); await p.click('[data-a="floorChoose"]'); await frames(p); assert.equal(await speed(), 0); await p.click('[data-qa="floors-close"]'); await frames(p); await restored(4, 'closing the chooser restores 4x');
    await p.evaluate(() => __game.ui.select(12)); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p); await p.click('#speed [data-v="0"]'); await frames(p);
    await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await speed(), 0, 'Pause tapped inside a panel survives Back to map');
    // Disclosed setup: a customer request that arrived on its own while 4x ran would make this tap inert by design
    // (run speeds do nothing during a hold), so such requests are cleared first; the injected request below is the test.
    await p.evaluate(() => { __game.sim.s.convos.length = 0; __game.ui.renderFeed(true); }); await frames(p);
    await p.click('#speed [data-v="1"]'); await frames(p); await restored(1, '1x tapped after the panel closed'); await p.evaluate(() => { const g = __game; g.ui.select(null); g.sim.convo({ key: 'qa', who: 'Tenant', text: 'Hello', sev: 'attention', actions: [{ label: 'Thanks' }] }); g.ui.renderFeed(true); }); await frames(p); assert.equal(await speed(), 0, 'a request pauses');
    await p.click('[data-a="requests"]'); await frames(p); await p.click('.modal [data-a="convo"]'); await frames(p); await p.evaluate(() => __game.ui.closeModal()); await frames(p); await restored(1, 'answering restores 1x');
  });

  await scenario('R. real keyboard: Space during a hold or photo Freeze records Pause; Unfreeze/Done keep it; unaffordable Confirm is disabled', 1280, 720, async (p) => {
    const speed = () => p.evaluate(() => __game.sim.s.speed), clock = () => p.evaluate(() => __game.sim.s.t);
    await plainGame(p); await p.click('#speed [data-v="4"]'); await frames(p);
    await p.click('#tabs [data-v="business"]'); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await speed(), 0);
    await p.keyboard.press('Space'); await frames(p); assert.equal(await speed(), 0, 'Space during the hold never runs time');
    await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await speed(), 0, 'Back to map keeps the manual Pause');
    await p.click('.sheet [data-a="close"]'); await frames(p);
    for (const exit of ['unfreeze', 'done']) {
      await p.click('#speed [data-v="4"]'); await frames(p); await p.evaluate(() => __game.showcase.enterPhoto()); await frames(p);
      await p.click('[data-p="freeze"]'); await frames(p); assert.equal(await speed(), 0, 'Freeze holds time');
      await p.keyboard.press('Space'); const t0 = await clock(); await p.waitForTimeout(1200); await frames(p); assert.equal(await speed(), 0, 'Space while frozen does not run time'); assert.equal(await clock(), t0, 'game clock did not advance while frozen');
      await p.click(exit === 'unfreeze' ? '[data-p="freeze"]' : '[data-p="done"]'); await frames(p); assert.equal(await speed(), 0, `${exit} preserves the manual Pause`);
      if (exit === 'unfreeze') await p.click('[data-p="done"]'); await frames(p);
    }
    await p.click('#speed [data-v="4"]'); await frames(p); await p.evaluate(() => __game.showcase.enterPhoto()); await frames(p); await p.click('[data-p="freeze"]'); await frames(p); await p.click('[data-p="done"]'); await frames(p);
    const r = await p.evaluate(() => ({ s: __game.sim.s.speed, n: (__game.ui.popupBlocks || new Set()).size, r: __game.ui.popupResume })); assert.ok(r.s === 4 || (r.n > 0 && r.r === 4), 'without a Pause, leaving Freeze restores 4x');
    await p.evaluate(() => { const g = __game; g.sim.dispatch({ type: 'speed', v: 0 }); g.sim.s.cash = 100; g.ui.pickTool('du10x10'); g.ui.planArgs = { a: { x: 13, y: 21 }, b: { x: 13, y: 23 }, axis: 'y' }; g.ui.replan(); g.ui.renderActionBar(); }); await frames(p);
    const c = await p.evaluate(() => ({ disabled: document.querySelector('#abar [data-a="confirm"]').disabled, text: document.querySelector('#abar').innerText })); assert.equal(c.disabled, true); assert.match(c.text, /Not enough cash: needs \$[\d,]+ more/);
  });
  // ---- Grok addendum A-F ----
  for (const [w, h] of [[393, 659], [1280, 720]]) await scenario(`A. Tap Unit 107 ring is on the unit's pin and a real tap completes the step (${w}x${h})`, w, h, async (p) => {
    await p.click('[data-a="new"][data-v="maple"]'); await p.evaluate(() => { __game.ui.tutLooked = true; }); await frames(p); await p.click('.tut [data-a="tutNext"]'); await frames(p);
    const r = await p.evaluate(() => { const G = document.querySelector('#guide'), b = G.getBoundingClientRect(), c = [b.left + b.width / 2, b.top + b.height / 2], hit = document.elementFromPoint(c[0], c[1]), lb = G.querySelector('.glbl').getBoundingClientRect(); return { c, pin: hit && hit.closest('.pin') ? +hit.closest('.pin').dataset.id : null, u: __game.sim.objs('unit').find((u) => u.num === 107).id, labelInView: lb.top >= 0 && lb.bottom <= innerHeight, tabsTop: document.querySelector('#tabs').getBoundingClientRect().top, labelBottom: lb.bottom, hidden: G.hidden }; });
    assert.equal(r.hidden, false); assert.equal(r.pin, r.u, 'ring centre is Unit 107\'s own pin'); assert.ok(r.labelInView && r.labelBottom <= r.tabsTop, 'label not over the bottom navigation');
    if (w < 600) await p.touchscreen.tap(r.c[0], r.c[1]); else await p.mouse.click(r.c[0], r.c[1]); await frames(p);
    assert.equal(await p.evaluate(() => __game.ui.sel), r.u); assert.match(await tutText(p), /Owner Make-Ready/); await shot(p, `addendumA-${w}`);
  });
  await scenario('B. Owner Make-Ready stays available in Details until accepted, then shows assigned status', 393, 659, async (p) => {
    await p.click('[data-a="new"][data-v="maple"]'); await p.evaluate(() => { __game.ui.tutLooked = true; }); await frames(p); await p.click('.tut [data-a="tutNext"]'); await frames(p);
    await p.evaluate(() => __game.ui.select(__game.sim.objs('unit').find((u) => u.num === 107).id)); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p);
    const btn = `.sheet [data-cmd*='"ownerMakeReady"']`; assert.ok(await p.isVisible(btn), 'action visible in Details'); await shot(p, 'addendumB-details'); await p.click(btn); await frames(p);
    assert.equal(await p.locator(btn).count(), 0, 'no stale action'); assert.match(await p.evaluate(() => document.querySelector('.sheet').innerText), /Make-ready (assigned|\d+%)/);
  });
  await scenario('C. unavailable optional stairs cannot invalidate the $17,810 package', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => __game.ui.showVertical(12)); await frames(p);
    assert.equal(await p.isDisabled('[data-qa="vr-opt-stairs"]'), true); await p.click('[data-qa="vr-opt-stairs"]', { force: true }).catch(() => {}); await frames(p);
    assert.deepEqual(await p.evaluate(() => [__game.ui.verticalQuote && __game.ui.verticalQuote.cost, __game.ui.verticalQuote && __game.ui.verticalQuote.stairs, !!document.querySelector('[data-qa="vr-confirm"]')]), [17810, false, true]);
    assert.match(await p.evaluate(() => document.querySelector('.vr-body').innerText), /no stairwell/); await shot(p, 'addendumC-stairs');
  });
  await scenario('D. floor chooser shows live in-progress F2 and blocks a second order', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => { const g = __game, R = g.sim.verticalPlan(12); g.sim.dispatch({ type: 'verticalUpgrade', ...R }); const o = g.sim.s.orders.at(-1); while (o.vertical.phase < 2) g.sim.step(); g.sim.events.length = 0; });
    await p.click('[data-a="floorChoose"]'); await frames(p); const t1 = await p.evaluate(() => document.querySelector('.modal.floors').innerText);
    assert.match(t1, /Building 12 · 1 completed floor/); assert.match(t1, /F2 · \d+% · fit-out/); assert.doesNotMatch(t1, /F2 not built yet/); assert.match(t1, /Plan next floor · after F2 handover/); await shot(p, 'addendumD-chooser');
    await p.evaluate(() => { for (let i = 0; i < 900; i++) __game.sim.step(); __game.sim.events.length = 0; }); await frames(p);
    const t2 = await p.evaluate(() => document.querySelector('.modal.floors').innerText); assert.notEqual(t2, t1, 'updates while open, no reload');
  });
  await scenario('E. cancel is separated, itemised, confirmable, and recorded as separate ledger entries', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => { const g = __game, R = g.sim.verticalPlan(12); g.sim.dispatch({ type: 'verticalUpgrade', ...R }); g.ui.select(12); }); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p);
    assert.equal(await p.locator('.dock-actions [data-qa="cancel-construction"]').count(), 0); await p.click('.danger-zone [data-qa="cancel-construction"]'); await frames(p);
    const t = await p.evaluate(() => document.querySelector('.confirm-cancel').innerText); for (const re of [/Original package charge\s*\$17,810/, /Exact refund\s*\$17,810/, /Cash after cancelling/, /full undo/]) assert.match(t, re); await shot(p, 'addendumE-confirm');
    await p.click('[data-qa="cc-keep"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.orders.at(-1).st), 'construction', 'Keep building cancels nothing');
    await p.click('.danger-zone [data-qa="cancel-construction"]'); await frames(p); const cash = await p.evaluate(() => __game.sim.s.cash); await p.click('[data-qa="cc-confirm"]'); await frames(p);
    assert.deepEqual(await p.evaluate((c) => [__game.sim.s.orders.at(-1).st, __game.sim.s.cash - c, __game.sim.s.ledger.filter((x) => x.cat === 'capex').slice(-2).map((x) => x.amt)], cash), ['cancelled', 17810, [-17810, 17810]]);
  });
  await scenario('F. review closes by labelled control and Escape; keyboard cannot bypass the paused review', 393, 659, async (p) => {
    await plainGame(p); await p.evaluate(() => __game.ui.showVertical(12)); await frames(p);
    assert.equal(await p.getAttribute('[data-qa="vr-close"]', 'aria-label'), 'Close review'); await p.keyboard.press('Space'); await p.keyboard.press('3'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.speed), 0);
    await p.keyboard.press('Escape'); await frames(p); assert.deepEqual(await p.evaluate(() => [!!document.querySelector('.modal-bg'), __game.ui.verticalQuote, __game.sim.s.speed]), [false, null, 0], 'closing restores the paused clock');
    await p.evaluate(() => __game.ui.showVertical(12)); await frames(p); await p.click('[data-qa="vr-preview"]'); await frames(p); await p.keyboard.press('Escape'); await frames(p);
    assert.deepEqual(await p.evaluate(() => [__game.ui.verticalPreviewing, __game.rend.previewG.children.length]), [false, 0]);
    await p.evaluate(() => __game.ui.showVertical(12)); await frames(p); await p.click('[data-qa="vr-close-review"]'); await frames(p); assert.equal(await p.evaluate(() => !!document.querySelector('.modal-bg')), false);
  });
  // Follow-up repair 1 on the real page: localStorage writes fail persistently mid-sequence; nothing is lost, the
  // message matches what storage holds, extra copies survive a reload, and a clean retry succeeds.
  await scenario('G. save recovery: failing storage during archive restore keeps every game; reload and retry', 393, 659, async (p) => {
    await plainGame(p); await frames(p);
    const seed = () => p.evaluate(async () => { const g = __game, keepCash = g.sim.s.cash, rec = []; for (const c of [101, 102, 103, 104, 105, 555]) { g.sim.s.cash = c; rec.push({ code: await g.saveCode(), meta: { name: c === 555 ? 'Previous' : 'Archive ' + (c - 100), day: 1, cash: c }, at: 1 }); } g.sim.s.cash = keepCash;
      localStorage.setItem('sst.kept.archive', JSON.stringify(rec.slice(0, 5).reverse())); localStorage.setItem('sst.kept.previous', JSON.stringify({ ...rec[5], keptAt: 1, v: 1 })); g.saving = false; });
    const names = () => p.evaluate(() => JSON.parse(localStorage.getItem('sst.kept.archive')).map((r) => r.meta.name));
    // Fail the kept slot always, and the archive after its first write: the duplicate copy cannot be removed.
    const fail = (mode) => p.evaluate((mode) => { const S = Storage.prototype; window.__set = window.__set || S.setItem; let arch = 0; window.__toasts = [];
      const t = __game.ui.toast.bind(__game.ui); __game.ui.toast = (m, k) => { window.__toasts.push(m); t(m, k); };
      S.setItem = function (k, v) { if (mode === 'kept' && (k === 'sst.kept.previous' || (k === 'sst.kept.archive' && arch++ > 0))) throw new DOMException('quota', 'QuotaExceededError'); if (mode === 'autosave' && /^sst\.autosave/.test(k)) throw new DOMException('quota', 'QuotaExceededError'); return window.__set.call(this, k, v); }; }, mode);
    const heal = () => p.evaluate(() => { Storage.prototype.setItem = window.__set; });
    await seed(); const cash0 = await p.evaluate(() => __game.sim.s.cash); await fail('kept');
    await p.evaluate(() => __game.ui.showArchive()); await frames(p); await p.click('[data-a="archiveRestore"][data-v="2"]'); await p.waitForFunction(() => window.__toasts.length > 0, null, { timeout: 30000 }); await frames(p);
    const t1 = await p.evaluate(() => window.__toasts.at(-1)); assert.match(t1, /nothing was restored\. No saved game was lost\. Older saved games now also holds an extra copy of Previous\./); assert.doesNotMatch(t1, /Nothing was changed/);
    assert.equal(await p.evaluate(() => __game.sim.s.cash), cash0, 'running game not replaced'); assert.deepEqual(await names(), ['Previous', 'Archive 5', 'Archive 4', 'Archive 3', 'Archive 2', 'Archive 1']);
    await heal(); await p.reload(); await p.waitForFunction(() => window.__game && __game.ui, null, { timeout: 30000 }); await frames(p);
    assert.deepEqual(await names(), ['Previous', 'Archive 5', 'Archive 4', 'Archive 3', 'Archive 2', 'Archive 1'], 'extra copy survives reload, untrimmed');
    assert.match(await p.evaluate(() => document.querySelector('[data-a="archiveOpen"]').innerText), /6 kept/);
    await p.click('[data-a="archiveOpen"]'); await frames(p); assert.match(await p.evaluate(() => document.querySelector('.modal').innerText), /Extra copy of your previous game/); await shot(p, 'followup-archive-extra');
    // Autosave fails after a successful store: the restored game keeps its archive copy and the message says so.
    await fail('autosave'); await p.click('[data-a="archiveRestore"][data-v="3"]'); await p.waitForFunction(() => window.__toasts.length > 0, null, { timeout: 30000 }); await frames(p);
    assert.match(await p.evaluate(() => window.__toasts.at(-1)), /Restored .*could not be saved yet, so Archive 3 also stays in Older saved games/);
    assert.ok((await names()).includes('Archive 3')); assert.equal(await p.evaluate(() => __game.sim.s.cash), 103);
    // Clean retry of another restore: succeeds, removes only the restored entry after its save, nothing lost.
    await heal(); await p.evaluate(() => __game.ui.showArchive()); await frames(p); const before = await names(); const idx = before.indexOf('Archive 1');
    await p.evaluate(() => { window.__toasts = []; }); await p.click(`[data-a="archiveRestore"][data-v="${idx}"]`); await p.waitForFunction(() => window.__toasts.length > 0, null, { timeout: 30000 }); await frames(p); const after = await names();
    // Every game is still stored somewhere (archive, previous-game slot or autosave), identified by its unique cash.
    const ids = await p.evaluate(() => { const j = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }; return [...(j('sst.kept.archive') || []).map((r) => +r.meta.cash), ...['sst.kept.previous', 'sst.autosave.main', 'sst.autosave.backup'].map((k) => j(k)).filter(Boolean).map((r) => +r.meta.cash)]; });
    assert.ok(!after.includes('Archive 1'), 'restored entry removed after its save'); for (const c of [101, 102, 103, 104, 105, 555]) assert.ok(ids.includes(c), c + ' still stored');
    assert.equal(await p.evaluate(() => __game.sim.s.cash), 101);
  });
  // Follow-up repair 2 on the real page: an elevator committed while both hallways are only ordered keeps the lesson on
  // the elevator step, guides to the time controls without resuming a Pause, and moves on once the hallways finish.
  await scenario('H. early elevator commitment waits for finished hallways; Pause is never resumed by the guide', 393, 659, async (p) => {
    await plainGame(p);
    const r = await p.evaluate(async () => { const g = __game, sim = g.sim, s = sim.s, B = await import('./js/blueprint.js'); s.open = false; s.speed = 0;
      s.lesson = { id: 'up', idMark: s.nextId, built: [], flags: {}, entered: true }; const L = () => B.verticalLayout(sim); if (!L() || L().blocked) return { skip: 'no layout' };
      const b = (k) => sim.dispatch({ type: 'build', ...L().plans[k] }).ok; const settle = () => { for (let i = 0; i < 20000 && s.orders.some((o) => o.st === 'construction'); i++) { s.t++; sim.step(); sim.events.length = 0; } s.convos.length = 0; }; // requests raised while fast-forwarding are answered, as a player would
      if (!b('aisle') || !b('shell2')) return { skip: 'shell' }; settle(); for (const k of ['hall', 'doorWide', 'loading', 'hall2']) if (!b(k)) return { skip: k };
      const st = B.shaftHallState(sim).join(','); const ok = b('elevator'); s.convos.length = 0; s.speed = 0; g.ui.renderFeed(true); g.ui.renderTut(true); return { st, ok, done: B.verticalDone(sim, 'elevator') }; });
    assert.ok(!r.skip, 'lesson layout available: ' + r.skip); assert.deepEqual([r.st, r.ok, r.done], ['ordered,ordered', true, false]); await frames(p);
    assert.match(await tutText(p), /Elevator committed: let the F1 hallway finish/); const gd = await guide(p); assert.ok(gd && /Run time/.test(gd.lbl), 'ring on the time controls');
    assert.equal(await p.evaluate(() => __game.sim.s.speed), 0, 'the guide never resumes time'); await shot(p, 'followup-elevator-wait');
    await p.click('#speed [data-v="4"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.speed), 4, 'time controls usable');
    await p.evaluate(async () => { const g = __game, sim = g.sim, s = sim.s, B = await import('./js/blueprint.js'); for (let i = 0; i < 20000 && B.shaftHallState(sim).some((x) => x !== 'built'); i++) { s.t++; sim.step(); sim.events.length = 0; } s.convos.length = 0; g.ui.renderFeed(true); g.ui.renderTut(true); }); await frames(p);
    assert.match(await tutText(p), /Light both hallways/);
  });
  // ---- Final bounded repair (I-L). Setup is disclosed in each scenario; builds use sim.dispatch, the command Confirm sends.
  const MEASURE = () => { const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }; const hit = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
    const texts = [...document.querySelectorAll('#blueprint text')].filter((t) => t.textContent).map((t) => ({ n: t.textContent, ...R(t) })); const ov = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (hit(texts[i], texts[j])) ov.push(texts[i].n + ' × ' + texts[j].n);
    const obs = [...document.querySelectorAll('.hud > *, #speed, .viewctl, #tut .tut, #tabs, #guide:not([hidden])')].map(R).filter((o) => o.r > o.l); const under = texts.filter((t) => obs.some((o) => hit(t, o))).map((t) => t.n);
    const sr = __game.ui.safeRect(), pts = __game.ui.stepOutline() || [], pr = pts.map(([x, y, z]) => __game.rend.project(x, y, z)); const inside = pr.length > 0 && pr.every((q) => q.x >= sr.left - 1 && q.x <= sr.right + 1 && q.y >= sr.top - 1 && q.y <= sr.bottom + 1);
    return { captions: texts.map((t) => t.n), overlaps: ov, underUi: under, inside, cam: [+__game.rend.center.x.toFixed(3), +__game.rend.center.z.toFixed(3), +__game.rend.zoom.toFixed(3)] }; };
  // Disclosed setup: Maple, tutorial off, $1M, build-up lesson state set directly, construction fast-forwarded by sim.step(), generated requests cleared.
  const upLessonAt = (p, phase) => p.evaluate(async (phase) => { const g = __game, sim = g.sim, s = sim.s, B = await import('./js/blueprint.js'); s.open = false; s.speed = 0; s.lesson = { id: 'up', idMark: s.nextId, built: [], flags: {}, entered: true };
    const L = () => B.verticalLayout(sim), bd = (k) => sim.dispatch({ type: 'build', ...L().plans[k] }).ok, settle = () => { for (let i = 0; i < 20000 && s.orders.some((o) => o.st === 'construction'); i++) { s.t++; sim.step(); sim.events.length = 0; } s.convos.length = 0; };
    bd('aisle'); bd('shell2'); settle(); for (const k of ['hall', 'doorWide', 'loading', 'hall2']) bd(k); if (phase === 'place') settle(); if (phase === 'wait') bd('elevator'); s.convos.length = 0; s.speed = 0; g.ui.renderFeed(true); g.ui.renderTut(true); }, phase);
  for (const [w, h] of [[393, 659], [430, 932]]) await scenario(`I. ${w}x${h} captions never collide; waiting shows hallways, not "Place here"; outline framed; labels hold through pan and zoom`, w, h, async (p) => {
    await plainGame(p); await upLessonAt(p, 'place'); await frames(p); let m = await p.evaluate(MEASURE);
    assert.deepEqual([m.overlaps, m.underUi], [[], []], 'placement: no caption collisions'); assert.ok(m.captions.includes('Place here') && m.captions.includes('Elevator'), 'target guidance visible'); assert.ok(m.inside, 'outline in the usable area');
    await shot(p, `final-place-${w}x${h}`);
    await p.evaluate(() => { __game.rend.pan(-60, -35); }); await frames(p); m = await p.evaluate(MEASURE); assert.deepEqual([m.overlaps, m.underUi], [[], []], 'after a pan');
    await p.evaluate(() => { __game.rend.zoomAt(innerWidth / 2, innerHeight / 2, 1.5); }); await frames(p); m = await p.evaluate(MEASURE); assert.deepEqual([m.overlaps, m.underUi], [[], []], 'after a zoom'); assert.ok(m.captions.includes('Place here'), 'target caption survives zoom');
    await plainGame(p); await upLessonAt(p, 'wait'); await frames(p); m = await p.evaluate(MEASURE);
    assert.ok(!m.captions.includes('Place here') && !m.captions.includes('Elevator'), 'no placement cue while waiting: ' + m.captions); assert.ok(m.captions.some((c) => /F1 hallway · under construction/.test(c)), 'unfinished hallway shown');
    assert.deepEqual([m.overlaps, m.underUi], [[], []]); assert.ok(m.inside, 'waiting outline framed in the usable area'); assert.match(await tutText(p), /Elevator committed: let the F1 hallway finish/); assert.equal((await guide(p)).lbl, 'Run time');
    assert.equal(await p.evaluate(() => __game.sim.s.speed), 0, 'Pause kept'); await shot(p, `final-wait-${w}x${h}`);
  });
  await scenario('J. framing respects gestures and the player\'s camera; desktop usable area, Fit and keep-selection-visible', 1280, 720, async (p) => {
    await plainGame(p); await upLessonAt(p, 'place'); await frames(p);
    // A real mouse drag is in progress when the step changes (elevator committed): the camera follows the drag only.
    await p.mouse.move(640, 300); await p.mouse.down(); await p.mouse.move(600, 280, { steps: 4 }); const mid = await p.evaluate(MEASURE);
    await p.evaluate(() => { const g = __game, B = g.sim; return import('./js/blueprint.js').then((M) => { B.dispatch({ type: 'build', ...M.verticalLayout(B).plans.elevator }); g.ui.renderTut(true); }); }); await frames(p);
    const during = await p.evaluate(MEASURE); assert.deepEqual(during.cam, mid.cam, 'no camera move during the drag'); await p.mouse.move(560, 260, { steps: 4 }); await p.mouse.up(); await frames(p);
    const released = await p.evaluate(MEASURE); await frames(p); await frames(p); assert.deepEqual((await p.evaluate(MEASURE)).cam, released.cam, 'no snap back after the gesture');
    // The player pans; the step stays the same; framing never undoes it.
    await p.evaluate(() => { __game.ui.renderTut(true); __game.rend.pan(200, 120); }); await frames(p); const moved = await p.evaluate(MEASURE); await frames(p); assert.deepEqual((await p.evaluate(MEASURE)).cam, moved.cam);
    // Desktop usable area: the side view-control column narrows the width, the top follows the HUD.
    const sr = await p.evaluate(() => ({ r: __game.ui.safeRect(), col: document.querySelector('.viewctl').getBoundingClientRect().left })); assert.ok(sr.r.top < 100, 'top ' + sr.r.top); assert.ok(sr.r.right <= sr.col - 8); assert.ok(sr.r.bottom - sr.r.top > 450);
    await p.click('[data-a="fit"]'); await frames(p);
    const fit = await p.evaluate(() => { const g = __game, r = g.ui.safeRect(); return g.sim.objs('shell').every((o) => [[o.x, o.y], [o.x + o.w, o.y + o.h], [o.x + o.w, o.y], [o.x, o.y + o.h]].every(([x, y]) => { const q = g.rend.project(x, y, 0); return q.x >= r.left - 2 && q.x <= r.right + 2 && q.y >= r.top - 2 && q.y <= r.bottom + 2; })); }); assert.ok(fit, 'Fit frames every building in the usable area');
    await shot(p, 'final-desktop-fit');
    const kept = await p.evaluate(() => { const g = __game, u = g.sim.objs('unit').at(-1); g.rend.lookAt(u.x - 40, u.y - 30); g.ui.select(u.id); g.ui.keepSelVisible(); const r = g.ui.safeRect(), q = g.rend.project(u.x + 0.5, u.y + 0.5, 0); return q.x >= r.left && q.x <= r.right && q.y >= r.top && q.y <= r.bottom; }); assert.ok(kept, 'keep-selection-visible brings the unit into the usable area');
  });
  await scenario('K. F3 complaint: Operate → Customer feedback → View reported location opens F3 at the reported unit', 393, 659, async (p) => {
    // Disclosed setup: F2 then F3 built through the real staged packages (fast-forwarded) and commissioned; one complaint
    // injected with sim.thought() from a visitor at an F3 unit (the production complaint path).
    await plainGame(p); const info = await p.evaluate(() => { const g = __game, sim = g.sim; for (let n = 0; n < 2; n++) { const R = sim.verticalPlan(12); sim.dispatch({ type: 'verticalUpgrade', ...R }); const o = sim.s.orders.at(-1); for (let i = 0; i < 60000 && o.st === 'construction'; i++) { sim.step(); if (sim.events.length > 50) g.drain(); } g.drain(); sim.dispatch({ type: 'commission', order: o.id }); }
      const u = sim.objs('unit').find((x) => x.f === 2 && x.access === 'interior'); sim.s.thoughts = []; sim.thought({ id: 990, unit: u.id, x: u.x, y: u.y, f: 2, size: u.size }, 'The hallway is dark.'); sim.s.convos.length = 0; g.ui.renderFeed(true); return { id: u.id, num: u.num, x: u.x, y: u.y }; });
    await frames(p); await p.click('#tabs [data-v="operate"]'); await frames(p); await p.locator('[data-a="feedback"]:visible').first().click(); await frames(p);
    const item = p.locator('.sheet article.item', { hasText: 'The hallway is dark.' }).first(); assert.match(await item.innerText(), new RegExp(`Unit ${info.num} · F3`)); assert.doesNotMatch(await item.innerText(), /unavailable/);
    await item.locator('[data-a="complaintView"]').click(); await frames(p);
    const r = await p.evaluate(() => ({ view: __game.rend.view, sel: __game.ui.sel, cx: __game.rend.center.x, cz: __game.rend.center.z, speed: __game.sim.s.speed }));
    assert.equal(r.view, 2, 'F3 view'); assert.equal(r.sel, info.id, 'reported unit selected'); assert.ok(Math.abs(r.cx - (info.x + 0.5)) < 6 && Math.abs(r.cz - (info.y + 0.5)) < 6, 'camera at the reported spot'); assert.equal(r.speed, 0, 'Pause kept');
    assert.match(await p.evaluate(() => document.querySelector('#viewF') ? document.querySelector('#viewF').innerText : document.body.innerText), /F3|Floor 3/); await shot(p, 'final-f3-complaint');
  });
  await scenario('L. walkthrough with ordinary controls: instruction → locate target → action → visible result (elevator step)', 393, 659, async (p) => {
    // Disclosed setup: lesson state and prior construction prepared as in I (fast-forwarded). From here only ordinary controls are used.
    await plainGame(p); await upLessonAt(p, 'place'); await frames(p);
    const t0 = await tutText(p); assert.match(t0, /Elevator/, 'instruction: ' + t0 + ' | feed: ' + await p.evaluate(() => document.querySelector('#feed').innerText.slice(0, 120))); const ring = await guide(p); assert.ok(ring && /Tap here/.test(ring.lbl), 'ring locates the target'); const m = await p.evaluate(MEASURE); assert.ok(m.captions.includes('Place here') && m.inside);
    await p.click('#tut [data-a="tutMin"]'); await frames(p);
    // Locate: "Show me where" frames the target; captions stay clear.
    await p.locator('#tut [data-a="showPlacement"]').first().click(); await frames(p); const shown = await p.evaluate(MEASURE); assert.deepEqual([shown.overlaps, shown.underUi], [[], []]); assert.ok(shown.captions.includes('Place here') && shown.inside, 'target located');
    // Act: "Use suggested placement" opens the placement review on the build bar.
    if (!(await p.locator('#tut [data-a="suggestPlacement"]:visible').count())) { await p.click('#tut [data-a="tutMin"]'); await frames(p); }
    await p.locator('#tut [data-a="suggestPlacement"]:visible').first().click(); await frames(p);
    const bar = await p.evaluate(() => document.querySelector('#abar').innerText); assert.match(bar, /Elevator/); assert.match(bar, /\$9,500/); const cash = await p.evaluate(() => __game.sim.s.cash);
    await p.click('#abar [data-a="confirm"]'); await frames(p);
    const r = await p.evaluate((c) => ({ spent: c - __game.sim.s.cash, elevators: __game.sim.objs('elevator').length, speed: __game.sim.s.speed }), cash); assert.equal(r.spent, 9500, 'charged once'); assert.equal(r.speed, 0, 'manual Pause kept through Confirm');
    const toastTexts = await p.evaluate(() => __game.ui.toasts.map((t) => t.text).join(' | ') + ' || ' + document.querySelector('#feed').innerText); assert.ok(r.elevators >= 1, 'elevator ordered'); assert.match(toastTexts, /Elevator/, 'visible confirmation: ' + toastTexts); await frames(p); await p.evaluate(() => { if (__game.ui.tutMin === false) document.querySelector('#tut [data-a="tutMin"]')?.click(); }); await frames(p);
    // Visible result: the lesson moves on to the lights step. Elevator is still armed (repeat placement is kept), so the
    // card now asks to switch to Light rather than inviting a hold that would quote another Elevator.
    assert.equal(await p.evaluate(() => { const st = __game.ui.currentBlueprintPlan(); return st && st.tool; }), 'light', 'visible result: the lesson moves on to the lights');
    assert.match(await tutText(p), /Switch to Light/, 'and asks for the Light tool, since Elevator is still armed'); const after = await p.evaluate(MEASURE); assert.deepEqual([after.overlaps, after.underUi], [[], []]); await shot(p, 'final-walkthrough-result');
  });
  // ---- Tool/floor guidance after Confirm and banner placement (M-O). Disclosed setup per scenario.
  // A real touch hold through Chrome's touch input (pointerType 'touch'), held past the 240 ms build-hold threshold.
  // Held well past 240 ms: software-GL frames at 2x DPR can delay the page's hold timer behind the release.
  const touchHold = async (p, x, y, ms = 900) => { const c = await p.context().newCDPSession(p); const pt = [{ x, y, id: 1 }];
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await p.waitForTimeout(ms); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); };
  // A real short finger tap at an element's centre (Chrome touch input), for buttons.
  const tapEl = async (p, sel) => { const loc = typeof sel === 'string' ? p.locator(/:visible/.test(sel) ? sel : sel + ':visible').first() : sel; await loc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { throw new Error('tap target not visible: ' + sel); }); let r = null; for (let i = 0; i < 10 && !r; i++) { r = await loc.boundingBox().catch(() => null); if (!r) await p.waitForTimeout(60); } if (!r) throw new Error('tap target has no box: ' + sel); // panels re-render every 400 ms
    const c = await p.context().newCDPSession(p); const pt = [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 2 }]; await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await p.waitForTimeout(60); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); await frames(p); };
  // Disclosed setup step: let celebrations queued by fast-forwarded construction finish and dismiss lesson offers (as P does).
  const quiet = async (p) => { await p.evaluate(() => { __game.sim.s.lessonOffer = null; }); await p.waitForFunction(() => !__game.showcase.bannerBusy(), null, { timeout: 30000 }); await p.evaluate(() => { __game.sim.s.lessonOffer = null; __game.ui.renderTut(true); }); await frames(p); };
  const targetPoint = (p) => p.evaluate(() => { const g = __game, st = g.ui.currentBlueprintPlan(); const q = g.rend.project(st.a.x + 0.5, st.a.y + 0.5, (st.f || 0) * 1.9); return { x: Math.round(q.x), y: Math.round(q.y), f: st.f || 0, tool: st.tool }; });
  const ringOn = (p, sel) => p.evaluate((sel) => { const g = document.querySelector('#guide'), e = document.querySelector(sel); if (!g || g.hidden || !e) return false; const a = g.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.left <= b.left + 2 && a.right >= b.right - 2 && a.top <= b.top + 2 && a.bottom >= b.bottom - 2; }, sel);
  const mapRing = (p) => p.evaluate(() => { const g = document.querySelector('#guide'); return !!g && !g.hidden && g.classList.contains('map'); });
  const caps = (p) => p.evaluate(() => [...document.querySelectorAll('#blueprint text')].map((t) => t.textContent));
  const barText = (p) => p.evaluate(() => document.querySelector('#abar').innerText.replace(/\s+/g, ' ').trim());
  const expandCard = async (p) => { if (!(await p.locator('#tut [data-a="suggestPlacement"]:visible').count())) await tapEl(p, '#tut [data-a="tutMin"]'); };
  // Lesson offers hold time by design until answered: answer one with its real "Later" button when it appears.
  const answerOffer = async (p) => { if (await p.locator('[data-a="lessonLater"]:visible').count()) await tapEl(p, '[data-a="lessonLater"]:visible'); };
  for (const [w, h] of [[393, 659], [430, 932]]) await scenario(`M. ${w}x${h} touch: Elevator Confirm -> Light F1 -> Light F2 follows the real next target; never a wrong-tool or wrong-floor map cue`, w, h, async (p) => {
    // Setup (scripted): lesson at the elevator step as in I. From here: real taps, real touch holds and a real Space key.
    await plainGame(p); await upLessonAt(p, 'place'); await quiet(p); await tapEl(p, '#speed [data-v="2"]'); assert.equal(await p.evaluate(() => __game.sim.s.speed), 2, 'running at 2x before the walkthrough');
    await expandCard(p); await tapEl(p, '#tut [data-a="suggestPlacement"]:visible'); assert.equal(await p.evaluate(() => __game.sim.s.speed), 0, 'review holds time');
    await p.keyboard.press('Space'); await frames(p); await tapEl(p, '#abar [data-a="confirm"]');
    assert.equal(await p.evaluate(() => __game.sim.s.speed), 0, 'Space during the hold recorded Pause, kept through Confirm'); await tapEl(p, '#speed [data-v="2"]');
    // After Confirm: Elevator armed, step needs Light.
    assert.match(await tutText(p), /Switch to Light/); assert.ok(await ringOn(p, '#tut [data-a="suggestPlacement"]'), 'ring on the visible one-tap fix'); assert.equal(await mapRing(p), false, 'no map ring');
    let c = await caps(p); assert.ok(!c.includes('Place here') && c.includes('Light goes here · F1'), 'described target, no imperative cue: ' + c); assert.match(await barText(p), /Hold places another Elevator · lesson needs Light on F1/);
    await shot(p, `guide-switch-tool-${w}x${h}`);
    // A player who holds at the outlined spot anyway gets what the bar said: an Elevator quote (ordinary building kept).
    let t = await targetPoint(p); await touchHold(p, t.x, t.y); await frames(p); const hit0 = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e && (e.id || e.className || e.tagName); }, t);
    assert.equal(await p.evaluate(() => __game.ui.plan && __game.ui.plan.args.tool), 'elevator', 'hold at the outlined Light spot with Elevator armed quotes an Elevator; point ' + JSON.stringify(t) + ' hits ' + hit0);
    // The guided action: Use suggested placement arms Light on F1; Confirm.
    await expandCard(p); await tapEl(p, '#tut [data-a="suggestPlacement"]:visible');
    assert.deepEqual(await p.evaluate(() => [__game.ui.tool, __game.ui.plan.args.tool, __game.ui.plan.args.f, __game.ui.plan.status]), ['light', 'light', 0, 'valid'], 'Use suggested placement arms Light on F1');
    await tapEl(p, '#abar [data-a="confirm"]'); assert.equal(await p.evaluate(() => __game.sim.s.speed), 2, 'prior 2x restored after the review');
    // Second light goes on F2: same tool, wrong floor.
    assert.match(await tutText(p), /Switch to F2 for this Light/); assert.equal(await mapRing(p), false); assert.ok(await ringOn(p, '#tut [data-a="suggestPlacement"]'), 'ring on the one-tap fix'); c = await caps(p); assert.ok(!c.includes('Place here') && c.includes('Light goes here · F2'), String(c));
    assert.match(await barText(p), /lesson needs Light on F2/); t = await targetPoint(p); assert.equal(t.f, 1); await shot(p, `guide-switch-floor-${w}x${h}`);
    await touchHold(p, t.x, t.y); await frames(p); const fq = await p.evaluate(() => (__game.ui.plan ? __game.ui.plan.args.f : null)); assert.ok(fq === null || fq === 0, 'a hold while viewing F1 never quotes the F2 Light (got F' + (fq + 1) + ') - which is why there is no map cue');
    await expandCard(p); await tapEl(p, '#tut [data-a="suggestPlacement"]:visible');
    assert.deepEqual(await p.evaluate(() => [__game.rend.view, __game.ui.plan.args.f, __game.ui.plan.status]), [1, 1, 'valid'], 'one tap: F2');
    // Tool and floor now match: the actionable cue returns and a real hold at the target quotes the right Light (repeat placement).
    await p.evaluate(() => { __game.ui.plan = null; __game.ui.planArgs = null; __game.ui.renderActionBar(); }); await frames(p); // test step: discard the suggested review so the hold below is the player's own (no production control does only this)
    c = await caps(p); assert.ok(c.includes('Place here'), 'matching tool+floor: cue back'); t = await targetPoint(p); await touchHold(p, t.x, t.y); await frames(p);
    const own = await p.evaluate(() => (__game.ui.plan ? [__game.ui.plan.args.tool, __game.ui.plan.args.f, __game.ui.plan.status, __game.ui.plan.args.a.x, __game.ui.plan.args.a.y] : null)); const tgt = await p.evaluate(() => __game.ui.currentBlueprintPlan().a);
    assert.deepEqual(own && own.slice(0, 3), ['light', 1, 'valid'], 'own hold at the F2 target: ' + JSON.stringify({ own, tgt, t })); await tapEl(p, '#abar [data-a="confirm"]');
    assert.match(await tutText(p), /F2 units|Switch to/); assert.equal(await p.evaluate(() => __game.sim.objs('light').filter((o) => o.f === 1).length > 0), true, 'F2 light ordered');
    assert.equal(await p.evaluate(() => __game.sim.s.speed), 2, 'prior 2x after the last Confirm');
  });
  // Banner geometry vs the measured phone controls and the open sheet.
  const bannerGeo = (p) => p.waitForFunction(() => { const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }; const hit = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
    const el = document.querySelector('#celebrate.on'); if (!el || +getComputedStyle(el).opacity < 0.95) return false; const B = R(el.querySelector('.cb'));
    const covers = ['.hud > *', '#speed', '.viewctl', '#sheet > *', '#abar > *', '#tabs'].flatMap((s) => [...document.querySelectorAll(s)].map((e) => ({ n: s, ...R(e) }))).filter((o) => o.r > o.l && hit(B, o)).map((o) => o.n);
    return { banner: B, covers: [...new Set(covers)], hidden: el.style.visibility === 'hidden', held: [...(__game.ui.popupBlocks || [])] }; }, null, { timeout: 12000, polling: 100 }).then((h) => h.jsonValue());
  for (const [w, h] of [[393, 659], [430, 932]]) await scenario(`N. ${w}x${h} real Commission -> Grand opening sits below the speed/floor rows and clear of the open sheet; prior speed restored`, w, h, async (p) => {
    // Setup (scripted): F2 package ordered and construction fast-forwarded; ready unit selected. Ordinary control: the Commission button.
    await plainGame(p); await p.evaluate(() => { const g = __game, sim = g.sim, R = sim.verticalPlan(12); sim.dispatch({ type: 'verticalUpgrade', ...R }); const o = sim.s.orders.at(-1); for (let i = 0; i < 60000 && o.st === 'construction'; i++) { sim.step(); if (sim.events.length > 50) g.drain(); } g.drain(); sim.s.convos.length = 0; g.ui.renderFeed(true); }); await quiet(p); await p.evaluate(() => { const sim = __game.sim; __game.ui.select(sim.objs('unit').find((u) => u.f === 1 && u.cstate === 'ready').id); }); await frames(p);
    await tapEl(p, '#speed [data-v="2"]'); const btn = p.locator('[data-a="cmd"]', { hasText: /Commission whole order|Commission F2 order/ }).first(); await tapEl(p, btn);
    const g = await bannerGeo(p); assert.deepEqual(g.covers, [], 'banner covers nothing: ' + JSON.stringify(g)); assert.equal(g.hidden, false); assert.ok(g.held.includes('celebrate'), 'time held while it shows');
    const ctl = await p.evaluate(() => Math.max(document.querySelector('#speed').getBoundingClientRect().bottom, document.querySelector('.viewctl').getBoundingClientRect().bottom)); assert.ok(g.banner.t >= ctl + 6, 'below the controls');
    assert.equal(await p.evaluate(() => { const b = document.querySelector('#floors [data-a="view"][data-v="0"]').getBoundingClientRect(); return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2).closest('#floors') !== null; }), true, 'F1 control readable and reachable');
    await shot(p, `banner-grand-opening-${w}x${h}`);
    await p.waitForFunction(() => !__game.showcase.bannerBusy(), null, { timeout: 15000 }); await frames(p); await answerOffer(p);
    assert.deepEqual(await p.evaluate(() => [__game.sim.s.speed, [...(__game.ui.popupBlocks || [])]]), [2, []], 'prior 2x restored after the banner, no hold left');
  });
  await scenario('O. banner waits without holding time, then shows; a banner waiting too long is dropped with no stale hold', 393, 659, async (p) => {
    // Setup (scripted): banners injected with showcase.celebrate(), the call production events use. Ordinary controls: tab, Close, Details, Back to map.
    await plainGame(p); await quiet(p); await tapEl(p, '#speed [data-v="2"]');
    await tapEl(p, '#tabs [data-v="operate"]'); const held = () => p.evaluate(() => ({ speed: __game.sim.s.speed, blocks: [...(__game.ui.popupBlocks || [])], busy: __game.showcase.bannerBusy(), on: !!document.querySelector('#celebrate.on') }));
    const base = (await held()).speed; await p.evaluate(() => __game.showcase.celebrate('Milestone', 'Queued while a panel is open', '', null)); await p.waitForTimeout(1500);
    let st = await held(); assert.equal(st.on, false, 'queued not shown ' + JSON.stringify(st)); assert.ok(st.busy, 'queued'); assert.ok(!st.blocks.includes('celebrate'), 'queued banner holds no time'); assert.equal(st.speed, base);
    await tapEl(p, '.sheet [data-a="close"]'); const g = await bannerGeo(p); assert.deepEqual(g.covers, []); await p.waitForFunction(() => !__game.showcase.bannerBusy(), null, { timeout: 15000 }); await frames(p); assert.deepEqual(await p.evaluate(() => [__game.sim.s.speed, [...(__game.ui.popupBlocks || [])]]), [2, []], 'shown, then prior speed restored');
    // Waiting too long: a panel stays open past the limit; the banner is dropped unseen, the queue drains, no hold remains.
    await p.evaluate(() => __game.ui.select(null)); await tapEl(p, '#tabs [data-v="operate"]'); await p.evaluate(() => __game.showcase.celebrate('Milestone', 'Never shown', '', null)); await p.waitForTimeout(21500);
    await tapEl(p, '.sheet [data-a="close"]'); await p.waitForTimeout(900); st = await held(); assert.equal(st.busy, false, 'queue drained ' + JSON.stringify(st)); assert.equal(st.on, false, 'stale banner not shown'); assert.ok(!st.blocks.includes('celebrate'), 'no stale banner hold');
    // 21 s of 2x play may raise a customer request or a lesson offer; those hold time by design, and only while visible.
    const vis = await p.evaluate(() => ({ convo: [...document.querySelectorAll('#feed .convo')].some((e) => e.getBoundingClientRect().height > 0), offer: [...document.querySelectorAll('#tut .lesson-chip')].some((e) => e.getBoundingClientRect().height > 0) }));
    for (const b of st.blocks) assert.ok((b === 'convo' && vis.convo) || (b === 'lessonOffer' && vis.offer), 'every remaining hold is visible and answerable: ' + b + ' ' + JSON.stringify(vis));
    if (!st.blocks.length) assert.equal(st.speed, 2);
  });
  await scenario('O2. 320x480 portrait: no room above an expanded panel, so the banner waits (no hold); Back to map gives it room and it shows', 320, 480, async (p) => {
    // Setup (scripted): unit selected; banner injected with showcase.celebrate(). Ordinary controls: Details, Back to map.
    await plainGame(p); await quiet(p); await tapEl(p, '#speed [data-v="2"]'); await p.evaluate(() => __game.ui.select(__game.sim.objs('unit')[0].id)); await frames(p);
    await tapEl(p, '[data-a="sheetGrow"]'); const room = await p.evaluate(() => { const s = document.querySelector('#sheet > *').getBoundingClientRect().top, c = Math.max(document.querySelector('#speed').getBoundingClientRect().bottom, document.querySelector('.viewctl').getBoundingClientRect().bottom); return s - c; });
    assert.ok(room < 60, 'expanded panel leaves ' + room + ' px');
    const before = await p.evaluate(() => [...(__game.ui.popupBlocks || [])]); await p.evaluate(() => __game.showcase.celebrate('Milestone', 'Waiting for room', '', null)); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({ on: !!document.querySelector('#celebrate.on'), busy: __game.showcase.bannerBusy(), blocks: [...(__game.ui.popupBlocks || [])] }));
    assert.equal(st.on, false, 'no room: waits instead of covering'); assert.ok(st.busy); assert.ok(!st.blocks.includes('celebrate'), 'waiting banner adds no hold'); assert.deepEqual(st.blocks, before, 'holds unchanged by the waiting banner');
    await tapEl(p, '[data-a="sheetGrow"]'); const g = await bannerGeo(p); assert.deepEqual(g.covers, [], 'shows once there is room, covering nothing'); await shot(p, 'banner-recovered-320x480');
    await p.waitForFunction(() => !__game.showcase.bannerBusy(), null, { timeout: 15000 }); await frames(p); await answerOffer(p);
    assert.ok(!(await p.evaluate(() => [...(__game.ui.popupBlocks || [])])).includes('celebrate'), 'no stale banner hold');
  });
  const pass = results.filter((r) => r.pass).length;
  fs.writeFileSync(path.join(OUT, 'c22-emulation-results.json'), JSON.stringify({ environment: 'headless Chromium (Playwright) device emulation; not a physical iPhone', results, consoleErrors: errors }, null, 2));
  console.log(`${pass}/${results.length} emulation scenarios passed; console errors/unhandled rejections: ${errors.length}`); if (errors.length) console.log(errors.join('\n'));
  if (pass !== results.length || errors.length) process.exitCode = 1;
})();
