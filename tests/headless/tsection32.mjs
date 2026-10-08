import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeMaple} from '../../js/maple.js';
import {execFileSync} from 'node:child_process';
import {Sim} from '../../js/sim.js';
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS '+name);};
function fixture(tab='growth',speed=4){
 const sim=makeMaple(32);sim.s.tut={on:false,done:true,flags:{}};sim.s.speed=speed;
 const ui=Object.create(UI.prototype);let html='',writes=0,menu=null;
 const picker={textContent:'',setAttribute(){}};
 const headings=['Growth Readiness','Operator career','Customer experience','Lessons','Acquisitions','Asking rents','Collections','Work queue','Staff'].map(label=>({dataset:{section:label},getBoundingClientRect:()=>({top:180})}));
 const body={scrollTop:53,querySelectorAll:()=>headings,getBoundingClientRect:()=>({top:100})};
 const box={querySelector(s){if(s==='[data-section-menu]')return menu;if(s==='[data-section-picker]')return picker;if(s==='.body')return body;return null;}};
 Object.defineProperty(box,'innerHTML',{get:()=>html,set:v=>{html=v;writes++;menu=v.includes('data-section-menu=')?{identity:writes}:null;box.firstChild=v?{classList:{add(){}}}:null;}});
 ui.g={sim,company:null,audio:{unlock(){},play(){}},rend:{view:0,setSelection(){},setView(){},setOverlay(){},setPreview(){}}};
 ui.tab=tab;ui.sel=null;ui.sheetTall=true;ui.$=()=>box;ui.root={querySelector:()=>null,querySelectorAll:()=>[]};ui.sfx=()=>{};ui.syncFeedbackProperty=()=>{};ui.syncFloorUi=()=>{};
 // Real panel rendering, section navigation and popup pause handlers; only its DOM is stubbed.
 ui.renderSheet(true);body.scrollTop=53;
 const click=(a,v)=>ui.onClick({target:{closest:()=>({dataset:{a,v}})}});
 return {ui,sim,box,body,click,writes:()=>writes,menu:()=>menu};
}
if(process.env.SST_C31_HISTORY === '1') test('Candidate 31 refresh path replaces the panel under an open picker',()=>{
 const source=execFileSync('git',['show','dbc895cc2d471d3bcd13c36a624da9859e9878a1:js/ui.js'],{encoding:'utf8'});
 const code=source.slice(source.indexOf('  renderSheet(force = false) {'),source.indexOf('  jumpSection(label) {')).trim();
 const baseline=Function('return function '+code)();const f=fixture();f.click('sectionMenu');const node=f.menu();f.sim.s.cash+=200;baseline.call(f.ui,true);assert.notEqual(f.menu(),node);
});
test('background refreshes retain the actual open buttons and scroll at prior 4x',()=>{
 const f=fixture();f.click('sectionMenu');const node=f.menu(),count=f.writes();assert.ok(node);assert.equal(f.sim.s.speed,0);
 for(let i=0;i<120;i++){f.sim.s.cash+=200;f.sim.s.milestones.first_repair=i;f.ui.renderSheet(i%2===0);}
 assert.equal(f.menu(),node);assert.equal(f.writes(),count);assert.equal(f.body.scrollTop,53);assert.equal(f.ui.popupResume,4);
});
test('all three panels offer reachable choices and an explicit Close',()=>{
 for(const tab of ['growth','business','operate']){const f=fixture(tab);f.click('sectionMenu');assert.match(f.box.innerHTML,/data-section-menu/);assert.match(f.box.innerHTML,/data-a="sectionMenuClose"/);assert.match(f.box.innerHTML,/data-a="section"/);assert.match(f.box.innerHTML,/aria-expanded="true"/);}
});
test('selection dismisses menu, jumps to requested heading and stays selected through refresh',()=>{
 const f=fixture();f.click('sectionMenu');f.click('section','Customer experience');assert.equal(f.menu(),null);assert.equal(f.ui.sectionChoice.label,'Customer experience');assert.equal(f.body.scrollTop,125);assert.equal(f.sim.s.speed,0);
 f.sim.s.cash++;f.ui.renderSheet(true);assert.match(f.box.innerHTML,/Customer experience ▾/);
});
test('repeated open taps do not rebuild menu; Close refreshes without releasing panel pause',()=>{
 const f=fixture();f.click('sectionMenu');const node=f.menu();for(let i=0;i<10;i++)f.click('sectionMenu');assert.equal(f.menu(),node);
 f.click('sectionMenuClose');assert.equal(f.menu(),null);assert.equal(f.ui.sectionMenuKey,null);assert.equal(f.sim.s.speed,0);f.ui.setTab(null);assert.equal(f.sim.s.speed,4);
});
test('manual Pause survives menu and panel closure',()=>{
 for(const speed of [0,4]){const f=fixture('growth',speed);f.click('sectionMenu');f.ui.requestSpeed(0);f.click('sectionMenuClose');f.ui.setTab(null);assert.equal(f.sim.s.speed,0);}
});
test('legitimate request hold does not remove the menu or resume underneath it',()=>{
 const f=fixture();f.click('sectionMenu');const node=f.menu();f.ui.pauseForPopup('requests');f.ui.renderSheet(true);assert.equal(f.menu(),node);f.ui.resumePopup('requests');assert.equal(f.sim.s.speed,0);assert.equal(f.menu(),node);f.click('sectionMenuClose');f.ui.setTab(null);assert.equal(f.sim.s.speed,4);
});
test('explicit panel navigation and property reset discard transient menu state',()=>{
 const f=fixture();f.click('sectionMenu');f.ui.setTab('business',true);assert.equal(f.menu(),null);f.click('sectionMenu');f.ui.resetSession(0);assert.equal(f.ui.sectionMenuKey,null);assert.equal(f.ui.sectionChoice,null);
});
test('Back to map explicitly closes chooser and releases the expanded panel hold',()=>{
 const f=fixture();f.click('sectionMenu');f.ui.swipedAt=-1000;f.click('sheetGrow');assert.equal(f.menu(),null);assert.equal(f.ui.sheetTall,false);assert.equal(f.sim.s.speed,4);
});
test('save/reload contains no transient chooser fields and preserves policies',()=>{
 const f=fixture();const policies=JSON.stringify(f.sim.s.policies);f.click('sectionMenu');const saved=JSON.stringify(f.sim.s);const reload=new Sim(JSON.parse(saved));assert.equal(JSON.stringify(reload.s.policies),policies);assert.equal(reload.s.sectionMenuKey,undefined);assert.equal(reload.s.sectionChoice,undefined);
});
if(process.env.SST_C31_HISTORY !== '1') console.log('SKIP exact Candidate 31 reproduction: opt in with SST_C31_HISTORY=1 in a history-bearing checkout');
console.log(n+' stable section-menu checks passed (DOM fixture, not physical Safari)');
