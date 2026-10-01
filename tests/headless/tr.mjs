import { makeMaple } from '../../js/maple.js';
const m = makeMaple(); const s = m.s; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.mode = 'sandbox'; m.ensure();
const u = m.objs('unit').find((u) => u.access === 'drive' && u.size === '10x10');
// vacate it
m.endLease(s.leases[u.lease], 'test'); m.ensure();
console.log(m.renovateOptions(m.s.objects[u.id]), JSON.stringify(m.dispatch({ type: 'renovate', unit: u.id, kind: 'split' })));
for (let i = 0; i < 1440 * 3; i++) m.step();
console.log(m.objs('unit').filter((x) => x.id > u.id - 1 && x.size === '5x10' && x.access === 'drive').map((x) => [x.name, x.x, x.y, x.w, x.h, x.commercial, x.blocked].join(',')));
const iu = m.objs('unit').find((x) => x.access === 'interior'); console.log(JSON.stringify(m.renovateOptions(iu)), JSON.stringify(m.dispatch({ type: 'coTier', tier: 2 })), m.dispatch({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 21 }, f: 0, rush: true }));
console.log(s.orders.at(-1).cost, s.orders.at(-1).dur);
