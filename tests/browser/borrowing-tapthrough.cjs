// Rendered real-touch check of borrowing tap-through and HUD "today".
// Usage: node tests/browser/borrowing-tapthrough.cjs <base-url> [chromium-executable]
// Touch taps go through Chromium's real input pipeline (pointerdown/mousedown/click), at 390x844.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const base = process.argv[2]; const exe = process.argv[3];
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base, { waitUntil: 'load' }); await page.waitForFunction(() => window.__game && window.__game.ui);
  await page.evaluate(() => [...document.querySelectorAll('#modal button')].find(b => /^Maple Street/.test(b.innerText)).click());
  await page.waitForTimeout(800);
  // Post-tutorial disposable state: loans available, no pending requests.
  await page.evaluate(() => { const g = __game, s = g.sim.s; s.tut.on = false; s.tut.done = true; s.convos = []; s.cash = 50000; s.speed = 0; g.ui.closeModal(); g.ui.renderTut?.(true); g.ui.renderFeed?.(true); });
  const W = ms => page.waitForTimeout(ms);
  const center = sel => page.evaluate(sel => { const b = document.querySelector(sel); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const state = () => page.evaluate(() => ({ loan: __game.sim.s.loan.bal, debt: __game.sim.s.debt.length, draws: __game.sim.s.ledger.filter(l => l.cat === 'loan').length, modal: (document.querySelector('#modal h2') || {}).innerText || null, zoom: __game.rend.zoom, convos: __game.sim.s.convos.length, hud: (document.querySelector('#cash small') || {}).innerText || null }));
  async function openFinancing() {
    await page.evaluate(() => [...document.querySelectorAll('#ui button')].find(b => b.innerText.trim() === 'Business').click()); await W(400);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#ui button')].filter(b => b.offsetParent).find(b => /▾/.test(b.innerText)); b && b.click(); }); await W(300);
    await page.evaluate(() => [...document.querySelectorAll('#ui button')].filter(b => b.offsetParent).find(b => b.innerText.trim() === 'Financing').click()); await W(400);
  }
  const cdp = await ctx.newCDPSession(page);
  // Rapid burst: taps scheduled on a Node timer every `gap` ms (no per-tap round trip), like a fast human double/triple tap.
  // pressesAtWindow reports the real in-page spacing of the presses.
  async function burst(pt, n, gap = 150) {
    if (!pt) return { missing: true, state: await state() };
    await page.evaluate(() => { window.__taps = []; if (!window.__tapLog) { window.__tapLog = 1; document.addEventListener('pointerdown', () => __taps.push(performance.now()), true); window.addEventListener('pointerdown', () => __taps.push(-performance.now()), true); } });
    const ps = []; for (let i = 0; i < n; i++) ps.push(new Promise(r => setTimeout(() => r(Promise.all([cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y, id: 1 }] }), cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })])), i * gap)));
    await Promise.all(ps); await W(300);
    return page.evaluate(() => { const all = __taps.filter(t => t < 0).map(t => -t), t0 = all[0]; return { pressesAtWindow: all.map(t => Math.round(t - t0)), reachedDocument: __taps.filter(t => t > 0).length }; });
  }
  // Wait for the review's own settle window to end (paint-based on slow renderers), recording its length.
  // Wait until the review modal is actually painted (input can lag >1 s under software GL), then until the settle window has expired.
  async function settled(title = /^Review/) { await page.waitForFunction((src) => new RegExp(src).test(((document.querySelector('#modal h2') || {}).innerText || '')), title.source, { timeout: 15000 }); return page.evaluate(async () => { const t0 = performance.now(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); await new Promise(r => setTimeout(r, 30)); while (__game.ui.borrowSettle && performance.now() < __game.ui.borrowSettle.until) await new Promise(r => setTimeout(r, 20)); return Math.round(performance.now() - t0); }); }
  await page.evaluate(() => { const ui = __game.ui; window.__guardLog = []; if (!ui.borrowSettleSwallow) return; const f = ui.borrowSettleSwallow.bind(ui); ui.borrowSettleSwallow = function (e) { const g = ui.borrowSettle && { ...ui.borrowSettle }; const r = f(e); if (g) __guardLog.push({ type: e.type, ts: Math.round(e.timeStamp), now: Math.round(performance.now()), until: Math.round(g.until), swallowed: r }); return r; }; });
  const out = {};
  await openFinancing();
  // 1. Credit line: real tap Review $1,000, wait, then triple-tap the Confirm spot.
  let p = await center('[data-a=creditReview][data-v="1000"]'); if (!p) throw new Error('Financing panel did not open'); await page.touchscreen.tap(p.x, p.y); await W(100); out.creditOpenSettleMs = await settled(); await W(50);
  const c = await center('[data-a=creditConfirm]'); const s0 = await state();
  const b1 = await burst(c, 3);
  await W(700); out.credit = { burst: b1, before: s0, after: await state() };
  await page.evaluate(() => __game.ui.closeModal()); await W(1600);
  // 2. Term loan: double tap Confirm.
  p = await center('[data-a=termLoanReview][data-v="10000"]'); if (!p) throw new Error('term option missing: ' + JSON.stringify(await state())); await page.touchscreen.tap(p.x, p.y); await W(100); await settled(); await W(50);
  const t = await center('[data-a=termLoanConfirm]'); const s1 = await state();
  const b2 = await burst(t, 2);
  await W(700); out.term = { burst: b2, before: s1, after: await state() };
  await page.evaluate(() => __game.ui.closeModal()); await W(1600);
  // 3. HUD today after borrowing (financing only today).
  await page.evaluate(() => __game.ui.slowHud()); await W(400); out.hudAfterBorrow = (await state()).hud;
  // 4. Bank request: close panel, induce request, open, Review Draw, triple tap Confirm spot; camera must stay put.
  await page.evaluate(() => { document.querySelector('[aria-label="Close panel"]')?.click(); }); await W(400);
  await page.evaluate(() => { const s = __game.sim.s; s.loan.warnT = -1e9; s.cash = -100; __game.sim.cashCheck(0); __game.ui.renderFeed(true); }); await W(500);
  await page.evaluate(() => [...document.querySelectorAll('#ui button')].find(b => /owner request/.test(b.innerText))?.click()); await W(700);
  await page.evaluate(() => [...document.querySelectorAll('#ui button, #modal button')].filter(b => b.offsetParent).find(b => /^Review Draw/.test(b.innerText.trim()))?.click()); await W(100); await settled(); await W(50);
  const bc = await center('[data-a=creditConfirm]'); const s2 = await state();
  const b3 = bc ? await burst(bc, 3) : null;
  await W(900); out.bank = { found: !!bc, burst: b3, before: s2, after: await state() };
  // 5. Guard releases: a normal tap well after the window works (opens a review).
  await openFinancing(); await W(1600);
  p = await center('[data-a=creditReview][data-v="500"]'); if (p) { await page.touchscreen.tap(p.x, p.y); await W(500); }
  out.afterRelease = (await state()).modal;
  out.errors = errs; out.guardLog = await page.evaluate(() => __guardLog.slice(0, 40));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
