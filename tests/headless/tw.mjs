import { makeMaple } from '../../js/maple.js';
import { installTutorial } from '../../js/tutorial.js';
const sim = makeMaple(); installTutorial(sim); const s = sim.s;
const P = (a) => { const R = sim.plan(a); return R.status + (R.reasons && R.reasons.length ? ' ' + R.reasons.join(';') : '') + (R.missing && R.missing.length ? ' missing:' + R.missing.join(';') : '') + ' n=' + (R.count||0); };
const tries = process.argv.slice(2);
s.tut.beat = 11; // unlock all
for (const t of JSON.parse(tries[0])) console.log(JSON.stringify(t), '=>', P(t));
