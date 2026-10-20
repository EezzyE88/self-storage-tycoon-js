// Production markup + handlers, disposable state only. --render emits browser CSS fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {UI} from '../../js/ui.js';
import {Sim} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {creditProjection} from '../../js/finance.js';
const parent=process.argv[2];
const before=await import(pathToFileURL(path.resolve(parent,'js/ui.js')));
const baseline=await import(pathToFileURL(path.resolve(parent,'js/sim.js')));
function fixture(Klass=UI,Model=Sim,state=makeMaple(3).s){
 const sim=new Model(structuredClone(state));sim.s.speed=0;sim.s.cash=1752;sim.s.tut={on:false,done:true};
 const u=Object.create(Klass.prototype),boxes={};
 const el=()=>({innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}});
 u.g={sim,audio:{unlock(){},play(){}},rend:{view:'ext',setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},faceYardExtension(){}}};
 u.title=false;u.root={classList:el().classList,querySelectorAll:()=>[],querySelector:()=>null};u.$=k=>boxes[k]||=el();
 u.sfx=()=>{};u.toast=()=>{};u.renderTut=()=>{};u.syncFeedbackProperty=()=>{};u.frameOutline=()=>false;
 u.renderSheet=()=>{u.tab='business';u.sheetTall=true;u.$('sheet').innerHTML=u.sheet('Business','',u.financingHtml());};
 return{u,sim,boxes};
}
const click=(u,a,v)=>u.onClick({target:{closest:()=>({dataset:{a,v},closest:()=>null})}});
let groups=0;const test=(name,f)=>{f();groups++;console.log('PASS '+name);};
const seed=makeMaple(3).s;
test('description and all original financial actions retain exact content',()=>{
 const a=fixture(UI,Sim,seed),b=fixture(before.UI,baseline.Sim,seed);
 for(const debt of [0,500]){a.sim.s.loan.bal=b.sim.s.loan.bal=debt;
 assert.equal(a.u.financingHtml().replace('item credit-line','item'),b.u.financingHtml());}
});
test('funding review, quote selection, Back, confirm draw and repayment match exact parent state',()=>{
 const a=fixture(UI,Sim,seed),b=fixture(before.UI,baseline.Sim,seed);
 for(const f of [a,b]){f.u.tool='du5x10';f.u.planArgs={a:{x:13,y:21},b:{x:13,y:21},axis:'y'};f.u.replan();assert.notEqual(f.u.plan.status,'invalid');f.u.renderActionBar();}
 const parity=()=>{assert.deepEqual(a.sim.s,b.sim.s);assert.equal(a.sim.s.speed,0);};
 for(const [action,value] of [['fundingReview'],['creditReview','500'],['modalClose'],['creditReview','500'],['creditConfirm']]){
  click(a.u,action,value);click(b.u,action,value);parity();assert.equal(a.boxes.modal.innerHTML,b.boxes.modal.innerHTML);
 }
 assert.ok(a.u.creditContext()?.spend>0);assert.equal(a.sim.s.loan.bal,500);assert.equal(a.sim.s.cash,2252);
 for(const f of [a,b])f.u.onClick({target:{closest:()=>({dataset:{a:'cmd',cmd:JSON.stringify({type:'repay',amt:500})},closest:()=>null})}});
 parity();assert.equal(a.sim.s.loan.bal,0);assert.equal(a.sim.s.cash,1752);
 assert.deepEqual(creditProjection(a.sim,1000),creditProjection(b.sim,1000));
});
console.log(`${groups} financing groups passed`);
const renderAt=process.argv.indexOf('--render');
if(renderAt>=0){
 const checkout=path.resolve(process.argv[renderAt+1]),out=path.join(checkout,'dist');fs.mkdirSync(out,{recursive:true});
 const all=[];
 for(const [label,Klass,Model,root] of [['before',before.UI,baseline.Sim,parent],['after',UI,Sim,path.resolve('.')]]){
 fs.writeFileSync(path.join(out,label+'.css'),fs.readFileSync(path.join(root,'css/game.css')));
 for(const kind of ['financing','repay','funding','draw']){
  const f=fixture(Klass,Model,seed);if(kind==='repay')f.sim.s.loan.bal=500;
  if(['funding','draw'].includes(kind)){f.u.tool='du5x10';f.u.planArgs={a:{x:13,y:21},b:{x:13,y:21},axis:'y'};f.u.replan();f.u.renderActionBar();click(f.u,'fundingReview');if(kind==='draw')click(f.u,'creditReview','500');}
  else f.u.renderSheet();
  const markup=`<div id="ui" class="${kind==='financing'||kind==='repay'?'has-sheet':''}"><div id="sheet">${f.boxes.sheet?.innerHTML||''}</div><div id="abar">${f.boxes.abar?.innerHTML||''}</div><nav class="tabs"></nav><div id="modal">${f.boxes.modal?.innerHTML||''}</div></div>`;
  const filename=`${label}-${kind}.html`;fs.writeFileSync(path.join(out,filename),`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${label}.css"><title>${label} ${kind}</title>${markup}`);
  for(const [w,h]of[[320,568],[375,667],[393,852],[402,874]])all.push(`<section><h2>${label} ${kind} ${w}×${h}</h2><iframe title="${label}-${kind}-${w}" src="${filename}" style="width:${w}px;height:${h}px;border:0"></iframe></section>`);
 }
 }
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><title>Actual financing markup — isolated fixtures</title><style>body{font:14px system-ui;background:#ddd}main{display:flex;gap:20px;flex-wrap:wrap}h2{font-size:16px}</style><h1>Production UI markup / CSS, synthetic state</h1><main>${all.join('')}</main>`);
 fs.mkdirSync(path.join(checkout,'.openai'),{recursive:true});fs.writeFileSync(path.join(checkout,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}));
 console.log('Rendered production financing/funding fixtures: '+out);
}
