import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeMaple} from '../../js/maple.js';
import {OFFICE_HOURS} from '../../js/data.js';
let passed=0;function test(name,f){f();passed++;console.log('PASS '+name);}
// Exercise the real feed/cache path without a browser renderer.
function element(){return {children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},prepend(x){this.children.unshift(...x.children)},querySelectorAll(){return this.children.map(x=>({remove:()=>{this.children=this.children.filter(y=>y!==x)}}))},setAttribute(){}};}
globalThis.document={createDocumentFragment:element,createElement:element};
function feedFixture(){const sim=makeMaple(4401);sim.s.speed=0;sim.s.tut.on=false;sim.s.tut.done=true;
 // Stable queued Clerk request while office time changes: no scheduler calls needed.
 const convo={id:33,staffHandling:'Clerk',staffWaiting:true,ownerReview:null,actions:[{label:'Offer 10% off'}],auto:0,text:'Price concern'};
 sim.s.convos=[convo];sim.syncRequestHandling=()=>{};sim.requestOfferStatus=()=>'';
 const ui=Object.create(UI.prototype),feed=element();ui.g={sim};ui.$=()=>feed;ui.pauseForPopup=()=>{throw Error('Staff queue must not interrupt owner')};ui.resumePopup=()=>{};ui.modalOpen=()=>false;
 return{ui,sim,feed,chip:()=>feed.children.find(x=>x.className?.includes('request-handling'))?.textContent};}
for(const [label,before,after,expected]of [
 ['closing',OFFICE_HOURS[1]*60-1,OFFICE_HOURS[1]*60,'awaiting office hours'],
 ['opening',OFFICE_HOURS[0]*60-1,OFFICE_HOURS[0]*60,'awaiting staff availability'],
 ['next morning',(OFFICE_HOURS[1]+1)*60,1440+OFFICE_HOURS[0]*60,'awaiting staff availability']])test('waiting copy refreshes at '+label+' without forced feed render',()=>{
 const f=feedFixture();f.sim.s.t=before;f.ui.renderFeed();const old=f.chip(),oldKey=f.ui.convoKey,child=f.feed.children[0];assert.ok(old);
 f.ui.renderFeed();assert.equal(f.feed.children[0],child,'unchanged state keeps cached DOM');
 f.sim.s.t=after;const state=JSON.stringify(f.sim.s);f.ui.renderFeed();assert.notEqual(f.ui.convoKey,oldKey);assert.ok(f.chip().includes(expected),f.chip());assert.notEqual(f.chip(),old);assert.equal(JSON.stringify(f.sim.s),state);assert.equal(f.sim.s.speed,0);
});
for(const viewport of [[375,667],[390,844]])test(viewport.join('x')+' opening terms reveals within review scroller and preserves paused state',()=>{
 const sim=makeMaple(9);sim.s.speed=0;const state=JSON.stringify(sim.s),ui=Object.create(UI.prototype);ui.g={sim};
 let queued;globalThis.requestAnimationFrame=f=>queued=f;
 const body={scrollTop:35,getBoundingClientRect:()=>({top:viewport[1]-250})};
 const details={open:true,isConnected:true,scrollTop:64,matches:s=>s==='.build-details',closest:()=>body,getBoundingClientRect:()=>({top:viewport[1]-180})};
 ui.revealBuildTerms(details);assert.equal(body.scrollTop,35,'measure only after layout');queued();assert.equal(body.scrollTop,105);assert.equal(details.scrollTop,0);assert.equal(JSON.stringify(sim.s),state);
});
test('collapsed, replaced and unrelated elements cannot cause scrolling',()=>{
 const ui=Object.create(UI.prototype);let queued;globalThis.requestAnimationFrame=f=>queued=f;
 ui.revealBuildTerms({matches:()=>false,open:true});assert.equal(queued,undefined);
 ui.revealBuildTerms({matches:()=>true,open:false});assert.equal(queued,undefined);
 const d={matches:()=>true,open:true,isConnected:true,closest:()=>{throw Error('stale element measured')}};ui.revealBuildTerms(d);d.isConnected=false;queued();
 d.isConnected=true;ui.revealBuildTerms(d);d.open=false;queued();
});
console.log(passed+' display repair behavior groups passed; real layout/touch visibility requires browser recheck.');
