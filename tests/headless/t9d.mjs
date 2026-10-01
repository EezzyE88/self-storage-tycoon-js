import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
const a = makeMaple(); const s = a.s; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; s.open = true;
a.dispatch({ type: 'hire', role: 'clerk' });
for (let i = 0; i < 120 * 1440; i++) { a.step(); a.events.length = 0; }
const c = new Sim(JSON.parse(JSON.stringify(a.s)));
const diff = (x, y, p = '') => { if (typeof x !== 'object' || x === null) { if (x !== y) return p + ': ' + JSON.stringify(x) + ' vs ' + JSON.stringify(y); return null; } for (const k of new Set([...Object.keys(x), ...Object.keys(y || {})])) { const d = diff(x[k], y ? y[k] : undefined, p + '.' + k); if (d) return d; } return null; };
console.log('after load', diff(a.s, c.s));
for (let i = 0; i < 20 * 1440; i++) { a.step(); c.step(); a.events.length = c.events.length = 0; const d = diff(a.s, c.s); if (d) { console.log('step', i, d); break; } }
