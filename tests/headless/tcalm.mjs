// Foundations: no time pressure. Low-security properties get a "Security check" notice with a lot pin before any
// break-in; break-ins hit dark, unwatched units when there are any; story events use attention tone, not critical.
import { makeMaple } from '../../js/maple.js';
let ok = true; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n, x); ok &&= !!c; };
let breaks = 0, warnedFirst = 0, darkHits = 0, darkPossible = 0, crit = 0, warnings = 0, gapMin = 1e9;
for (const seed of [11, 22, 33]) {
  const sim = makeMaple(seed); const s = sim.s; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true;
  let warnDay = null;
  for (let i = 0; i < 2 * 365 * 1440; i++) {
    sim.step();
    for (const e of sim.events) {
      if (e.type === 'drama' && e.k === 'breakin') {
        breaks++; const D = s.drama; if (D.warned != null && D.warned <= sim.day - 3) warnedFirst++; gapMin = Math.min(gapMin, sim.day - (D.warned ?? -1e9));
        const u = sim.objs('unit').find((x) => x.num === +String(e.title).replace(/\D+/g, '')); const dk = (x) => { const f = x.f || 0, j = sim.idx(x.x, x.y); return !(sim.D.lit[f][j] >= 0.5) && !sim.D.cam[f][j]; };
        if (sim.objs('unit').some((x) => x.lease && dk(x))) { darkPossible++; if (u && dk(u)) darkHits++; }
      }
    }
    sim.events.length = 0;
    if (i % 60 === 0) for (const c of s.convos) { if (c.key === 'secrisk' && !c.seen) { c.seen = 1; warnings++; } if ((/^bi|^pw/.test(c.key || '')) && c.sev === 'critical') crit++; }
  }
}
check('break-ins still happen at low security', breaks > 0, `${breaks} in 3 seeds x 2 years; ${warnings} security notices`);
check('every break-in at low security came 3+ days after a security notice', warnedFirst === breaks, `${warnedFirst}/${breaks}, closest gap ${gapMin} days`);
check('break-ins hit dark, unwatched units when any are leased', darkHits === darkPossible, `${darkHits}/${darkPossible}`);
check('story events are never shown as critical', crit === 0);
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
{ // pre-merge fix 4: after the player acknowledges the security notice twice, it only returns if security gets worse
  const { makeMaple } = await import('../../js/maple.js');
  const sim = makeMaple(44); const s = sim.s; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true;
  const days = []; const secAt = [];
  for (let i = 0; i < 2 * 365 * 1440; i++) {
    sim.step(); sim.events.length = 0;
    if (i % 60 === 0) { const c = s.convos.find((x) => x.key === 'secrisk'); if (c) { days.push(sim.day); secAt.push(+s.exp.security.toFixed(2)); sim.dispatch({ type: 'convo', id: c.id, i: 0 }); } }
  }
  const after2 = days.slice(2); const worse = after2.every((d, k) => secAt[k + 2] < secAt[k + 1] - 0.05 + 1e-9);
  console.log((days.length >= 2 && worse ? 'PASS' : 'FAIL') + ' notices stop after two acknowledgements unless security worsens', `notices on days ${days.join(', ')} at security ${secAt.join(', ')}`);
}
