// Candidate 35 is presentation only: compare complete simulation state with immutable Candidate 34.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeMaple} from '../../js/maple.js';
import {UI} from '../../js/ui.js';
const base='b8858040bb4465362c761f4b683cc5ca3d37849d',dir=mkdtempSync(join(tmpdir(),'sst-c34-feedback-'));
try{
 const archive=execFileSync('git',['archive',base,'js'],{maxBuffer:5*1024*1024});execFileSync('tar',['-xf','-','-C',dir],{input:archive});
 const {makeMaple:baseline}=await import(pathToFileURL(join(dir,'js/maple.js')).href);
 for(const seed of [35,271]){
  const a=makeMaple(seed),b=baseline(seed);for(const sim of [a,b]){sim.s.tut={on:false,done:true,flags:{}};sim.s.speed=1;sim.events=[];}
  const ui=Object.create(UI.prototype);ui.g={sim:a};
  for(let t=0;t<35*1440;t++){
   a.step();b.step();assert.deepEqual(a.events,b.events,'events changed at tick '+t);a.events=[];b.events=[];
   if(t%1440===1439){const before=JSON.stringify(a.s);ui.feedbackSheet();assert.equal(JSON.stringify(a.s),before,'render changed state');assert.deepEqual(a.s,b.s,'full state changed at day '+a.day);}
  }
  assert.ok(a.s.mkt.reports.length);assert.deepEqual(a.s,b.s);console.log('PASS seed '+seed+': 35 days, full state and events unchanged after daily feedback rendering');
 }
 console.log('100800 paired ticks against immutable Candidate 34; no state exclusions');
}finally{rmSync(dir,{recursive:true,force:true});}
