// Comeback is additive. Preserve all pre-existing factories, state, events, RNG, costs and saves against verified Candidate 35.
// The previous Candidate-19 check already failed on Candidate 35; its frozen whole-scenarios.js assertion also forbade adding any scenario.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeMaple } from '../../js/maple.js';
import { makeScenario, makeSandbox } from '../../js/scenarios.js';
const dir='tests/fixtures/candidate35';
const provenance=JSON.parse(readFileSync(join(dir,'provenance.json'),'utf8'));
assert.equal(provenance.commit,'e3a737011627ebb27db34a9104a8283e9d895b18');
for(const [f,h]of Object.entries(provenance.files))assert.equal(createHash('sha256').update(readFileSync(join(dir,f))).digest('hex'),h,'baseline fixture '+f);
{
  const oldMaple=await import(pathToFileURL(join(dir,'maple.js')).href),old=await import(pathToFileURL(join(dir,'scenarios.js')).href);
  for(const f of ['data.js','finance.js','economics.js','maple.js','localsave.js','savearchive.js'])assert.equal(readFileSync('js/'+f,'utf8'),readFileSync(join(dir,f),'utf8'),f+' changed');
  const fixtures=[['Maple',()=>makeMaple(36),()=>oldMaple.makeMaple(36)],['Business sandbox',()=>makeSandbox({start:'starter'}),()=>old.makeSandbox({start:'starter'})],...['turnaround','vertical','climate'].map(id=>[id,()=>makeScenario(id),()=>old.makeScenario(id)])];
  for(const [name,aFactory,bFactory]of fixtures){
    const a=aFactory(),b=bFactory();assert.deepEqual(a.s,b.s,name+' initialization');a.events=[];b.events=[];
    for(let i=0;i<1440*7;i++){a.step();b.step();assert.deepEqual(a.events,b.events,name+' events at '+i);a.events=[];b.events=[];if(i%1440===1439)assert.deepEqual(a.s,b.s,name+' daily state');}
    assert.deepEqual(a.s,b.s,name+' final state');console.log('PASS '+name+': seven days, complete state/events/RNG unchanged against Candidate 35');
  }
}
