// Run every headless check/probe. Parameterized construction probes get explicit fixtures.
// Usage: node tests/run-headless.mjs [log-directory]
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.argv[2] || '/tmp/sst-headless-results'); mkdirSync(out,{recursive:true});
const fixture=JSON.stringify([{tool:'aisle',f:0,a:{x:29,y:15},b:{x:37,y:17}},{tool:'shell2',f:0,a:{x:29,y:6},b:{x:37,y:14}},{tool:'iu5x5',f:1,a:{x:1,y:1},b:{x:1,y:1}}]);
const files=readdirSync(resolve(root,'tests/headless')).filter(f=>f.endsWith('.mjs')).sort();
const results=[]; let cursor=0;
async function worker(){
  while(cursor<files.length){
    const file=files[cursor++], start=Date.now();
    const args=['tests/headless/'+file,...(['tv.mjs','tw.mjs'].includes(file)?[fixture]:[])];
    const row=await new Promise(done=>{
      const child=spawn(process.execPath,args,{cwd:root}); let log='',timedOut=false;
      child.stdout.on('data',b=>log+=b); child.stderr.on('data',b=>log+=b);
      const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},600000);
      child.on('error',e=>log+=e.stack);
      child.on('close',code=>{clearTimeout(timer);writeFileSync(resolve(out,file+'.log'),log);
        const failed=timedOut || code!==0 || /^FAIL\b|^SOME FAILED|^\d+ DISTINCT ISSUES/m.test(log);
        done({file,passed:!failed,exit:code,seconds:Math.round((Date.now()-start)/100)/10});});
    });results.push(row);console.log(`${row.passed?'PASS':'FAIL'} ${file} (${row.seconds}s)`);
  }
}
await Promise.all(Array.from({length:4},worker));
results.sort((a,b)=>a.file.localeCompare(b.file));writeFileSync(resolve(out,'results.json'),JSON.stringify(results,null,2));
const failed=results.filter(r=>!r.passed);console.log(`${results.length-failed.length}/${results.length} scripts passed; logs: ${out}`);
if(failed.length)process.exitCode=1;
