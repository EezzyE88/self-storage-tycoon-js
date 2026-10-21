import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {OFFICE_HOURS} from '../../js/data.js';

let passed = 0;
const test = (name, f) => { f(); console.log('PASS ' + name); passed++; };
function element() {
  const e = {dataset: {}, children: [], className: '', textContent: '',
    appendChild(x) { this.children.push(x); }, prepend(x) { this.children.unshift(...x.children); },
    querySelectorAll() { return this.children.map(x => ({remove: () => {this.children = this.children.filter(y => y !== x);}})); },
    classList: {toggle() {}, add() {}, remove() {}}, setAttribute() {}};
  let html = '';
  Object.defineProperties(e, {
    innerHTML: {get: () => html, set(v) {html = v; this.firstChild = v ? {} : null;}},
    outerHTML: {get: () => `<div class="${e.className}">${html}</div>`}
  });
  return e;
}
globalThis.document = {createDocumentFragment: element, createElement: element};
const main = readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');
const tickCode = main.slice(main.indexOf('function stepTicks('), main.indexOf('\nlet last =', main.indexOf('function stepTicks(')));
function fixture(role = 'clerk', speed = 1) {
  const sim = makeMaple(4242); sim.s.t = 10 * 60; sim.s.speed = speed;
  sim.s.tut.on = false; sim.s.tut.done = true; sim.onTick = null;
  if (role) assert.equal(sim.dispatch({type: 'hire', role}).ok, true);
  sim.events.length = 0;
  const ui = Object.create(UI.prototype), boxes = {}, toasts = [];
  const game = {sim, audio: {unlock() {}}, company: null, syncTier() {}, drain() {
    for (const e of sim.events.splice(0)) if (['convo', 'manager', 'convo_expired'].includes(e.type)) ui.onEvent(e);
  }};
  game.ui = ui; ui.g = game; ui.title = false; ui.toasts = []; ui.sfx = () => {};
  ui.toast = t => toasts.push(t); ui.$ = id => boxes[id] ||= element();
  ui.renderSheet = () => {}; ui.renderTut = () => {}; ui.syncFloorUi = () => {};
  game.rend = {}; // no rendering needed for the real request and pause handlers
  const context = vm.createContext({game, BG_EVENTS: {}});
  vm.runInContext(tickCode, context);
  const ticks = n => context.stepTicks(n);
  const click = dataset => ui.onClick({target: {closest: () => ({dataset, closest: () => null})}});
  return {sim, ui, boxes, ticks, click, toasts};
}
function request(f, extra = {}) {
  f.sim.convo({key: 'probe', who: 'A shopper', text: 'Routine question', auto: 0, def: 1, ttl: 40,
    actions: [{label: 'Acknowledge', action: {type: 'cv', op: 'noted'}}, {label: 'Dismiss'}], ...extra});
  f.ui.renderFeed(true); return f.sim.s.convos.at(-1);
}

function retention(f) {
 const tn=Object.values(f.sim.s.tenants)[0],L=f.sim.s.leases[tn.lease],u=f.sim.s.objects[L.unit];
 tn.leaving=true;tn.retainTried=false;f.sim.s.policies.retention=true;
 f.sim.schedule({kind:'moveout',tenant:tn.id,unit:u.id},f.sim.s.t+2*1440);
 f.sim.moveoutConvo(tn,L,u,true);f.ui.renderFeed(true);
 return{tn,L,c:f.sim.s.convos.at(-1)};
}
for(const role of ['clerk','manager']) for(const speed of [0,1,2,4])test(`${role} retention queues after hours at ${speed}x, then handles next shift`,()=>{
 const f=fixture(role,speed);f.sim.s.t=19*60;const {tn,L,c}=retention(f),rent=L.rent,cash=f.sim.s.cash;
 assert.equal(c.staffHandling,role==='clerk'?'Clerk':'Manager');assert.equal(c.staffWaiting,true);assert.equal(f.ui.ownerRequestCards.length,0);assert.equal(f.sim.s.speed,speed);
 const t=f.sim.s.t;f.ticks(20);assert.equal(f.sim.s.t,t+(speed?20:0));assert.equal(tn.retainTried,false);
 const loaded=new Sim(JSON.parse(JSON.stringify(f.sim.s))),saved=loaded.s.convos[0];loaded.syncRequestHandling();assert.equal(saved.staffWaiting,true);assert.equal(loaded.s.speed,speed);
 f.sim.s.t=1440+8*60;f.sim.rnd=()=>0;f.ui.renderFeed(true);f.ticks(15);
 if(speed){assert.equal(tn.retainTried,true);assert.equal(L.rent,Math.round(rent*.9));assert.equal(f.sim.s.convos.length,0);}
 else{assert.equal(tn.retainTried,false);assert.equal(L.rent,rent);assert.equal(f.sim.s.speed,0);}
 assert.equal(f.sim.s.cash,cash);
});
test('temporary Clerk gap queues without an owner card, then returns to normal handling',()=>{
 const f=fixture('clerk',2),{tn,L,c}=retention(f),ag=f.sim.s.agents.find(a=>a.role==='clerk'),rent=L.rent;
 ag.st='walk';f.ui.renderFeed(true);assert.equal(c.staffWaiting,true);assert.equal(c.ownerReview,undefined);assert.equal(f.ui.ownerRequestCards.length,0);assert.equal(f.sim.s.speed,2);assert.match(f.ui.requestCards.join(''),/when staff are available/);
 f.sim.s.t+=20;f.sim.convoTick();assert.equal(tn.retainTried,false);ag.st='office';f.sim.rnd=()=>0;f.sim.convoTick();assert.equal(tn.retainTried,true);assert.equal(L.rent,Math.round(rent*.9));
});
test('closing and reopening retains the authorized queue',()=>{
 const f=fixture('clerk',4);f.sim.s.t=17*60+55;const {tn,c}=retention(f);f.sim.s.t=18*60;f.ui.renderFeed(true);assert.equal(c.staffWaiting,true);assert.equal(c.ownerReview,undefined);assert.equal(f.sim.s.speed,4);
 f.sim.s.t=1440+8*60;f.sim.rnd=()=>0;f.sim.convoTick();assert.equal(tn.retainTried,true);
});
test('saved legacy coverage flag recovers only for authorized retention',()=>{
 const f=fixture('clerk',1),{c}=retention(f);c.ownerReview='coverage';c.staffHandling=null;const sim=new Sim(JSON.parse(JSON.stringify(f.sim.s)));sim.syncRequestHandling();assert.equal(sim.s.convos[0].ownerReview,undefined);assert.equal(sim.s.convos[0].staffHandling,'Clerk');
});
for(const why of ['manual','owner','failed','critical','noStaff'])test(`genuine ${why} exception remains owner-held`,()=>{
 const f=fixture('clerk',4),{c,tn}=retention(f);
 if(why==='manual')f.sim.s.policies.manualRequests=true;
 if(['owner','failed'].includes(why))c.ownerReview=why;
 if(why==='critical')c.sev='critical';
 if(why==='noStaff')f.sim.dispatch({type:'fire',id:f.sim.s.staff.find(s=>s.role==='clerk').id});
 f.ui.renderFeed(true);const t=f.sim.s.t;f.ticks(60);assert.equal(f.sim.s.t,t);assert.equal(f.sim.s.speed,0);assert.equal(c.staffHandling,null);assert.equal(tn.retainTried,false);
});
for(const hour of [10,19])test(`switching retention off at ${hour}:00 prevents pending discount`,()=>{
 const f=fixture('manager',1);f.sim.s.t=hour*60;const {tn,L,c}=retention(f),rent=L.rent;
 f.sim.dispatch({type:'policy',key:'retention',v:false});f.ui.renderFeed(true);assert.equal(c.auto,1);assert.equal(f.ui.ownerRequestCards.length,0);
 if(hour===19){assert.equal(c.staffWaiting,true);f.sim.s.t=1440+8*60;}
 f.sim.s.t+=15;f.sim.convoTick();assert.equal(L.rent,rent);assert.equal(tn.retainTried,false);assert.equal(f.sim.s.convos.length,0);
});
test('decline completes once, no extra discount or repeat owner request',()=>{
 const f=fixture('manager',1),{tn,L,c}=retention(f),rent=L.rent;f.sim.rnd=()=>.999;f.ticks(15);assert.equal(tn.retainTried,true);assert.equal(tn.leaving,true);assert.equal(L.rent,rent);assert.equal(f.sim.s.convos.length,0);assert.match(f.sim.requestHistory()[0].msg,/declined/);
 const r=f.sim.dispatch({type:'cv',op:'retain',tenant:tn.id});assert.equal(r.ok,false);assert.equal(L.rent,rent);
});
test('policy switched off during a Clerk gap queues move-out instructions instead of applying discount',()=>{
 const f=fixture('clerk',1),{tn,L,c}=retention(f),rent=L.rent,ag=f.sim.s.agents.find(a=>a.role==='clerk');ag.st='walk';f.ui.renderFeed(true);
 f.sim.dispatch({type:'policy',key:'retention',v:false});f.ui.renderFeed(true);assert.equal(c.auto,1);assert.equal(c.staffWaiting,true);assert.equal(f.sim.s.speed,1);f.sim.s.t+=15;f.sim.convoTick();assert.ok(f.sim.s.convos.includes(c));
 ag.st='office';f.sim.convoTick();assert.equal(f.sim.s.convos.length,0);assert.equal(tn.retainTried,false);assert.equal(L.rent,rent);
});
console.log(`${passed} traffic/delegation behavior groups passed`);
