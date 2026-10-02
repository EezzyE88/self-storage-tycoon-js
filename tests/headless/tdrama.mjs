// Round 14 story events: how often break-ins, price wars and auction surprises happen, and that each choice works.
import { makeMaple } from '../../js/maple.js';
let ok = true; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n, x); ok &&= !!c; };
const mk = (seed) => { const m = makeMaple(seed); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.mode = 'sandbox'; m.s.open = true; return m; };
for (const [name, good] of [['idle', false], ['good', true]]) {
  const tally = { breakin: 0, pricewar: 0, treasure: 0, junk: 0, normal: 0, quick: 0 };
  for (const seed of [1001, 2002]) {
    const sim = mk(seed); const s = sim.s;
    for (let i = 0; i < 2 * 365 * 1440; i++) {
      if (good && i % 30 === 0) { for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor)) { const r = sim.dispatch({ type: 'ownerTask', task: t.id }); if (!r.ok) sim.dispatch({ type: 'callVendor', task: t.id }); } if (s.convos.length) sim.dispatch({ type: 'convo', id: s.convos[0].id, i: 0 }); }
      sim.step();
      for (const e of sim.events) { if (e.type === 'drama') tally[e.k]++; if (e.type === 'auction_sold') tally[e.tier]++; if (e.type === 'repaired' && s.objects[e.obj] && s.objects[e.obj].quickFix) tally.quick++; }
      sim.events.length = 0;
    }
  }
  console.log(name.padEnd(5), '2 seeds x 2 years:', JSON.stringify(tally));
}
{ // choices
  const sim = mk(7); const s = sim.s; for (let i = 0; i < 1440 * 40; i++) { sim.step(); sim.events.length = 0; }
  const comp = { id: sim.id(), name: 'Test Storage', announced: 1, opens: sim.day - 25, strength: 0.2, price: 0.9, dist: 2 }; s.mkt.comp.push(comp);
  s.drama = { lastBreak: -99, wars: {} }; const r0 = sim.rnd; let forced = 0; sim.rnd = () => { forced++; return forced === 1 ? 0.99 : forced === 2 ? 0.9 : r0.call(sim); };
  sim.dramaDay(sim.day); sim.rnd = r0;
  const pw = s.convos.find((c) => c.key === 'pw' + comp.id); check('price war convo appears', !!pw && comp.price < 0.9, pw ? pw.text : JSON.stringify(s.drama));
  if (pw) { const k = Object.keys(s.market.ask)[0], a0 = s.market.ask[k]; const r = sim.dispatch({ type: 'convo', id: pw.id, i: 0 }); check('match cuts asking 6%', r.ok && s.market.ask[k] === Math.round(a0 * 0.94), `${a0} -> ${s.market.ask[k]}`); }
  const cash0 = s.cash; const r2 = sim.dispatch({ type: 'cv', op: 'pwAd', comp: comp.id }); check('ad campaign charges $600 and boosts traffic', r2.ok && Math.round(cash0 - s.cash) === 600 && sim.promoFactor() > 1);
  const u = sim.objs('unit').find((x) => x.lease); const tn = s.tenants[s.leases[u.lease].tenant]; const sat0 = tn.sat; const c1 = s.cash;
  const r3 = sim.dispatch({ type: 'cv', op: 'biCover', tenant: tn.id }); check('cover deductible: -$250, tenant happier', r3.ok && Math.round(c1 - s.cash) === 250 && tn.sat > sat0);
}
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
{ // auction surprises: run Turnaround (three accounts already behind) until its auction
  const { makeScenario } = await import('../../js/scenarios.js');
  const tiers = {}; let n = 0;
  for (const seed of [0, 1, 2, 3]) {
    const sim = makeScenario('turnaround'); sim.s.rngS = (sim.s.rngS + seed * 7919) >>> 0; const s = sim.s;
    for (let i = 0; i < 150 * 1440; i++) { sim.step(); for (const e of sim.events) if (e.type === 'auction_sold') { n++; tiers[e.tier] = (tiers[e.tier] || 0) + 1; if (n <= 4) console.log('  lot:', e.what, '$' + e.price, e.tier); } sim.events.length = 0; }
  }
  console.log(n ? 'PASS auction lots have contents ' + JSON.stringify(tiers) : 'FAIL no auction lots sold');
}
