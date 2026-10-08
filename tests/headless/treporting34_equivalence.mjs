// Compare full economic/gameplay state with the immutable Candidate 33 source through a monthly boundary.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeMaple} from '../../js/maple.js';
const base='3bdba09dfff381dbb8bf881632028903a4f5b43a';
const dir=mkdtempSync(join(tmpdir(),'sst-c33-equivalence-'));
function normalized(s){const copy=JSON.parse(JSON.stringify(s));for(const R of copy.mkt.reports){delete R.period;delete R.lost;delete R.sug;}return copy;}
try{
 const archive=execFileSync('git',['archive',base,'js'],{maxBuffer:5*1024*1024});execFileSync('tar',['-xf','-','-C',dir],{input:archive});
 const {makeMaple:baseline}=await import(pathToFileURL(join(dir,'js/maple.js')).href);
 for(const seed of [34,271]){
  const a=makeMaple(seed),b=baseline(seed);for(const sim of [a,b]){sim.s.tut={on:false,done:true,flags:{}};sim.s.speed=1;sim.events=[];}
  for(let t=0;t<35*1440;t++){
   a.step();b.step();assert.deepEqual(a.events,b.events,'simulation events changed at tick '+t);a.events=[];b.events=[];
   if(t%1440===1439)assert.deepEqual(normalized(a.s),normalized(b.s),'non-report state changed at day '+a.day);
  }
  assert.ok(a.s.mkt.reports.length>0);assert.deepEqual(normalized(a.s),normalized(b.s));console.log('PASS seed '+seed+': 35 days preserve RNG, full non-report state, grade, financial report totals and events');
 }
 console.log('100800 paired ticks against immutable Candidate 33; exclusions are only report period, shopper counts and advice');
}finally{rmSync(dir,{recursive:true,force:true});}
