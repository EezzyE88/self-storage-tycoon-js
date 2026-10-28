import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fixture,snapshot,click,review} from './transaction-fixture.mjs';
import {transactionBaseline} from './transaction_baseline.mjs';
import {operatingNet} from '../../js/borrowsettle.js';
const main=readFileSync('js/main.js','utf8');
const kinds={acquisition:['acquisitionReview','acquisitionConfirm'],credit:['creditReview','creditConfirm'],term:['termLoanReview','termLoanConfirm'],transfer:['transferReview','transferConfirm']};
function open(f,k){f.A.s.cash=250000;if(k==='acquisition')f.ui.showAcquisitionReview('parcel','blank');if(k==='credit')f.ui.showCreditReview(1000);if(k==='term')f.ui.showTermLoanReview(10000);if(k==='transfer')review(f);assert.ok(f.ui[kinds[k][0]]);}
function menu(f,key){f.g.audio.vol={};for(const k of ['keptLabel','archiveLabel','numberingInfo','autosaveNote'])f.ui[k]=()=>'';let handler;const a=main.indexOf("window.addEventListener('keydown', (e) => {"),b=main.indexOf('\n});',a);vm.runInNewContext(main.slice(a,b+4),{game:f.g,window:{addEventListener(_,fn){handler=fn;}}});handler({key,target:{tagName:'DIV'}});assert.match(f.ui.$('modal').innerHTML,/>Menu</);}
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('F/f invalidates every financial review across speeds and manual Pause',()=>{
 for(const key of ['f','F'])for(const speed of [0,1,2,4])for(const manual of [false,true])for(const k of Object.keys(kinds)) {
  const f=fixture(speed);open(f,k);if(manual)f.ui.notePause(0);const token=f.ui.transferReview?.token;menu(f,key);const before=snapshot(f),saves=f.saves;
  assert.equal(f.ui[kinds[k][0]],null);click(f,kinds[k][1],token);assert.equal(snapshot(f),before);assert.equal(f.saves,saves);
  f.ui.closeModal();assert.equal(f.A.s.speed,manual?0:speed);
 }
});
test('Back rejects old confirms and a fresh review can transact once',()=>{
 for(const k of Object.keys(kinds)){const f=fixture();open(f,k);const token=f.ui.transferReview?.token;click(f,'modalClose');const before=snapshot(f);click(f,kinds[k][1],token);assert.equal(snapshot(f),before);open(f,k);const fresh=f.ui.transferReview?.token;click(f,kinds[k][1],fresh);const after=snapshot(f),saves=f.saves;assert.notEqual(after,before);click(f,kinds[k][1],fresh);assert.equal(snapshot(f),after);assert.equal(f.saves,saves);}
});
test('navigation invalidates obsolete financial authorizations',()=>{
 for(const k of Object.keys(kinds)){const f=fixture();open(f,k);const token=f.ui.transferReview?.token;f.ui.showFinances=()=>{};click(f,'finances');const before=snapshot(f);click(f,kinds[k][1],token);assert.equal(snapshot(f),before);}
});
test('session and property reset clear acquisition as well as loan and transfer reviews',()=>{
 for(const k of Object.keys(kinds)){const f=fixture();open(f,k);f.ui.root={querySelector:()=>null};f.ui.setView=()=>{};f.ui.resetSession('ext');assert.equal(f.ui[kinds[k][0]],null);}
});
test('Menu then fresh matching review still posts the ordinary quoted action',()=>{
 for(const k of Object.keys(kinds)){const f=fixture();open(f,k);menu(f,'f');f.ui.closeModal();open(f,k);const cash=f.A.s.cash,price=f.ui.acquisitionReview?.quote.offer.price;click(f,kinds[k][1],f.ui.transferReview?.token);assert.equal(f.A.s.cash,k==='acquisition'?cash-price:k==='credit'?cash+1000:k==='term'?cash+10000:cash-10000);assert.equal(f.saves,1);}
});
test('HUD excludes financing but includes rent interest capex and transfers without changing ledgers',()=>{
 const f=fixture();for(const [amount,category] of [[25000,'loan'],[-1000,'debt'],[400,'rent'],[-35,'settle_interest'],[-800,'capex'],[-10000,'other']])f.A.money(amount,category,'test');
 const before=snapshot(f),w=f.A.cashWindow(1);assert.equal(operatingNet(w),w.net-(w.categories.loan||0)-(w.categories.debt||0));
 assert.equal(operatingNet({net:13565,categories:{loan:25000,debt:-1000,rent:400,settle_interest:-35,capex:-800,other:-10000}}),-10435);
 f.ui.slowHud();assert.match(f.ui.cashSub,/cash today/);assert.equal(snapshot(f),before);assert.ok(w.categories.loan&&w.categories.debt&&w.categories.capex&&w.categories.other);
});
test('whole-file inverse exactly restores original master UI with no weakened old source pin',()=>{
 assert.equal(transactionBaseline('js/ui.js'),execFileSync('git',['show','d03bbcdb7245f379512b0c13041b004742133d83:js/ui.js'],{encoding:'utf8'}));
 assert.equal(readFileSync('tests/headless/financial-context-allowlist.json','utf8'),execFileSync('git',['show','d03bbcdb7245f379512b0c13041b004742133d83:tests/headless/financial-context-allowlist.json'],{encoding:'utf8'}));
});
test('finance engine and persistence files remain original master blobs',()=>{
 for(const file of ['js/main.js','js/sim.js','js/finance.js','js/data.js','js/localsave.js','js/durablesave.js','js/savearchive.js','js/cloud.js'])assert.equal(readFileSync(file,'utf8'),execFileSync('git',['show','d03bbcdb7245f379512b0c13041b004742133d83:'+file],{encoding:'utf8'}));
});
console.log(`${n} transaction safety groups passed`);
