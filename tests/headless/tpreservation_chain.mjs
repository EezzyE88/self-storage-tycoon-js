import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {normalizePostStage4A} from './post_stage4a_baseline.mjs';
import {normalizeStage1} from './stage1_baseline.mjs';
import {transactionBaseline} from './transaction_baseline.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'});
const layers=JSON.parse(readFileSync('tests/headless/post_stage4a-allowlist.json','utf8')).layers;
const presentation=JSON.parse(readFileSync('tests/headless/stage1_presentation-allowlist.json','utf8'));
let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}
test('every new inverse is the complete verified immutable commit diff',()=>{
 for(const layer of [...layers,presentation]){
  assert.equal(git('show','-s','--format=%P',layer.commit).trim(),layer.parent_commit);
  assert.equal(git('rev-parse',layer.commit+'^{tree}').trim(),layer.tree);
  const files=git('diff','--name-only',layer.parent_commit,layer.commit,'--','js','css').trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(Object.keys(layer.files).sort(),files);
  for(const [file,entry] of Object.entries(layer.files)){
   const before=git('show',layer.parent_commit+':'+file),after=git('show',layer.commit+':'+file);
   assert.equal(hash(before),entry.parent_sha256);assert.equal(hash(after),entry.current_sha256);
   let text=after;for(const h of [...entry.hunks].reverse()){assert.equal(text.split(h.after).length-1,1);text=text.replace(h.after,h.before);}
   assert.equal(text,before);
  }
 }
});
test('shared chain restores full original master files without changing old pins',()=>{
 for(const file of ['js/ui.js','js/sim.js','js/render.js','js/showcase.js','js/tutorial.js','css/game.css','js/main.js','js/finance.js','js/data.js','js/localsave.js','js/durablesave.js','js/savearchive.js','js/cloud.js'])
  assert.equal(transactionBaseline(file),git('show','d03bbcdb7245f379512b0c13041b004742133d83:'+file),file);
});
test('post-Stage-4A chain also restores added placeable module and known ancestor identities',()=>{
 for(const file of ['js/ui.js','js/showcase.js','js/placeableops.js']){
  const before=git('show','47473de932157ecc344cbc46cb63311c4dbe901f:'+file);
  assert.equal(normalizePostStage4A(readFileSync(file,'utf8'),file),before);
  assert.equal(normalizePostStage4A(before,file),before);
 }
});
test('unrelated source drift is rejected in UI simulation rendering CSS tutorial and notifications',()=>{
 for(const file of ['js/ui.js','js/sim.js','js/render.js','css/game.css','js/tutorial.js','js/showcase.js']){
  const text=readFileSync(file,'utf8');
  assert.throws(()=>normalizeStage1(text+'\n// undeclared mutation\n',file),{name:'AssertionError'},file+' append');
  assert.throws(()=>normalizeStage1(text.replace('\n','\n '),file),{name:'AssertionError'},file+' whitespace');
 }
});
console.log(`${groups} preservation normalization groups passed`);
