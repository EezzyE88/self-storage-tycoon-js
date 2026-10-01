import { makeScenario } from '../../js/scenarios.js';
const sim = makeScenario('turnaround'); const s = sim.s;
console.log(Object.values(s.leases).filter(L=>L.status!=='current').map(L=>L.status+':'+(sim.day-L.dueSince)).join(' '));
const ev = []; for (let i=0;i<30*1440;i++){ sim.step(); for (const e of sim.events) if (/lien|notice|auction|paid|overlock|convo/.test(e.type)) ev.push('d'+sim.day+' '+e.type); sim.events.length=0; }
console.log(ev.join(', ')); console.log('convos', s.convos.map(c=>c.who+': '+c.text).join(' | '));
