// Regression: rapid repeat taps on borrowing reviews cannot fall through to a second draw or the map,
// and the HUD "today" figure excludes borrowing proceeds and principal repayments.
// Real UI handlers and financial commands on disposable seeded states; controlled clock; no saves.
// The fix lives in js/borrowsettle.js; ui.js only imports it, applies it to UI and uses operatingNet().
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI} from '../../js/ui.js';
import {BORROW_SETTLE_MS, BORROW_SETTLE_CAP_MS, BORROW_SETTLE_EVENTS, BORROW_SETTLE_METHODS, HUD_FINANCING_CATS, installBorrowSettleInput, operatingNet} from '../../js/borrowsettle.js';
import {Sim} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';

let clock=10000;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true,writable:true});
function element() {
  const e={dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},
    appendChild(x){this.children.push(x);},prepend(x){this.children.unshift(...x.children);},
    querySelectorAll(){return this.children.map(x=>({remove:()=>{this.children=this.children.filter(y=>y!==x);}}));}};
  let html='';Object.defineProperties(e,{innerHTML:{get:()=>html,set:v=>{html=v;e.firstChild=v?{}:null;}},outerHTML:{get:()=>html}});return e;
}
globalThis.document={createElement:element,createDocumentFragment:element};
function fixture(cash=1752) {
  const sim=new Sim(structuredClone(makeMaple(4242).s));sim.s.t=600;sim.s.speed=0;
  sim.s.tut={on:false,done:true};sim.s.convos=[];sim.s.cash=cash;
  const ui=Object.create(UI.prototype),boxes={},toasts=[];
  ui.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){}}};ui.title=false;
  ui.$=id=>boxes[id]||=element();ui.root={classList:element().classList,querySelectorAll:()=>[],querySelector:()=>null};
  ui.sfx=()=>{};ui.toast=t=>toasts.push(t);ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};
  ui.syncFeedbackProperty=()=>{};ui.frameOutline=()=>false;
  return {ui,sim,boxes,toasts,mapTaps:0};
}
const click=(f,dataset)=>f.ui.onClick({target:{closest:()=>({dataset,closest:()=>null})}});
const modalOpen=f=>!!(f.ui.creditReview||f.ui.termLoanReview);
// One physical tap at the spot where the review's Confirm button renders. Observed at 390x844:
// with the modal open it hits Confirm; with it closed it hits the panel's "Review $1,000"
// (Financing) or the map (bank request). Every event first meets the capture-phase guard.
function tapConfirmSpot(f,under,{guard=true}={}) {
  for(const type of ['pointerdown','mousedown','click']) {
    const ev={type,cancelable:true,defaultPrevented:false,stopped:false,
      preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){this.stopped=true;}};
    if(guard&&BORROW_SETTLE_EVENTS.includes(type)&&f.ui.borrowSettleSwallow(ev)){assert.ok(ev.stopped&&ev.defaultPrevented);return 'swallowed';}
    if(type!=='click')continue;
    if(f.ui.creditReview){click(f,{a:'creditConfirm'});return 'confirm';}
    if(f.ui.termLoanReview){click(f,{a:'termLoanConfirm'});return 'confirm';}
    if(under==='map'){f.mapTaps++;return 'map';}
    click(f,{a:'creditReview',v:'1000'});return 'panel-review';
  }
}
const burst=(f,under,n,gap,opts)=>{const out=[];for(let i=0;i<n;i++){if(i)clock+=gap;out.push(tapConfirmSpot(f,under,opts));}return out;};
const draws=f=>f.sim.s.ledger.filter(l=>l.cat==='loan').length;
function bank(f){f.sim.s.cash=-100;f.sim.cashCheck(0);const c=f.sim.s.convos.find(c=>c.key==='loan');assert.ok(c);f.ui.renderFeed(true);return c;}
let n=0;const test=(name,fn)=>{fn();console.log('PASS '+name);n++;};

test('control: without the settle guard the observed triple tap takes a second, unreviewed draw',()=>{
  const f=fixture();click(f,{a:'creditReview',v:'1000'});clock+=1000;
  const seq=burst(f,'panel',3,150,{guard:false});
  assert.deepEqual(seq,['confirm','panel-review','confirm']);assert.equal(draws(f),2);assert.equal(f.sim.s.loan.bal,2000);
});
test('credit review: triple tap on Confirm draws exactly once and opens no second review',()=>{
  for(const gap of [60,120,200,300,400]) {
    const f=fixture();click(f,{a:'creditReview',v:'1000'});clock+=1000;
    const seq=burst(f,'panel',3,gap);
    assert.equal(seq[0],'confirm');assert.deepEqual(seq.slice(1),['swallowed','swallowed'],'gap '+gap);
    assert.equal(draws(f),1);assert.equal(f.sim.s.loan.bal,1000);assert.ok(!modalOpen(f));
  }
});
test('term loan: double tap on Confirm creates one loan and no credit-line review',()=>{
  const f=fixture();click(f,{a:'termLoanReview',v:'10000'});clock+=1000;
  const seq=burst(f,'panel',2,150);
  assert.deepEqual(seq,['confirm','swallowed']);assert.equal(f.sim.s.debt.length,1);
  assert.equal(f.sim.s.loan.bal,0);assert.equal(f.ui.creditReview,null);assert.ok(!modalOpen(f));
});
test('bank draw: triple tap resolves the request once and never reaches the map',()=>{
  const f=fixture(),c=bank(f);click(f,{a:'convo',id:String(c.id),i:'0'});assert.ok(f.ui.creditReview?.bank);clock+=1000;
  const before=draws(f),seq=burst(f,'map',3,150);
  assert.deepEqual(seq,['confirm','swallowed','swallowed']);assert.equal(draws(f),before+1);
  assert.ok(!f.sim.s.convos.some(x=>x.id===c.id));assert.equal(f.mapTaps,0);
});
test('double tap on a Review button cannot confirm the review it just opened',()=>{
  const f=fixture();click(f,{a:'creditReview',v:'1000'});clock+=120;
  assert.equal(tapConfirmSpot(f,'panel'),'swallowed');assert.ok(f.ui.creditReview);assert.equal(draws(f),0);
  clock+=BORROW_SETTLE_MS;assert.equal(tapConfirmSpot(f,'panel'),'confirm');assert.equal(draws(f),1);
});
test('a changed quote re-review cannot be confirmed by the same burst',()=>{
  const f=fixture();click(f,{a:'termLoanReview',v:'10000'});clock+=1000;f.sim.s.cash+=100;
  const seq=burst(f,'panel',3,150);
  assert.deepEqual(seq,['confirm','swallowed','swallowed']);assert.equal(f.sim.s.debt.length,0);
  assert.ok(f.ui.termLoanReview);assert.ok(f.toasts.some(t=>/quote changed/.test(t)));
});
test('settle window expires, extends only on presses, and is capped',()=>{
  const f=fixture();click(f,{a:'creditReview',v:'1000'});clock+=1000;
  assert.equal(tapConfirmSpot(f,'panel'),'confirm');const armed=clock;
  clock=armed+BORROW_SETTLE_MS+1;assert.equal(f.ui.borrowSettleSwallow({type:'click'}),false);assert.equal(f.ui.borrowSettle,null);
  const g=fixture();click(g,{a:'creditReview',v:'1000'});clock+=1000;tapConfirmSpot(g,'panel');const t0=clock;
  let swallowed=0;while(clock<t0+BORROW_SETTLE_CAP_MS+400){clock+=200;if(tapConfirmSpot(g,'panel')==='swallowed')swallowed++;else break;}
  assert.ok(clock<=t0+BORROW_SETTLE_CAP_MS+200,'continuous tapping is released by the cap');assert.ok(swallowed>=5);
  for(const ev of ['pointerup','pointercancel','pointermove','touchend','mouseup','keydown'])assert.ok(!BORROW_SETTLE_EVENTS.includes(ev),ev+' never swallowed');
});
test('taps made inside the window but delivered late by a busy main thread are still swallowed',()=>{
  const f=fixture();click(f,{a:'creditReview',v:'1000'});clock+=1000;
  assert.equal(tapConfirmSpot(f,'panel'),'confirm');const made=clock+150;clock+=900; // long render after confirm
  for(const type of ['pointerdown','click']){const ev={type,timeStamp:made,preventDefault(){},stopImmediatePropagation(){},stopPropagation(){}};assert.equal(f.ui.borrowSettleSwallow(ev),true,type);}
  assert.equal(f.ui.creditReview,null);assert.equal(draws(f),1);
  const late={type:'click',timeStamp:clock+5000};clock+=BORROW_SETTLE_CAP_MS;assert.equal(f.ui.borrowSettleSwallow(late),false,'implausible timestamps fall back to processing time');
});
test('window re-bases on the first painted frame after the change',()=>{
  const q=[];globalThis.requestAnimationFrame=cb=>q.push(cb);
  try {
    const f=fixture();click(f,{a:'creditReview',v:'1000'});clock+=1000;q.length=0;
    assert.equal(tapConfirmSpot(f,'panel'),'confirm');const armed=clock;
    clock+=700;while(q.length)q.shift()(clock); // paint delayed 700 ms by a long frame
    clock+=BORROW_SETTLE_MS-50;assert.equal(tapConfirmSpot(f,'panel'),'swallowed','tap 400 ms after the delayed paint');
    assert.ok(f.ui.borrowSettle.until>armed+BORROW_SETTLE_MS);assert.equal(draws(f),1);
  } finally { delete globalThis.requestAnimationFrame; }
});
test('ui.js applies the module through three one-line hooks and the guard installs once in the capture phase',()=>{
  const src=readFileSync(new URL('../../js/ui.js',import.meta.url),'utf8');
  assert.equal((src.match(/borrowsettle\.js/g)||[]).length,1,'one import');
  assert.match(src,/\n\}\napplyBorrowSettle\(UI\);\n$/,'applied once, after the class');
  assert.equal((src.match(/applyBorrowSettle/g)||[]).length,2,'import + call only');
  assert.equal((src.match(/operatingNet\(/g)||[]).length,1,'HUD uses operatingNet once');
  assert.ok(!/borrowSettle/.test(src.replace(/applyBorrowSettle/g,'')),'no other inline settle code in ui.js');
  assert.equal(UI.prototype.borrowSettleApplied,true);
  for(const m of BORROW_SETTLE_METHODS)assert.equal(typeof UI.prototype[m],'function',m);
  const added=[];const prevWin=globalThis.window;globalThis.window={addEventListener:(ev,fn,o)=>added.push([ev,o])};
  try { const ui={};installBorrowSettleInput(ui);installBorrowSettleInput(ui); } finally { if(prevWin===undefined) delete globalThis.window; else globalThis.window=prevWin; }
  assert.deepEqual(added.map(a=>a[0]),BORROW_SETTLE_EVENTS);
  for(const [,o] of added){assert.equal(o.capture,true);assert.equal(o.passive,false);}
  assert.equal(operatingNet({net:25365,categories:{loan:25000,rent:400,settle_interest:-35}}),365);
});
function hud(f){f.ui.slowHud();return f.ui.cashSub;}
const today=s=>Number(/today(?: \(partial\))? ([+-][\d,]+)/.exec(s)[1].replace(/,/g,''));
test('HUD today excludes term loan, credit draws, credit repayment and term payoff',()=>{
  const f=fixture(50000);const base=today(hud(f));
  click(f,{a:'termLoanReview',v:'25000'});click(f,{a:'termLoanConfirm'});
  click(f,{a:'creditReview',v:'5000'});click(f,{a:'creditConfirm'});
  assert.equal(f.sim.s.debt.length,1);assert.equal(f.sim.s.loan.bal,5000);
  assert.equal(today(hud(f)),base,'borrowing is not shown as today\'s gain');
  assert.ok(f.sim.dispatch({type:'repay',amt:5000}).ok);assert.equal(today(hud(f)),base,'repayment is not shown as a loss');
  assert.ok(f.sim.dispatch({type:'payoff',id:f.sim.s.debt[0].id}).ok);assert.equal(f.sim.s.debt.length,0);assert.equal(today(hud(f)),base,'payoff is not shown as a loss');
  const w=f.sim.cashWindow(1);assert.equal(w.categories.loan,30000);assert.ok(w.categories.debt<=-30000,'actual cash movement still records repayments');
});
test('HUD today still counts operating cash: rent in, bills and interest out',()=>{
  const f=fixture(50000);const base=today(hud(f));
  f.sim.money(400,'rent','test rent');f.sim.money(-35,'settle_interest','test interest');f.sim.money(25000,'loan','test proceeds');
  assert.equal(today(hud(f)),base+365);
  for(const c of HUD_FINANCING_CATS)assert.ok(['loan','debt'].includes(c));
});
console.log(n+' borrowing settle and HUD groups passed');
