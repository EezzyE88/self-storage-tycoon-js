// Real UI actions and financial commands; disposable seeded states, no normal saves.
import assert from 'node:assert/strict';
import {financialContextBaseline} from './financial_context_baseline.mjs';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {UI} from '../../js/ui.js';
import {Sim} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {creditProjection} from '../../js/finance.js';
import {BILLING_CYCLE_DAYS} from '../../js/data.js';
const parent=path.resolve(process.argv[2]);
const {UI:ParentUI}=await import(pathToFileURL(path.join(parent,'js/ui.js')));
const {Sim:ParentSim}=await import(pathToFileURL(path.join(parent,'js/sim.js')));
function element() {
  const e={dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},
    appendChild(x){this.children.push(x);},prepend(x){this.children.unshift(...x.children);},
    querySelectorAll(){return this.children.map(x=>({remove:()=>{this.children=this.children.filter(y=>y!==x);}}));}};
  let html='';Object.defineProperties(e,{innerHTML:{get:()=>html,set:v=>{html=v;e.firstChild=v?{}:null;}},outerHTML:{get:()=>html}});return e;
}
globalThis.document={createElement:element,createDocumentFragment:element};
function fixture(speed=0,Klass=UI,Model=Sim) {
  const sim=new Model(structuredClone(makeMaple(4242).s));sim.s.t=600;sim.s.speed=speed;
  sim.s.tut={on:false,done:true};sim.s.convos=[];sim.s.cash=1752;
  const ui=Object.create(Klass.prototype),boxes={},toasts=[];
  ui.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){}}};ui.title=false;
  ui.$=id=>boxes[id]||=element();ui.root={classList:element().classList,querySelectorAll:()=>[],querySelector:()=>null};
  ui.sfx=()=>{};ui.toast=t=>toasts.push(t);ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};
  ui.syncFeedbackProperty=()=>{};ui.frameOutline=()=>false;
  return {ui,sim,boxes,toasts};
}
const click=(f,dataset)=>f.ui.onClick({target:{closest:()=>({dataset,closest:()=>null})}});
const act=(f,a,v)=>click(f,{a,v});
const snapshot=f=>structuredClone(f.sim.s);
function bank(f) {
  f.sim.s.cash=-100;f.sim.cashCheck(0);
  const c=f.sim.s.convos.find(c=>c.key==='loan');assert.ok(c);f.ui.renderFeed(true);return c;
}
function reviewBank(f,c){click(f,{a:'convo',id:String(c.id),i:'0'});}
let n=0;const test=(name,f)=>{f();console.log('PASS '+name);n++;};
test('all offered expansion amounts open review; legacy command cannot bypass it',()=>{
  const f=fixture(),html=f.ui.financingHtml();
  assert.ok(f.sim.loanLimit()>=10000);assert.match(html,/data-a="termLoanReview"/);assert.doesNotMatch(html,/type.*borrow/);
  for(const amt of [10000,25000,50000,100000].filter(v=>v<=f.sim.loanLimit())) {
    const before=snapshot(f);act(f,'termLoanReview',String(amt));assert.deepEqual(f.sim.s,before);
    assert.equal(f.ui.termLoanReview.quote.amount,amt);act(f,'modalClose');
  }
  const before=snapshot(f);click(f,{a:'cmd',cmd:JSON.stringify({type:'borrow',amt:10000})});assert.deepEqual(f.sim.s,before);
});
test('term quote is pure and uses authoritative rate, limit, payment, due day and reserve',()=>{
  for(const tier of [1,3])for(const speed of [0,1,2,4]) {
    const f=fixture(speed);f.sim.s.coTier=tier;const before=snapshot(f),q=f.ui.termLoanQuote(10000);
    assert.deepEqual(f.sim.s,before);assert.ok(q.ok);assert.equal(q.limit,f.sim.loanLimit());
    assert.equal(q.rate,f.sim.loanTerms().rate);assert.equal(q.payment,f.sim.loanPmt(q.amount,q.rate,q.months));
    assert.equal(q.firstDay,f.sim.day+BILLING_CYCLE_DAYS);
    const projected=new Sim(structuredClone(f.sim.s));assert.ok(projected.dispatch({type:'borrow',amt:q.amount}).ok);
    assert.deepEqual(q.draw,projected.financialPosition());assert.equal(q.monthlyPayments,projected.s.debt.reduce((a,d)=>a+d.pmt,0));
    f.ui.showTermLoanReview(q.amount);assert.match(f.boxes.modal.innerHTML,/14-day reserve.*excludes/);assert.match(f.boxes.modal.innerHTML,/Future rent is not guaranteed/);
  }
});
test('Back and repeated confirmation cannot borrow; confirmed term loan matches parent command exactly',()=>{
  for(const speed of [0,1,2,4]) {
    const f=fixture(speed),before=snapshot(f);act(f,'termLoanReview','10000');assert.equal(f.sim.s.speed,0);
    act(f,'modalClose');assert.deepEqual(f.sim.s,before);act(f,'termLoanConfirm');assert.deepEqual(f.sim.s,before);
    const expected=new ParentSim(structuredClone(before));assert.ok(expected.dispatch({type:'borrow',amt:10000}).ok);
    act(f,'termLoanReview','10000');act(f,'termLoanConfirm');assert.deepEqual(f.sim.s,expected.s);
    const done=snapshot(f);act(f,'termLoanConfirm');assert.deepEqual(f.sim.s,done);
  }
});
test('changed term terms, cash, existing debt, date or eligibility require a fresh confirmation',()=>{
  for(const mutate of [f=>f.sim.s.coTier=3,f=>f.sim.s.cash+=50,f=>f.sim.dispatch({type:'borrow',amt:5000}),
    f=>f.sim.s.t+=1440,f=>{f.sim.s.mode='tutorial';f.sim.s.tut.done=false;}]) {
    const f=fixture();act(f,'termLoanReview','10000');mutate(f);const before=snapshot(f);act(f,'termLoanConfirm');
    assert.deepEqual(f.sim.s,before);assert.match(f.toasts.at(-1),/quote changed/);
    if(f.ui.termLoanReview){act(f,'termLoanConfirm');assert.equal(f.sim.s.debt.length,before.debt.length+1);}
    else assert.doesNotMatch(f.boxes.modal.innerHTML,/data-a="termLoanConfirm"/);
  }
});
test('tutorial, Free Build, too-small and excessive term loans retain existing ineligibility',()=>{
  for(const setup of [f=>{f.sim.s.mode='tutorial';f.sim.s.tut.done=false;},f=>{f.sim.s.mode='sandbox';f.sim.s.sb={unlimited:true};}]) {
    const f=fixture();setup(f);const before=snapshot(f);act(f,'termLoanReview','10000');act(f,'termLoanConfirm');assert.deepEqual(f.sim.s,before);assert.equal(f.ui.termLoanReview,null);
  }
  for(const amt of [0,4999,1e9,NaN]){const f=fixture();f.ui.showTermLoanReview(amt);assert.equal(f.ui.termLoanReview,null);}
});
test('bank Draw opens existing projection without borrowing, answering or allowing request repaint',()=>{
  const f=fixture(4),c=bank(f);f.ui.requestPanel=true;const before=snapshot(f);reviewBank(f,c);
  assert.match(f.ui.requestCards.join(''),/Review Draw/);
  assert.deepEqual(f.sim.s,before);assert.equal(f.ui.requestPanel,false);
  assert.deepEqual(f.ui.creditReview.quote,creditProjection(f.sim,c.actions[0].action.amt));
  const html=f.boxes.modal.innerHTML;assert.match(html,/request remains pending/);assert.match(html,/Added interest/);
  assert.match(html,/Confirm.*draw/);assert.doesNotMatch(html,/data-a="creditReview"/);
  f.ui.renderFeed(true);assert.equal(f.boxes.modal.innerHTML,html);
  act(f,'modalClose');assert.deepEqual(f.sim.s,before);act(f,'creditConfirm');assert.deepEqual(f.sim.s,before);
});
test('bank confirmation dispatches original request once and matches parent economics',()=>{
  for(const speed of [0,1,2,4]) {
    const f=fixture(speed),c=bank(f),expected=new ParentSim(structuredClone(f.sim.s));
    assert.ok(expected.dispatch({type:'convo',id:c.id,i:0}).ok);expected.s.speed=speed;
    reviewBank(f,c);act(f,'creditConfirm');assert.deepEqual(f.sim.s,expected.s);
    const done=snapshot(f);act(f,'creditConfirm');assert.deepEqual(f.sim.s,done);
  }
});
test('bank draw ignores stale construction context and does not buy construction',()=>{
  const f=fixture(),c=bank(f);f.ui.creditContext=()=>({spend:1000,extraDaily:20});
  const orders=structuredClone(f.sim.s.orders);reviewBank(f,c);
  assert.equal(f.ui.creditReview.quote.spend,0);assert.doesNotMatch(f.boxes.modal.innerHTML,/separate purchase/);
  act(f,'creditConfirm');assert.deepEqual(f.sim.s.orders,orders);
});
test('changed bank quote or reduced credit room cannot borrow on old confirmation',()=>{
  for(const mutate of [f=>f.sim.s.cash+=50,f=>f.sim.s.loan.bal=1,f=>f.sim.s.loan.bal=f.sim.creditLimit()]) {
    const f=fixture(),c=bank(f);reviewBank(f,c);mutate(f);const before=snapshot(f);act(f,'creditConfirm');
    assert.deepEqual(f.sim.s,before);assert.match(f.toasts.at(-1),/quote changed/);
    if(f.ui.creditReview){act(f,'creditConfirm');assert.equal(f.sim.s.loan.bal,before.loan.bal+c.actions[0].action.amt);}
    else assert.doesNotMatch(f.boxes.modal.innerHTML,/data-a="creditConfirm"/);
  }
});
test('removed or replaced bank response cannot be confirmed through a stale review',()=>{
  for(const mutate of [(f,c)=>f.sim.s.convos=[],(f,c)=>c.actions[0].action.amt+=100,(f,c)=>c.actions[0].action={type:'borrow',amt:10000}]) {
    const f=fixture(),c=bank(f);reviewBank(f,c);mutate(f,c);const before=snapshot(f);act(f,'creditConfirm');assert.deepEqual(f.sim.s,before);assert.equal(f.ui.creditReview,null);
  }
});
test('Not now keeps the original nonborrowing behavior',()=>{
  const f=fixture(2),c=bank(f),balance=f.sim.s.loan.bal,cash=f.sim.s.cash;
  click(f,{a:'convo',id:String(c.id),i:'1'});assert.equal(f.sim.s.convos.length,0);
  assert.equal(f.sim.s.loan.bal,balance);assert.equal(f.sim.s.cash,cash);assert.equal(f.sim.s.speed,2);
});
test('manual Pause and other panel or request blocks survive both confirmations',()=>{
  for(const type of ['term','bank'])for(const manual of [false,true]) {
    const f=fixture(4);f.ui.pauseForPopup('panel');
    if(type==='bank'){const c=bank(f);reviewBank(f,c);}else act(f,'termLoanReview','10000');
    if(manual)act(f,'speed','0');
    act(f,type==='bank'?'creditConfirm':'termLoanConfirm');assert.equal(f.sim.s.speed,0);
    f.ui.resumePopup('panel');assert.equal(f.sim.s.speed,manual?0:4);
  }
  const f=fixture(4),c=bank(f);f.sim.convo({key:'other',who:'Owner',text:'Pending',actions:[{label:'OK'}]});
  reviewBank(f,c);act(f,'creditConfirm');assert.equal(f.sim.s.speed,0);assert.equal(f.sim.s.convos.length,1);
});
test('property switches invalidate both reviews without touching either property',()=>{
  for(const type of ['term','bank']) {
    const f=fixture();if(type==='bank')reviewBank(f,bank(f));else act(f,'termLoanReview','10000');
    const old=snapshot(f);f.ui.g.sim=makeMaple(5);const next=snapshot(f);
    act(f,type==='bank'?'creditConfirm':'termLoanConfirm');assert.deepEqual(f.sim.s,next);
    assert.ok(type==='bank'?old.loan.bal===0:old.debt.length===0);
  }
});
test('ordinary credit review, Back, confirm and repayment retain exact parent state and markup',()=>{
  const f=fixture(),b=fixture(0,ParentUI,ParentSim);
  const withoutLoanOptions=html=>html.replace(/<div class="loanopts">.*?<\/div>/,'');
  assert.equal(withoutLoanOptions(f.ui.financingHtml()),withoutLoanOptions(b.ui.financingHtml()));
  for(const [a,v] of [['creditReview','500'],['modalClose'],['creditReview','500'],['creditConfirm']]) {
    act(f,a,v);act(b,a,v);assert.deepEqual(f.sim.s,b.sim.s);assert.equal(f.boxes.modal.innerHTML,b.boxes.modal.innerHTML);
  }
  for(const x of [f,b])click(x,{a:'cmd',cmd:JSON.stringify({type:'repay',amt:500})});assert.deepEqual(f.sim.s,b.sim.s);
  assert.equal(withoutLoanOptions(f.ui.financingHtml()),withoutLoanOptions(b.ui.financingHtml()));
});
test('construction funding context and its existing projections remain exact parent behavior',()=>{
  const f=fixture(),b=fixture(0,ParentUI,ParentSim);
  for(const x of [f,b]) {
    x.ui.tool='du5x10';x.ui.planArgs={a:{x:13,y:21},b:{x:13,y:21},axis:'y'};
    x.ui.replan();assert.notEqual(x.ui.plan.status,'invalid');
  }
  for(const [a,v] of [['fundingReview'],['creditReview','500'],['modalClose'],['creditReview','500'],['creditConfirm']]) {
    act(f,a,v);act(b,a,v);assert.deepEqual(f.sim.s,b.sim.s);assert.equal(f.boxes.modal.innerHTML,b.boxes.modal.innerHTML);
  }
  assert.ok(f.ui.creditContext().spend>0);assert.deepEqual(f.ui.creditContext(),b.ui.creditContext());
});
test('engine/save files remain unchanged; exact inverse of declared financial-context CSS matches parent',()=>{
  for(const name of ['sim.js','finance.js','officepanel.js','main.js','localsave.js','savearchive.js']) {
    assert.equal(readFileSync(new URL('../../js/'+name,import.meta.url),'utf8'),readFileSync(path.join(parent,'js',name),'utf8'),name);
  }
  assert.equal(financialContextBaseline('css/game.css'),readFileSync(path.join(parent,'css/game.css'),'utf8'));
  const f=fixture(),before=JSON.stringify(f.sim.s);act(f,'termLoanReview','10000');act(f,'modalClose');assert.equal(JSON.stringify(f.sim.s),before);
});
console.log(`${n} borrowing-review groups passed`);
