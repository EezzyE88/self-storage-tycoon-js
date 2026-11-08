// Focused checks for player-run advertising campaigns.
import { makeMaple } from '../../js/maple.js';
import { adBreakEvenText, AD_RESULT_SCOPE } from '../../js/ui.js';

let pass = true;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : ''));
  pass &&= !!cond;
};

const sim = makeMaple(404);
const s = sim.s;
s.tut = { on: false, beat: 99, flags: {}, done: true };
s.mode = 'sandbox';
s.open = true;

const c0 = s.cash;
const r1 = sim.dispatch({ type: 'ad', kind: 'size', target: '10x10' });
check('targeted campaign starts', r1.ok && s.mkt.ad && s.mkt.ad.target === '10x10');
check('targeted campaign costs $250', Math.round(c0 - s.cash) === 250);
check('targeted size gets 2.5x traffic (+150%)', Math.abs(sim.adFactor('10x10') - 2.5) < 1e-9);
check('other sizes are unchanged', Math.abs(sim.adFactor('5x10') - 1) < 1e-9);
check('second campaign cannot overlap', !sim.dispatch({ type: 'ad', kind: 'local' }).ok);

const ad = s.mkt.ad;
const fakeUnit = sim.objs('unit').find((u) => u.cstate === 'operating' && u.commercial === 'ready');
if (fakeUnit) {
  const before = ad.leases || 0, rev0 = ad.revenue || 0;
  sim.signLease(fakeUnit, { size: fakeUnit.size, climate: fakeUnit.env === 'climate', ad: ad.id });
  check('campaign-attributed lease is counted', ad.leases === before + 1);
  check('first-month revenue is attributed', ad.revenue > rev0);
}

s.t = ad.until * 1440;
check('campaign expires after day 30 window', sim.activeAd() == null);
check('expired campaign moves to history', s.mkt.adHistory.some((x) => x.id === ad.id));

const c1 = s.cash;
const r2 = sim.dispatch({ type: 'ad', kind: 'local' });
check('local campaign starts after expiry', r2.ok && s.mkt.ad && s.mkt.ad.kind === 'local');
check('local campaign costs $500', Math.round(c1 - s.cash) === 500);
check('local campaign adds 45% all-size traffic', Math.abs(sim.adFactor('5x5') - 1.45) < 1e-9 && Math.abs(sim.adFactor('10x20') - 1.45) < 1e-9);

// Targeted break-even uses the asking rent of the ready units of that size (standard vs climate).
{
  const ask = { std: s.market.ask['5x5|std'], climate: s.market.ask['5x5|climate'] };
  const be = (a) => Math.max(1, Math.ceil(250 / a));
  const money = (v) => '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const clim = adBreakEvenText(s, '5x5', [{ env: 'climate' }, { env: 'climate' }], 250);
  check('climate-only ready units use the climate asking rent', clim.includes(money(ask.climate) + '/mo') && clim.includes(be(ask.climate) + ' new climate lease') && !clim.includes(money(ask.std) + '/mo'), clim);
  const std = adBreakEvenText(s, '5x5', [{ env: 'std' }], 250);
  check('standard-only ready units use the standard asking rent', std.includes(be(ask.std) + ' new standard lease') && std.includes(money(ask.std) + '/mo') && !std.includes('climate'), std);
  const mix = adBreakEvenText(s, '5x5', [{ env: 'std' }, { env: 'climate' }], 250);
  check('mixed ready units show both standard and climate break-even', mix.includes('standard lease') && mix.includes('climate lease') && mix.includes(money(ask.std)) && mix.includes(money(ask.climate)), mix);
  const none = adBreakEvenText(s, '5x5', [], 250);
  check('no ready units says leases need ready units', none.includes('once units are ready'), none);
  check('result scope says attributed only and not total profit', /campaign-attributed/.test(AD_RESULT_SCOPE) && /not total profit/.test(AD_RESULT_SCOPE) && /other shoppers are not counted/.test(AD_RESULT_SCOPE));
}

console.log(pass ? 'ALL PASS' : 'SOME FAILED');
if (!pass) process.exitCode = 1;
