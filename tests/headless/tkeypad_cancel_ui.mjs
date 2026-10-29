// Production inspector, click handler, refund review and dispatch; disposable state only.
import assert from 'node:assert/strict';
import {fixture,click} from './transaction-fixture.mjs';
import {Sim} from '../../js/sim.js';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeKeypadCancel} from './keypad_cancel_baseline.mjs';

let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function setup(speed=0){
 const f=fixture(speed),s=f.A,door=s.objs('door').find(d=>!d.keypad);
 const r=s.dispatch({type:'build',tool:'keypad',a:{x:door.x,y:door.y},b:{x:door.x,y:door.y},f:door.f||0});
 assert.ok(r.ok,r.msg);const order=s.s.orders.find(o=>o.id===r.order);
 // The existing inspector initializes daily staff bookkeeping on first display.
 s.ensure();f.ui.sel=door.id;f.ui.inspector();return {...f,door,order};
}
function button(f){
 const html=f.ui.inspector(),tag=html.match(/<button[^>]*>Cancel keypad installation…<\/button>/)?.[0];
 assert.ok(tag,'pending keypad has a cancellation control in the actual inspector');
 assert.ok(!/data-confirmed/.test(tag),'inspector cannot bypass confirmation');
 return JSON.parse(tag.match(/data-cmd='([^']+)'/)[1]);
}
function open(f){click(f,'cmd',null,{cmd:JSON.stringify(button(f))});return f.ui.$('modal').innerHTML;}
function confirm(f){click(f,'cmd',null,{cmd:JSON.stringify({type:'cancelOrder',id:f.order.id}),confirmed:'1'});}
const state=f=>JSON.stringify(f.A.s);

test('pending keypad exposes its own active order without changing state',()=>{
 const f=setup(),before=state(f);assert.deepEqual(button(f),{type:'cancelOrder',id:f.order.id});assert.equal(state(f),before);
});
test('first tap opens existing refund confirmation; Keep building changes nothing',()=>{
 const f=setup(),before=state(f),html=open(f);
 assert.match(html,/Cancel this construction\?/);assert.match(html,/Exact refund/);assert.match(html,/data-qa="cc-confirm"/);
 assert.ok(html.includes('$'+f.order.cost.toLocaleString('en-US')));assert.equal(state(f),before);
 click(f,'modalClose');assert.equal(f.ui.$('modal').innerHTML,'');assert.equal(state(f),before);
});
test('confirmed full undo refunds once, preserves door and restores demolition eligibility',()=>{
 const f=setup(),s=f.A,cash=s.s.cash,n=s.s.ledger.length;open(f);confirm(f);
 assert.equal(s.s.cash,cash+f.order.cost);assert.equal(s.s.ledger.length,n+1);
 assert.equal(s.s.objects[f.door.id],f.door);assert.equal(f.door.keypad,null);
 assert.ok(!s.s.orders.some(o=>o.id===f.order.id));assert.doesNotMatch(f.ui.inspector(),/Cancel keypad installation/);
 assert.equal(s.plan({tool:'demolish',a:f.door,b:f.door,f:f.door.f||0}).status,'valid');
 const after=state(f);confirm(f);assert.equal(state(f),after,'repeat confirmed action cannot pay twice');assert.equal(s.s.speed,0);
});
test('after grace, UI uses exact engine partial refund and keeps completed host',()=>{
 const f=setup(),s=f.A;for(let i=0;i<45;i++){s.step();s.events.length=0;}
 assert.equal(f.order.st,'construction');const q=s.cancelRefund(f.order),cash=s.s.cash;
 assert.equal(q.undo,false);assert.ok(q.refund<f.order.cost);const html=open(f);
 assert.ok(html.includes('$'+q.refund.toLocaleString('en-US')));confirm(f);
 assert.equal(s.s.cash,cash+q.refund);assert.equal(s.s.objects[f.door.id],f.door);assert.equal(f.door.keypad,null);
});
test('existing popup pause restores prior speed and respects a new manual Pause',()=>{
 for(const speed of [0,1,2,4])for(const manual of [false,true]){
  const f=setup(speed);open(f);assert.equal(f.A.s.speed,0);
  if(manual)f.ui.requestSpeed(0);click(f,'modalClose');assert.equal(f.A.s.speed,manual?0:speed);
 }
});
test('completed, missing, stale and unrelated orders never expose this control',()=>{
 for(const mode of ['completed','missing','wrongHost','wrongId','notPending']){
  const f=setup();if(mode==='completed')f.order.st='done';if(mode==='missing')f.A.s.orders=[];
  if(mode==='wrongHost')f.order.keypadDoor=-1;if(mode==='wrongId')f.door.keypadOrder=-1;
  if(mode==='notPending')f.door.keypad='operating';assert.doesNotMatch(f.ui.inspector(),/Cancel keypad installation/);
 }
});
test('reload retains accessible cancellation; stale confirmation cannot refund completed work',()=>{
 const f=setup();f.g.sim=f.g.company.props[0].sim=new Sim(JSON.parse(JSON.stringify(f.A.s)));
 f.A=f.g.sim;f.door=f.A.s.objects[f.door.id];f.order=f.A.s.orders.find(o=>o.id===f.order.id);
 open(f);confirm(f);assert.equal(f.door.keypad,null);
 const g=setup();open(g);g.order.st='done';g.door.keypad='operating';const before=state(g);confirm(g);assert.equal(state(g),before);
});
test('exact inspector inverse preserves parent source and rejects unrelated drift',()=>{
 const source=readFileSync('js/ui.js','utf8');assert.equal(normalizeKeypadCancel(source,'js/ui.js'),execFileSync('git',['show','5546cbc74f3b759a419874da7bb896ab4f8dbe41:js/ui.js'],{encoding:'utf8'}));
 assert.throws(()=>normalizeKeypadCancel(source+'\n','js/ui.js'));assert.throws(()=>normalizeKeypadCancel(source.replace("q.keypadDoor === o.id","q.keypadDoor !== o.id"),'js/ui.js'));
});
console.log(`ALL PASS: ${groups} keypad cancellation UI groups`);
