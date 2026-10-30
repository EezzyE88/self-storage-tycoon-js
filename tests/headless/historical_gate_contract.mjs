import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export async function runHistorical(name,sha){
 const original=readFileSync(new URL('./'+name+'_historical.mjs',import.meta.url));
 assert.deepEqual(original,execFileSync('git',['show',sha+':tests/headless/'+name+'.mjs']),'complete historical assertions');
 const trees={a30d1465ca1d501cb7f54f3687d0db836081feae:'22e44c4b72a0b964fa0fab631b3ccadafc2ddc73',c98b91673ce855a556c9c790ec86de98bd62a469:'77dea3cb13c9c7efd3fd56fbc4c5eefd07e31a5a'};
 assert.equal(execFileSync('git',['rev-parse',sha+'^{tree}'],{encoding:'utf8'}).trim(),trees[sha],'whole historical tree');
 const dir=mkdtempSync(join(tmpdir(),'sst-gate-contract-'));
 try{
  const archive=execFileSync('git',['archive',sha],{maxBuffer:32*1024*1024});
  execFileSync('tar',['-xf','-','-C',dir],{input:archive});
  const script=join(dir,'tests/headless/'+name+'.mjs');
  assert.deepEqual(readFileSync(script),original);
  process.stdout.write(execFileSync(process.execPath,[script],{cwd:dir,encoding:'utf8'}));
 }finally{rmSync(dir,{recursive:true,force:true});}
}
