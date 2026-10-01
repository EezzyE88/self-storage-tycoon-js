import { makeMaple } from '../../js/maple.js';
const sim = makeMaple(); const s = sim.s; s.tut.beat = 11; s.creative = true;
const list = JSON.parse(process.argv[2]);
for (const a0 of list) { const a = { f: 0, ...a0, b: a0.b || a0.a }; const R = sim.plan(a); const r = sim.dispatch({ type: 'build', ...a }); console.log(a.tool, JSON.stringify(a.a), JSON.stringify(a.b), 'f' + a.f, R.status, (R.reasons||[]).join(';'), (R.missing||[]).join(';'), r.ok ? 'ok' : r.msg); for (let i=0;i<5;i++) sim.step(); }
