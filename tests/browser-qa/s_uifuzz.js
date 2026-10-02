// UI bug hunt: random taps on every visible control and on the map, in several modes. Logs page errors and bad text.
const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.waitForTimeout(800);
  const N = +(process.env.N || 250); let seed = 42; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const starts = [['maple', () => __game.newGame('maple')], ['sb-starter', () => __game.newGame('custom', { kind: 'business', start: 'starter', goal: 'occ' })], ['sb-free', () => __game.newGame('custom', { kind: 'free' })], ['sc:vertical', () => __game.newGame('sc:vertical')]];
  const bad = new Map(); let clicks = 0; const skip = /saveFile|loadFile|^photo$|tour|fullscreen|battery/;
  for (const [name, fn] of starts) {
    await p.evaluate(fn); await p.evaluate(() => { __game.ui.title = false; }); await hold(p); await step(p, 3, 1/30, false);
    for (let i = 0; i < N; i++) {
      const r = R();
      if (r < 0.18) { // tap the map
        const vw = await p.evaluate(() => [innerWidth, innerHeight]); const x = Math.floor(vw[0] * (0.1 + 0.8 * R())), y = Math.floor(vw[1] * (0.2 + 0.6 * R()));
        await p.mouse.click(x, y).catch(() => {});
      } else if (r < 0.24) { await sim(p, 60 + Math.floor(R() * 600)); }
      else {
        const k = R();
        const res = await p.evaluate(([k, skipSrc]) => {
          const skip = new RegExp(skipSrc);
          const els = [...document.querySelectorAll('#ui [data-a], #ui button, #modal [data-a], #modal button')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !e.disabled && !skip.test(e.dataset.a || ''); });
          if (!els.length) return null; const e = els[Math.floor(k * els.length)]; const lab = (e.dataset.a || '') + ':' + (e.dataset.v || '') + ':' + (e.innerText || e.getAttribute('aria-label') || '').slice(0, 24).replace(/\n/g, ' ');
          e.click(); return lab;
        }, [k, skip.source]).catch((e) => 'ERR ' + e.message);
        if (res) clicks++;
      }
      await step(p, 2, 1/30, true);
      if (i % 20 === 0) {
        const t = await p.evaluate(() => { const txt = document.body.innerText; const m = txt.match(/.{0,40}(undefined|NaN|\[object Object\]|Infinity).{0,40}/); return m ? m[0].replace(/\n/g, ' ') : null; });
        if (t) bad.set(t, name);
        const st = await p.evaluate(() => ({ title: __game.ui.title, cash: __game.sim.s.cash }));
        if (st.title) { await p.evaluate(fn); await p.evaluate(() => { __game.ui.title = false; }); }
        if (!Number.isFinite(st.cash)) bad.set('cash not finite', name);
      }
    }
    log(name, 'done; page errors so far', errs.length);
  }
  log('clicks', clicks, '| page errors', errs.length); for (const e of [...new Set(errs)].slice(0, 15)) log('  ERR', e);
  log('bad text', bad.size); for (const [t, n] of bad) log('  TEXT', n, '|', t);
};
