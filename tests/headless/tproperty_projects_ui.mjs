import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';
import { Sim } from '../../js/sim.js';
import { recovered } from './project-fixture.mjs';
function el(){return{innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}};}
const initial=recovered().s;
function fixture(speed){const sim=new Sim(structuredClone(initial));sim.s.speed=speed;const ui=Object.create(UI.prototype),boxes={};ui.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},faceYardExtension(){}}};ui.title=false;ui.root={classList:el().classList,querySelectorAll:()=>[],querySelector:()=>null};ui.$=k=>boxes[k]||=el();ui.sfx=()=>{};ui.toast=()=>{};ui.renderTut=()=>{};ui.syncFeedbackProperty=()=>{};ui.spendingHtml=()=>'';ui.buildSheet=()=>'';ui.frameOutline=()=>false;return{ui,sim,boxes};}
for(const speed of [0,1,2,4])for(const key of ['small','large']){
 const {ui,sim,boxes}=fixture(speed);const cash=sim.s.cash,t=sim.s.t;
 assert.ok(ui.previewProject(key));assert.equal(sim.s.cash,cash);assert.equal(sim.s.t,t);assert.equal(sim.s.speed,0);
 assert.match(boxes.abar.innerHTML,/project preview/);assert.match(boxes.abar.innerHTML,/data-v="small"/);assert.match(boxes.abar.innerHTML,/data-v="large"/);
 const other=key==='small'?'large':'small';assert.ok(ui.previewProject(other));assert.equal(sim.s.cash,cash);assert.equal(ui.projectProposal.key,other);
 assert.ok(ui.previewProject(key));
 ui.setTab('growth',true);assert.equal(ui.growthProposal.projectKey,key);assert.ok(ui.returnGrowthProposal());assert.equal(ui.projectProposal.key,key);
 ui.requestSpeed(0);ui.confirmPlan();assert.equal(sim.s.speed,0);assert.equal(sim.s.t,t);assert.equal(sim.s.propertyProjects.active.key,key);
 assert.equal(sim.s.cash,cash-(key==='small'?1240:980));
 console.log(`PASS actual preview switching, Growth return and manually paused Confirm: ${speed}x/${key}`);
}
const {ui,sim}=fixture(0);ui.previewProject('small');const cash=sim.s.cash;ui.pickTool(null);assert.equal(ui.projectProposal,null);assert.equal(sim.s.cash,cash);assert.equal(sim.s.propertyProjects,undefined);assert.equal(sim.s.speed,0);
console.log('PASS discard preview spends nothing and preserves Pause');
