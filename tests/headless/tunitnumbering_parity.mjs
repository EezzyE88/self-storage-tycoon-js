// Historical numbering-only parity stays at 1339648 vs 9700d9d.
// Current migration compares two paths under the current engine, never old/new economics.
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Sim} from '../../js/sim.js';
const [legacyRoot, numberedRoot] = process.argv.slice(2).map(p => resolve(p));
if (!legacyRoot || !numberedRoot) throw Error('Pass exact 9700d9d and 1339648 exports');
const numberedSHA='1339648652cf61bfce23a96a60cbb54a7006c32a';
const original=readFileSync(new URL('../fixtures/numbering-1339648/tunitnumbering_parity.mjs',import.meta.url));
assert.deepEqual(original,execFileSync('git',['show',numberedSHA+':tests/headless/tunitnumbering_parity.mjs']),'historical assertions retained byte-for-byte');
const temp=mkdtempSync(join(tmpdir(),'sst-numbering-history-'));
try {
  mkdirSync(join(temp,'tests/headless'),{recursive:true});
  writeFileSync(join(temp,'package.json'),JSON.stringify({type:'module'}));
  symlinkSync(join(numberedRoot,'js'),join(temp,'js'),'dir');
  const script=join(temp,'tests/headless/tunitnumbering_parity.mjs');writeFileSync(script,original);
  process.stdout.write(execFileSync(process.execPath,[script,legacyRoot],{encoding:'utf8'}));
} finally {rmSync(temp,{recursive:true,force:true});}
const old=await import(pathToFileURL(join(legacyRoot,'js/maple.js')));
const oldScenarios=await import(pathToFileURL(join(legacyRoot,'js/scenarios.js')));
const {Sim:NumberedSim}=await import(pathToFileURL(join(numberedRoot,'js/sim.js')));
const copy=x=>JSON.parse(JSON.stringify(x));
// Same numbering/display-only exclusions as the preserved original test.
// Finance, condition, RNG and every other gameplay field remain compared.
function comparable(v){
 if(typeof v==='string')return v.replace(/Unit \d+\b/g,'Unit <number>');
 if(Array.isArray(v))return v.map(comparable);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['unitNumbering','unitRoles','unitNo','unitNumber','num'].includes(k)).map(([k,x])=>[k,comparable(x)]));
 return v;
}
function migrate(raw,label,days){
 const untouched=JSON.stringify(raw);
 const direct=new Sim(copy(raw));
 // Independent reference: established original numbering migration, then current load.
 const viaNumbering=new Sim(copy(new NumberedSim(copy(raw)).s));
 assert.deepEqual(comparable(direct.s),comparable(raw),label+' loading preserves legacy gameplay');
 assert.deepEqual(direct.s,viaNumbering.s,label+' direct/two-stage migration exact state');
 // JSON saves omit undefined object properties; compare their complete serialized representation.
 let reloaded=new Sim(copy(direct.s));assert.deepEqual(copy(reloaded.s),copy(direct.s),label+' load is idempotent');
 for(let day=0;day<days;day++){
  for(let i=0;i<1440;i++){direct.step();viaNumbering.step();reloaded.step();direct.events=[];viaNumbering.events=[];reloaded.events=[];}
  assert.deepEqual(direct.s,viaNumbering.s,label+' current-engine path parity day '+day);
  assert.deepEqual(copy(reloaded.s),copy(direct.s),label+' current reload parity day '+day);
  reloaded=new Sim(copy(reloaded.s));assert.deepEqual(copy(reloaded.s),copy(direct.s),label+' daily reload exact state '+day);
 }
 assert.equal(JSON.stringify(raw),untouched,label+' legacy input unchanged');
 console.log('PASS current-engine exact legacy migration and reload: '+label+', '+days+' days');
}
for(const seed of [7,99,9711]){
 const fresh=old.makeMaple(seed);fresh.act_tutSkip();migrate(fresh.s,'fresh seed '+seed,30);
 const aged=old.makeMaple(seed);aged.act_tutSkip();for(let i=0;i<5*1440;i++){aged.step();aged.events=[];}
 migrate(aged.s,'aged seed '+seed,30);
}
for(const id of ['comeback','turnaround','vertical','climate'])migrate(oldScenarios.makeScenario(id,9711).s,'scenario '+id,3);
console.log('ALL PASS: historical numbering parity and current-engine legacy migration');
