import { makeMaple } from '../../js/maple.js';
const sim = makeMaple(); const s = sim.s; s.tut.beat = 4;
const r = sim.dispatch({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 });
console.log(r, s.tut.built, s.tut.on, s.tut.idMark);
