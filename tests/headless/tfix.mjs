// Round 13 checks: old-tutorial save migration, climate-conversion renovation, HUD mode label.
import { makeMaple } from '../../js/maple.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {climateInventory} from '../../js/climateavailability.js';
import {convertedFixture,operatorMinute} from './climate-conversion-fixture.mjs';
import {MARKETS,MIN_PER_DAY,ROLES,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {Sim,fmtTime} from '../../js/sim.js';
import { installTutorial, BEATS } from '../../js/tutorial.js';
let ok = true; const check = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name, extra); ok &&= !!cond; };
// 1. pre-Round-11 save mid-tutorial (no market state, old part 9 = "Add Climate")
{ const st = JSON.parse(JSON.stringify(makeMaple().s)); delete st.mkt; st.tut = { on: true, beat: 9, flags: {}, done: false, entered: true };
  const sim = new Sim(st); check('old save part 9 -> new part', sim.s.tut.beat === 7 && BEATS[7].id === 'grad', `beat ${sim.s.tut.beat} ${BEATS[sim.s.tut.beat].id}`);
  const st2 = JSON.parse(JSON.stringify(makeMaple().s)); st2.tut = { on: true, beat: 6, flags: {}, done: false }; const sim2 = new Sim(st2);
  check('Round 11+ save untouched', sim2.s.tut.beat === 6); }
// 2. Required conversion/readiness, independent of receiving a tenant by a deadline.
const {sim,s:state,u,hvac,option,cash,id,num,r}=convertedFixture();
check('HVAC built and conversion allowed',hvac.ok&&option.ok);
check('conversion succeeds and costs the exact quote',r.ok&&u.env==='climate'&&cash-state.cash===option.cost);
check('actual make-ready queued',state.tasks.some(t=>t.obj===u.id&&t.type==='makeready'));
let minutes=0;for(;minutes<20*1440&&u.commercial==='unready';minutes++)operatorMinute(sim,minutes);
check('make-ready actually completes',!state.tasks.some(t=>t.obj===u.id&&t.type==='makeready'));
const facts=sm=>{const q=sm.s.objects[id];return {id:q.id,num:q.num,name:q.name,f:q.f,size:q.size,env:q.env,cstate:q.cstate,commercial:q.commercial,blocked:q.blocked,missing:q.missing,lease:q.lease,ask:sm.askFor(q)};};
check('unit identity and numbering retained',u.id===id&&u.num===num);
check('converted unit is operating, ready, accessible and unleased',u.cstate==='operating'&&u.commercial==='ready'&&!u.blocked&&!(u.missing||[]).length&&u.lease==null);
state.speed=0;const expected=facts(sim),before=JSON.stringify(state),events=JSON.stringify(sim.events),quote=sim.askFor(u);
const inventory=climateInventory(sim,u.size);check('production inventory reports converted unit eligible',inventory.units.some(x=>x.id===id&&x.conditions.includes('eligible')));
check('eligibility and asking-rent reads preserve complete state and RNG',JSON.stringify(state)===before&&JSON.stringify(sim.events)===events&&sim.askFor(u)===quote);
// Real main.js raw/compressed export and prepareLoad, as used by the existing legacy-save suite.
const source=readFileSync('js/main.js','utf8'),funcs=source.slice(source.indexOf('function validState('),source.indexOf('function makeMapleSeedPrice(')),methods=source.slice(source.indexOf('  rawSaveCode('),source.indexOf('  applyLoad('));
const api=eval('(()=>{'+funcs+';return ({'+methods+'});})()');
for(const code of [api.rawSaveCode(JSON.stringify(state)),await api.saveCode(JSON.stringify(state))]){
 const loaded=await api.prepareLoad(code);assert.ok(loaded.ok,loaded.msg);const copy=loaded.company.props[0].sim;
 assert.deepEqual(facts(copy),expected);assert.equal(copy.s.cash,state.cash);assert.equal(copy.s.t,state.t);assert.equal(copy.s.rngS,state.rngS);assert.equal(copy.s.speed,0);
 assert.ok(climateInventory(copy,u.size).units.some(x=>x.id===id&&x.conditions.includes('eligible')));
}
check('raw/compressed saves retain identity, eligibility, ask, cash, clock, RNG and Pause',true);
console.log(ok?'ALL PASS: deterministic conversion/readiness/save checks; no leasing-time guarantee':'SOME FAILED');
process.exitCode=ok?0:1;
