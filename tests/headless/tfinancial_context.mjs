// Actual production review handlers and transaction engine; no rendered-device claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {UI} from '../../js/ui.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {portfolioCareer} from '../../js/career.js';
import {installTutorial} from '../../js/tutorial.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
import {financialContextBaseline} from './financial_context_baseline.mjs';
const main=readFileSync('js/main.js','utf8');
function fixture(speed=0) {
 const ctx=vm.createContext({Sim,fmtTime,makeMaple,makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,portfolioCareer,installTutorial,localsave,savearchive,cloud:{ok:false},Audio:class{},performance,console,BUILD:{name:'financial-context'},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
 vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+main.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+'\nglobalThis.game=game;',ctx);
 const g=ctx.game,A=makeSandbox({start:'starter',cash:75000}),B=makeSandbox({cash:5000});A.s.speed=speed;A.s.coTier=3;A.s.tut={on:false,done:true};A.s.convos=[];
 g.sim=A;g.company={props:[{name:'Maple & Main',sim:A},{name:'Lot <Two>',sim:B}],active:0,feed:[]};
 const nodes={},el=()=>({innerHTML:'',textContent:'',attrs:{},classList:{add(){},remove(){},toggle(){}},querySelector(){return null;},querySelectorAll(){return[];},setAttribute(k,v){this.attrs[k]=v;},closest(){return null;}});
 const ui=Object.create(UI.prototype);ui.g=g;ui.title=false;ui.$=id=>nodes[id]||=el();g.ui=ui;g.audio={unlock(){},play(){}};
 g.rend={view:'ext',rot:2,zoom:1.2,target:{x:7,y:9}};
 ui.sfx=()=>{};ui.toast=(...args)=>{ui.lastToast=args[0];};ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};
 let saves=0,saved;g.autosavePaused=()=>{if(g.sim.s.speed===0){saves++;saved=JSON.parse(g.saveJSON());}};
 return {g,ui,A,B,nodes,get saves(){return saves;},get saved(){return saved;}};
}
const snapshot=f=>f.g.saveJSON();
function click(f,a,v,extra={}){f.ui.onClick({target:{closest:()=>({dataset:{a,v,...extra},closest:()=>null})}});}
const review=f=>click(f,'transfer','10000',{from:'0',to:'1'});
const confirm=f=>click(f,'transferConfirm',f.ui.transferReview?.token);
let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}

test('acquisition quote is pure and uses authoritative bills, reserve and cents for every offer',()=>{
 for(const [kind,market]of[['parcel','blank'],['parcel','urban'],['parcel','rural'],['facility','maple']]){
  const f=fixture();f.A.s.cash=250000;f.A.s.finance.accrued.opex=256.31;
  const before=snapshot(f),q=f.ui.acquisitionQuote(kind,market);
  assert.equal(q.ok,true);assert.deepEqual(q.position,f.A.financialPosition({spend:q.offer.price}));assert.equal(q.workingCash,5000);assert.equal(snapshot(f),before);
  f.ui.showAcquisitionReview(kind,market);const h=f.nodes.modal.innerHTML;
  for(const text of ['Unpaid committed bills','Recommended reserve','Available after bills &amp; reserve','256.31'])assert.ok(h.includes(text),text);
 }
});
test('positive, zero and negative acquisition availability remain advisory; exact-cash purchase is legal',()=>{
 for(const available of [500,0,-500]){
  const f=fixture(),price=f.g.offers().find(o=>o.kind==='parcel'&&o.market==='blank').price;
  const P=f.A.financialPosition();f.A.s.cash=price+P.committed+P.reserve+available;
  f.ui.showAcquisitionReview('parcel','blank');assert.equal(f.ui.acquisitionReview.quote.position.available,available);
  assert.equal(f.nodes.modal.innerHTML.includes('You can still purchase'),available<0);
  const cash=f.A.s.cash;click(f,'acquisitionConfirm');assert.equal(f.g.company.props.length,3);assert.equal(f.A.s.cash,cash-price);assert.equal(f.g.company.props[2].sim.s.cash,5000);
 }
 const f=fixture(),price=f.g.offers().find(o=>o.kind==='parcel'&&o.market==='blank').price;f.A.s.cash=price;
 f.ui.showAcquisitionReview('parcel','blank');click(f,'acquisitionConfirm');assert.equal(f.A.s.cash,0);assert.equal(f.g.company.props.length,3);
});
test('newly disclosed bills and reserve changes force a fresh acquisition confirmation',()=>{
 for(const mutate of [f=>f.A.s.finance.accrued.opex+=10,f=>f.A.s.staff[0].wage+=1]){
  const f=fixture();f.ui.showAcquisitionReview('parcel','blank');mutate(f);const before=snapshot(f);click(f,'acquisitionConfirm');
  assert.equal(snapshot(f),before);assert.match(f.ui.lastToast,/quote changed/);click(f,'acquisitionConfirm');assert.equal(f.g.company.props.length,3);
 }
});
test('transfer review and cancellation change no financial state; names are escaped',()=>{
 const f=fixture(),before=snapshot(f);review(f);assert.equal(snapshot(f),before);assert.equal(f.saves,0);
 const h=f.nodes.modal.innerHTML;assert.match(h,/Maple &amp; Main/);assert.match(h,/Lot &lt;Two&gt;/);assert.doesNotMatch(h,/Lot <Two>/);
 assert.match(h,/Source cash after transfer/);assert.match(h,/Destination cash after transfer/);assert.match(h,/no fee, income or expense/);
 click(f,'modalClose');assert.equal(snapshot(f),before);click(f,'transferConfirm','1');assert.equal(snapshot(f),before);
});
test('confirmed transfer retains exact engine balances, debt, ledger pairs and one paused save',()=>{
 const f=fixture(),beforeTotal=f.A.s.cash+f.B.s.cash,debt=JSON.stringify([f.A.s.debt,f.B.s.debt]);review(f);const token=f.ui.transferReview.token;confirm(f);
 assert.equal(f.A.s.cash,65000);assert.equal(f.B.s.cash,15000);assert.equal(f.A.s.cash+f.B.s.cash,beforeTotal);assert.equal(JSON.stringify([f.A.s.debt,f.B.s.debt]),debt);
 assert.equal(f.A.s.ledger.filter(e=>e.note==='Transfer to Lot <Two>').length,1);assert.equal(f.B.s.ledger.filter(e=>e.note==='Transfer from Maple & Main').length,1);
 assert.equal(f.saves,1);assert.equal(f.saved.props[0].s.cash,65000);assert.equal(f.saved.props[1].s.cash,15000);
 click(f,'transferConfirm',token);assert.equal(f.saves,1);review(f);confirm(f);assert.equal(f.B.s.cash,25000);assert.equal(f.saves,2);
});
test('exact $10k source and negative reserve transfer legally; insufficient/malformed quotes fail',()=>{
 const f=fixture();f.A.s.cash=10000;review(f);assert.ok(f.ui.transferReview.quote.position.available<0);assert.match(f.nodes.modal.innerHTML,/You can still transfer/);confirm(f);assert.equal(f.A.s.cash,0);
 assert.equal(f.ui.transferQuote(0,1,10000).ok,false);
 for(const args of [[0,0,10000],[1,0,10000],[0,8,10000],[0,1,9999],[0,1,NaN],[-1,1,10000]])assert.equal(f.ui.transferQuote(...args).ok,false);
});
test('cash, destination balance, names, bills and reserve changes invalidate stale transfer quote and old button',()=>{
 for(const mutate of [f=>f.A.s.cash-=1,f=>f.B.s.cash+=1,f=>f.g.company.props[1].name='Renamed',f=>f.A.s.finance.accrued.payroll+=1,f=>f.A.s.staff[0].wage+=1]){
  const f=fixture();review(f);const old=f.ui.transferReview.token;mutate(f);const before=snapshot(f);click(f,'transferConfirm',old);assert.equal(snapshot(f),before);assert.match(f.ui.lastToast,/quote changed/);
  click(f,'transferConfirm',old);assert.equal(snapshot(f),before);confirm(f);assert.equal(f.B.s.ledger.filter(e=>e.note.startsWith('Transfer from')).length,1);
 }
});
test('source/company/destination identities cannot silently redirect a reviewed transfer',()=>{
 for(const mutate of [f=>{f.g.company={...f.g.company};},f=>{f.g.company.props[0]={...f.g.company.props[0]};},f=>{f.g.company.props[1]={...f.g.company.props[1]};},f=>{f.g.company.props[1].sim=makeSandbox({cash:1});},f=>{f.g.company.active=1;f.g.sim=f.B;}]){
  const f=fixture();review(f);const token=f.ui.transferReview.token;mutate(f);const before=snapshot(f);click(f,'transferConfirm',token);assert.equal(snapshot(f),before);assert.equal(f.ui.transferReview,null);assert.equal(f.saves,0);
 }
});
test('losing affordability cannot spend; later cash restoration needs a fresh review',()=>{
 const f=fixture();review(f);const token=f.ui.transferReview.token;f.A.s.cash=9999;const before=snapshot(f);click(f,'transferConfirm',token);assert.equal(snapshot(f),before);assert.equal(f.ui.transferReview,null);assert.doesNotMatch(f.nodes.modal.innerHTML,/data-a="transferConfirm"/);
 f.A.s.cash=20000;click(f,'transferConfirm',token);assert.equal(f.B.s.cash,5000);review(f);confirm(f);assert.equal(f.B.s.cash,15000);
});
test('other financial modals and cancelled/replaced reviews cannot execute old transfer',()=>{
 for(const open of [f=>f.ui.showCreditReview(500),f=>f.ui.showTermLoanReview(10000),f=>f.ui.showAcquisitionReview('parcel','blank'),f=>click(f,'modalClose')]){
  const f=fixture();review(f);const token=f.ui.transferReview.token;open(f);const before=snapshot(f);click(f,'transferConfirm',token);assert.equal(snapshot(f),before);assert.equal(f.ui.transferReview,null);
 }
 const f=fixture();review(f);const token=f.ui.transferReview.token;f.ui.root={querySelector:()=>null};f.ui.setView=()=>{};f.ui.resetSession('ext');const before=snapshot(f);click(f,'transferConfirm',token);assert.equal(snapshot(f),before);assert.equal(f.ui.transferReview,null);
});
test('nested temporary pauses and manual Pause survive Back and transfer confirmation at all speeds',()=>{
 for(const speed of [0,1,2,4])for(const manual of [false,true])for(const end of ['cancel','confirm']){
  const f=fixture(speed),time=f.A.s.t,camera=JSON.stringify(f.g.rend);f.ui.pauseForPopup('panel');review(f);assert.equal(f.A.s.speed,0);
  if(manual)f.ui.notePause(0);if(end==='cancel')click(f,'modalClose');else confirm(f);
  assert.equal(f.A.s.speed,0);f.ui.resumePopup('panel');assert.equal(f.A.s.speed,manual?0:speed);assert.equal(f.A.s.t,time);assert.equal(JSON.stringify(f.g.rend),camera);
 }
});
test('HUD metadata stays visible outside cash updates, exposes full safe name and changes no saved state',()=>{
 const f=fixture(),before=snapshot(f),button={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};f.ui.$('activeProperty').closest=()=>button;
 for(const name of ['Maple & Main (1/2)','Lot <Two> (2/2)','Very long property name '.repeat(8)]){
  f.ui.setMeta(name,'Sandbox');assert.equal(f.nodes.activeProperty.textContent,name);assert.equal(button.attrs['aria-label'],'Open finances for '+name);
  f.ui.$('cash').innerHTML='$500<small>Cash</small>';assert.equal(f.nodes.activeProperty.textContent,name);
 }
 assert.equal(snapshot(f),before);assert.doesNotMatch(f.nodes.pname.innerHTML,/<Two>/);
});
test('F/f keyboard menu replacement invalidates transfer tokens without changing money, Pause or saves',()=>{
 const start=main.indexOf("window.addEventListener('keydown', (e) => {");
 assert.ok(start>=0);const end=main.indexOf('\n});',start);assert.ok(end>start);
 for(const key of ['f','F'])for(const speed of [0,1,2,4])for(const manual of [false,true]){
  const f=fixture(speed);f.g.audio.vol={master:0,sfx:0,music:0,amb:0};
  for(const k of ['keptLabel','archiveLabel','numberingInfo','autosaveNote'])f.ui[k]=()=>'';
  f.ui.pauseForPopup('panel');review(f);if(manual)f.ui.notePause(0);
  const token=f.ui.transferReview.token,before=snapshot(f),time=f.A.s.t,initialSaves=f.saves;
  let keydown;vm.runInNewContext(main.slice(start,end+4),{game:f.g,window:{addEventListener(type,fn){assert.equal(type,'keydown');keydown=fn;}}});
  keydown({key,target:{tagName:'DIV'}});
  assert.match(f.nodes.modal.innerHTML,/<h2 style="flex:1">Menu/);
  assert.equal(f.ui.transferReview,null);assert.equal(snapshot(f),before);assert.equal(f.saves,initialSaves);
  click(f,'transferConfirm',token);assert.equal(snapshot(f),before);assert.equal(f.saves,initialSaves);
  f.ui.closeModal();assert.equal(f.A.s.speed,0);f.ui.resumePopup('panel');assert.equal(f.A.s.speed,manual?0:speed);assert.equal(f.A.s.t,time);
  review(f);const fresh=f.ui.transferReview.token;assert.notEqual(fresh,token);
  const reopened=snapshot(f),reopenSaves=f.saves;click(f,'transferConfirm',token);assert.equal(snapshot(f),reopened);assert.equal(f.saves,reopenSaves);
  click(f,'transferConfirm',fresh);assert.equal(f.A.s.cash,65000);assert.equal(f.B.s.cash,15000);assert.equal(f.saves,reopenSaves+1);
  assert.equal(f.saved.props[0].s.cash,65000);assert.equal(f.saved.props[1].s.cash,15000);
  assert.equal(f.A.s.ledger.filter(e=>e.note.startsWith('Transfer to')).length,1);assert.equal(f.B.s.ledger.filter(e=>e.note.startsWith('Transfer from')).length,1);
  click(f,'transferConfirm',fresh);assert.equal(f.saves,reopenSaves+1);assert.equal(f.A.s.speed,manual?0:speed);assert.equal(f.A.s.t,time);
 }
});
test('exact historical normalization preserves full parent identities and engine/save files',()=>{
 for(const file of ['js/ui.js','css/game.css','js/main.js','js/sim.js','js/finance.js','js/data.js','js/localsave.js','js/savearchive.js','js/durablesave.js','js/cloud.js'])assert.equal(financialContextBaseline(file),execFileSync('git',['show','b8ce9e9f0c00fa239b33da96c19662a962a5afd6:'+file],{encoding:'utf8'}));
});
console.log(`${groups} financial-context groups passed`);
