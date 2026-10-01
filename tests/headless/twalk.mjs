import { makeMaple } from '../../js/maple.js';
import { tutorialTick, lessonTick, BEATS, stepState, curBeat } from '../../js/tutorial.js';
const sim = makeMaple(); const s = sim.s;
const ui = { tab: null, cat: 'site', tool: null, plan: null, sel: null, climate: false, rend: { view: 'ext', overlay: null }, tutLooked: false };
const log = []; let lastKey = '';
const obs = () => { const st = stepState(sim, ui); const b = curBeat(sim); const k = (b ? b.id : '-') + ':' + st.cur; if (k !== lastKey) { lastKey = k; log.push(`  [${b ? b.id : 'end'}] ${st.done.map(x=>x?1:0).join('')} tab=${ui.tab} tool=${ui.tool} step ${st.cur + 1}/${b ? b.steps.length : 0}: ${b ? b.steps[st.cur].t.replace(/<[^>]+>/g, '') : ''}`); } };
const tick = (n = 1) => { for (let i = 0; i < n; i++) { sim.step(); tutorialTick(sim); lessonTick(sim); sim.events.length = 0; obs(); } };
const until = (fn, max = 1440 * 6, label = '') => { let i = 0; while (!fn() && i < max) { tick(); i++; } if (!fn()) { console.log(JSON.stringify(s.orders.filter(o=>o.tool==='elevator')), JSON.stringify(sim.objs('elevator').map(e=>[e.cstate,e.id])), JSON.stringify(sim.objs('unit').filter(u=>u.f>0).map(u=>u.missing))); console.log('STUCK', label, 'beat', s.tut.beat, JSON.stringify(stepState(sim, ui).done)); process.exit(1); } };
const d = (a) => { const r = sim.dispatch(a); if (r && r.ok === false) console.log('  !', a.type, a.tool || '', r.msg); tutorialTick(sim); obs(); return r; };
const beat = (id) => until(() => { const b = curBeat(sim); return !b || b.id !== id; }, 1440 * 8, id);
const lesson = (id) => { d({ type: 'lesson', op: 'start', id }); tick(); };
const build = (tool, a, b, f = 0, extra = {}) => { ui.tab = 'build'; obs(); ui.cat = (await_cat(tool)); obs(); ui.tool = tool; obs(); ui.plan = sim.plan({ tool, a, b: b || a, f, ...extra }); obs(); d({ type: 'build', tool, a, b: b || a, f, ...extra }); ui.tool = null; ui.plan = null; ui.tab = null; obs(); };
import { TOOLS } from '../../js/data.js';
const await_cat = (t) => TOOLS[t].cat;
tick(2);
// welcome
ui.tutLooked = true; obs(); d({ type: 'tutFlag', flag: 'welcome' }); tick();
// makeready
const u107 = sim.objs('unit').find((u) => u.num === 107);
ui.sel = u107.id; obs(); d({ type: 'ownerMakeReady', unit: u107.id }); ui.sel = null; s.speed = 4; beat('makeready');
beat('lease');
ui.tab = 'business'; d({ type: 'tutFlag', flag: 'businessOpened' }); tick(); d({ type: 'tutFlag', flag: 'moneyAck' }); ui.tab = null; tick();
// expand
build('du10x10', { x: 13, y: 18 }, { x: 13, y: 25 });
until(() => sim.objs('unit').some((u) => u.cstate === 'ready'), 1440 * 3, 'build du');
const ru = sim.objs('unit').find((u) => u.cstate === 'ready'); ui.sel = ru.id; obs(); d({ type: 'commission', order: ru.order }); ui.sel = null; beat('expand');
// repair
tick(2); ui.rend.view = 0; obs(); const L = sim.objs('light').find((l) => l.x === 20 && l.y === 8); ui.sel = L.id; obs(); const t = s.tasks.find((x) => x.obj === L.id); d({ type: 'ownerTask', task: t.id }); ui.sel = null; beat('repair');
ui.tab = 'operate'; obs(); d({ type: 'hire', role: 'porter' }); ui.tab = null; beat('hire');
d({ type: 'tutFlag', flag: 'grad' }); tick(2); console.log('graduated', s.tut.done, 'beat', s.tut.beat);
lesson('interior');
// interior
ui.sel = sim.objs('corral')[0].id; d({ type: 'tutFlag', flag: 'corralInspected' }); tick(); ui.sel = null; beat('interior');
lesson('quality');
ui.tab = 'operate'; obs(); ui.rend.overlay = 'security'; obs(); build('camera', { x: 22, y: 14 }); beat('quality');
lesson('climate');
build('hvac', { x: 14, y: 8 }); build('light', { x: 17, y: 8 });
ui.tab = 'build'; obs(); ui.cat = 'interior'; obs(); ui.tool = 'iu5x5'; obs(); ui.climate = true; obs(); ui.plan = sim.plan({ tool: 'iu5x5', a: { x: 16, y: 5 }, b: { x: 16, y: 11 }, f: 0, climate: true }); obs(); d({ type: 'build', tool: 'iu5x5', a: { x: 16, y: 5 }, b: { x: 16, y: 11 }, f: 0, climate: true }); ui.tool = null; ui.plan = null; ui.tab = null; obs();
until(() => sim.objs('unit').some((u) => u.cstate === 'ready' && u.env === 'climate'), 1440 * 3, 'climate build');
const cu = sim.objs('unit').find((u) => u.cstate === 'ready' && u.env === 'climate'); d({ type: 'commission', order: cu.order }); beat('climate');
lesson('up'); console.log('cash before up', Math.round(s.cash)); if (s.cash < 60000) s.cash = 60000;
build('aisle', { x: 28, y: 15 }, { x: 38, y: 17 }); build('shell2', { x: 29, y: 6 }, { x: 37, y: 14 });
until(() => sim.objs('shell').some((x) => x.floors === 2 && x.cstate !== 'construction'), 1440 * 3, 'shell');
build('hall', { x: 33, y: 7 }, { x: 33, y: 14 }, 0); build('doorWide', { x: 33, y: 14 }); build('loading', { x: 32, y: 15 }, { x: 34, y: 15 });
ui.rend.view = 1; obs(); build('hall', { x: 33, y: 7 }, { x: 33, y: 14 }, 1); build('elevator', { x: 34, y: 13 });
build('light', { x: 33, y: 9 }, null, 1); build('light', { x: 33, y: 9 }, null, 0);
build('iu5x5', { x: 32, y: 7 }, { x: 32, y: 13 }, 1);
until(() => sim.objs('unit').some((u) => u.cstate === 'ready' && u.f > 0), 1440 * 5, 'upper');
const uu = sim.objs('unit').find((u) => u.cstate === 'ready' && u.f > 0); d({ type: 'commission', order: uu.order });
tick(5); console.log('upper milestone', !!s.milestones.first_upper, 'lesson', s.lesson, JSON.stringify(s.lessonsDone));
console.log(log.join('\n')); console.log('done', s.tut.done, 'day', Math.floor(s.t / 1440));
