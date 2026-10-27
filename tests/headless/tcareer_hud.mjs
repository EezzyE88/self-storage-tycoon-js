// Production career calculations and UI handlers. No rendered/browser acceptance implied.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {careerGoalPresentation} from '../../js/careerhud.js';
import {portfolioCareer} from '../../js/career.js';
import {TIERS} from '../../js/data.js';
import {UI} from '../../js/ui.js';

let groups=0;
const test=(name,fn)=>{fn();console.log('PASS '+name);groups++;};
const info=(roll,n,tier=2)=>portfolioCareer(Array.from({length:n},()=>({sim:{s:{mode:'sandbox',coTier:tier},rentRoll:()=>roll/n}})));
test('property-count bottleneck explains an unchanged 50% bar',()=>{
 const p=careerGoalPresentation(info(10000,1));
 assert.equal(p.title,'Next: Regional operator');assert.equal(p.progress,.5);
 assert.equal(p.detail,'Eligible properties 1/2 · Rent roll met');
 assert.match(p.accessible,/10,000.*8,750.*1 of 2 eligible properties/);
});
test('rent-roll bottleneck, simultaneous shortfalls and cents near threshold',()=>{
 const p=careerGoalPresentation(info(5000,2));assert.equal(p.detail,'Rent roll $5,000/$8,750/mo · Property count met');
 assert.equal(p.progress,5000/8750);
 assert.equal(careerGoalPresentation(info(1000,1)).detail,'Rent roll $1,000/$8,750/mo · Eligible properties 1/2');
 assert.match(careerGoalPresentation(info(8749.99,2)).detail,/8,749\.99/);
});
test('pending promotion, all earned tiers and highest tier',()=>{
 assert.equal(careerGoalPresentation(info(8750,2)).detail,'Requirements met · promotion pending');
 for(const tier of TIERS){const p=careerGoalPresentation(info(1000,1,tier.n));
  if(tier.n<5)assert.equal(p.title,'Next: '+TIERS[tier.n].name);
  else{assert.equal(p.title,'Career: Storage magnate');assert.equal(p.progress,null);assert.equal(p.detail,'Highest tier earned');}
 }
 assert.equal(careerGoalPresentation(portfolioCareer([])),null);
});
function fixture(ti=info(10000,1)) {
 const nodes={};for(const id of ['goalbar','careerGoal','careerGoalTitle','careerGoalDetail'])nodes[id]={hidden:false,textContent:'',attrs:{},firstChild:{style:{}},setAttribute(k,v){this.attrs[k]=v;}};
 const ui=Object.create(UI.prototype),s={mode:'sandbox',speed:0,market:{ask:{'5x10|std':100}},policies:{retention:true},coTier:2};
 ui.g={sim:{s},tierInfo:()=>ti,audio:{unlock(){}}};ui.$=id=>nodes[id];ui.title=false;ui.sfx=()=>{};
 return {ui,s,nodes};
}
test('production HUD update is read-only and hides in excluded modes/title',()=>{
 const {ui,s,nodes}=fixture(),before=JSON.stringify(s);ui.renderCareerGoal();
 assert.equal(nodes.goalbar.firstChild.style.width,'50%');assert.equal(nodes.careerGoal.hidden,false);
 assert.match(nodes.careerGoal.attrs['aria-label'],/Open Operator career/);assert.equal(JSON.stringify(s),before);
 for(const excluded of [{creative:true},{mode:'tutorial',tut:{on:true,done:false}},{scenario:{id:'turnaround',status:'active'}}]){
  Object.assign(s,excluded);ui.renderCareerGoal();assert.equal(nodes.careerGoal.hidden,true);assert.equal(nodes.goalbar.hidden,true);
  delete s.creative;delete s.tut;delete s.scenario;s.mode='sandbox';
 }
 ui.title=true;ui.renderCareerGoal();assert.equal(nodes.careerGoal.hidden,true);
 ui.title=false;ui.g.tierInfo=()=>info(1000,1,5);ui.renderCareerGoal();assert.equal(nodes.goalbar.hidden,true);assert.equal(nodes.careerGoal.hidden,false);
});
const click=(ui,a)=>ui.onClick({target:{closest:()=>({dataset:{a},closest:()=>null})}});
test('native career activation cannot trigger global Pause or build confirmation shortcuts',()=>{
 const {ui}=fixture();let stopped=0;
 for(const key of ['Enter',' '])ui.careerGoalKeydown({key,stopPropagation(){stopped++;}});
 assert.equal(stopped,2);ui.careerGoalKeydown({key:'Tab',stopPropagation(){stopped++;}});assert.equal(stopped,2);
});
test('career and Finance actions stay separate, preserve Pause and company data',()=>{
 const {ui,s}=fixture(),calls=[],before=JSON.stringify(s);
 ui.select=x=>calls.push(['select',x]);ui.setTab=(...x)=>calls.push(['tab',...x]);ui.jumpSection=x=>calls.push(['section',x]);ui.showFinances=()=>calls.push(['finance']);
 click(ui,'careerGoal');assert.deepEqual(calls,[['select',null],['tab','growth',true],['section','Operator career']]);
 calls.length=0;click(ui,'finances');assert.deepEqual(calls,[['finance']]);assert.equal(JSON.stringify(s),before);
 s.creative=true;calls.length=0;click(ui,'careerGoal');assert.deepEqual(calls,[]);
 const source=readFileSync('js/ui.js','utf8');
 assert.match(source,/<div class="chip cash-chip" data-a="finances" role="button" aria-label="Open finances">/);
 assert.match(source,/<button class="career-goal" id="careerGoal" data-a="careerGoal" hidden>/);
});
console.log(`${groups} career HUD test groups passed`);
