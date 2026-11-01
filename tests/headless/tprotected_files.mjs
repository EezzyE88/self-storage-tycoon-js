// Announced-change guard for save and money files (testing plan Step 1b).
// Each listed file must match the sha256 recorded in protected-files.json. An intended change updates
// that hash in the same pull request, so it shows up in review; an unannounced change fails here.
// This is a deliberate-edit tripwire only: behavior is tested by the other suites.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('./protected-files.json',import.meta.url),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
const files=Object.entries(manifest.files);
test('the protected list covers the save and money files',()=>{
 for(const f of ['js/localsave.js','js/durablesave.js','js/savearchive.js','js/cloud.js','js/finance.js','js/data.js'])assert.ok(manifest.files[f],f+' is protected');
 for(const [f,e] of files){assert.ok(existsSync(f),f+' exists');assert.match(e.sha256,/^[0-9a-f]{64}$/,f+' has a sha256');assert.ok(e.protects,f+' says what it protects');}
});
test('every protected file matches its announced fingerprint',()=>{
 const changed=files.filter(([f,e])=>hash(readFileSync(f))!==e.sha256).map(([f,e])=>`${f} (${e.protects}) is now ${hash(readFileSync(f))}`);
 assert.deepEqual(changed,[],'Protected file changed without an announced fingerprint. If the change is intended, update its sha256 in tests/headless/protected-files.json in the same pull request:\n'+changed.join('\n'));
});
test('the guard detects a one-byte change and an appended line',()=>{
 for(const [f,e] of files){const text=readFileSync(f,'utf8');
  assert.notEqual(hash(text+'\n'),e.sha256,f+' appended newline');
  const i=text.indexOf('=');assert.notEqual(hash(text.slice(0,i)+'!'+text.slice(i+1)),e.sha256,f+' one-byte change');}
});
console.log(`${n} protected-file groups passed`);
