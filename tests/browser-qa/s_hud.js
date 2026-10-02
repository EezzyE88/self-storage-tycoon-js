const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800);
  const m = async (tag) => log(tag, await p.evaluate(() => [...document.querySelectorAll('.hud > *')].map((e) => { const r = e.getBoundingClientRect(); return (e.className || e.tagName).toString().split(' ').slice(0, 2).join('.') + ':' + Math.round(r.left) + '-' + Math.round(r.right); }).join(' ') + ' | vw ' + innerWidth));
  for (const [name, setup] of [['maple', () => __game.newGame('maple')], ['starter+funds', () => { __game.newGame('custom', { kind: 'business', start: 'starter' }); __game.sim.dispatch({ type: 'sbFunds', amt: 10000 }); __game.ui.setMeta(__game.metaName(), __game.modeLabel(__game.sim.s)); }]]) {
    await p.evaluate(setup); await p.evaluate(() => { __game.ui.title = false; __game.ui.closeModal && __game.ui.closeModal(); }); await hold(p); await sim(p, 1440 * 2); await step(p, 4, 1/30, false); await m(name);
  }
};
