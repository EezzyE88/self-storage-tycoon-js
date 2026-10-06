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
    assert.match(await tutText(p), /Owner Make-Ready/); await p.click(`[data-cmd*='"ownerMakeReady"']`); await frames(p);
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
    await plainGame(p); await p.click('#speed [data-v="2"]'); await frames(p); assert.equal(await speed(), 2);
    await p.click('#tabs [data-v="business"]'); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await speed(), 0, 'Details pauses');
    await p.click('[data-a="sheetGrow"]'); await frames(p); await restored(2, 'Back to map restores 2x');
    await p.click('.sheet [data-a="close"]'); await frames(p);
    await p.click('#speed [data-v="0"]'); await frames(p); await p.evaluate(() => __game.ui.showVertical(12)); await frames(p); await p.click('[data-qa="vr-preview"]'); await frames(p);
    await p.click('#abar [data-qa="vp-confirm"]'); await frames(p); assert.equal(await p.evaluate(() => __game.sim.s.orders.at(-1).st), 'construction'); assert.equal(await speed(), 0, 'confirmation keeps a manual Pause');
    await p.click('#speed [data-v="4"]'); await frames(p); await p.click('[data-a="floorChoose"]'); await frames(p); assert.equal(await speed(), 0); await p.click('[data-qa="floors-close"]'); await frames(p); await restored(4, 'closing the chooser restores 4x');
    await p.evaluate(() => __game.ui.select(12)); await frames(p); await p.click('[data-a="sheetGrow"]'); await frames(p); await p.click('#speed [data-v="0"]'); await frames(p);
    await p.click('[data-a="sheetGrow"]'); await frames(p); assert.equal(await speed(), 0, 'Pause tapped inside a panel survives Back to map');
    await p.click('#speed [data-v="1"]'); await frames(p); await p.evaluate(() => { const g = __game; g.ui.select(null); g.sim.convo({ key: 'qa', who: 'Tenant', text: 'Hello', sev: 'attention', actions: [{ label: 'Thanks' }] }); g.ui.renderFeed(true); }); await frames(p); assert.equal(await speed(), 0, 'a request pauses');
    await p.click('[data-a="requests"]'); await frames(p); await p.click('.modal [data-a="convo"]'); await frames(p); await p.evaluate(() => __game.ui.closeModal()); await frames(p); await restored(1, 'answering restores 1x');
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
  const pass = results.filter((r) => r.pass).length;
  fs.writeFileSync(path.join(OUT, 'c22-emulation-results.json'), JSON.stringify({ environment: 'headless Chromium (Playwright) device emulation; not a physical iPhone', results, consoleErrors: errors }, null, 2));
  console.log(`${pass}/${results.length} emulation scenarios passed; console errors/unhandled rejections: ${errors.length}`); if (errors.length) console.log(errors.join('\n'));
  if (pass !== results.length || errors.length) process.exitCode = 1;
})();
