// GitHub Pages deploy stamp: version.js is exact on the project's Pages address only with a valid deploy stamp;
// the stamp never overrides or creates exactness anywhere else. tools/build-pages-site.mjs writes that stamp and
// copies only runtime files, byte-identical to the commit except js/build-stamp.js.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync, existsSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseSourceIdentity, UNVERIFIED_NAME} from '../../js/version.js';
import {STAMP} from '../../js/build-stamp.js';
import {buildSite, stampSource, SITE_FILES, REPO} from '../../tools/build-pages-site.mjs';

let groups=0;const pass=m=>console.log('PASS '+m);
const SHA='d3dff40c78de27773a4ee92ebbd513488276d820',OTHER='bfcc68951c0f64a8fdfb08d917a26c373ed0cf44';
const PAGES='https://eezzye88.github.io/self-storage-tycoon-js/js/version.js',good={repo:'EezzyE88/self-storage-tycoon-js',sha:SHA};
const no=(url,stamp,reason)=>{const b=parseSourceIdentity(url,stamp);assert.equal(b.exact,false);assert.equal(b.name,UNVERIFIED_NAME);assert.equal(b.sha,null);
  if(reason)assert.equal(b.reason,reason);pass(`not exact (${b.reason}) ${url} stamp=${JSON.stringify(stamp)}`);};

// 1. Pages address with a valid stamp is exact.
for(const url of [PAGES,'https://EEZZYE88.github.io/self-storage-tycoon-js/js/version.js',PAGES+'?v=2#x']){const b=parseSourceIdentity(url,good);
  assert.deepEqual([b.exact,b.name,b.sha,b.reason,b.date],[true,'d3dff40',SHA,'deploy-stamp','exact source']);pass('exact '+url);}
assert.equal(parseSourceIdentity(PAGES,{repo:'eezzye88/SELF-STORAGE-TYCOON-JS',sha:SHA.toUpperCase()}).sha,SHA);pass('stamp repo/sha case normalised');
groups++;

// 2. Pages address without a valid stamp is not exact.
no(PAGES,null,'missing-deploy-stamp');no(PAGES,undefined,'missing-deploy-stamp');no(PAGES,'d3dff40c78de27773a4ee92ebbd513488276d820','missing-deploy-stamp');
no(PAGES,{repo:'someoneelse/self-storage-tycoon-js',sha:SHA},'wrong-repository');no(PAGES,{sha:SHA},'wrong-repository');
for(const sha of ['d3dff40',SHA.slice(0,39),SHA+'0','master','',null,42])no(PAGES,{repo:REPO,sha},'malformed-deploy-stamp');
groups++;

// 3. Wrong Pages paths, protocol, port; other Pages sites.
for(const url of ['https://eezzye88.github.io/js/version.js','https://eezzye88.github.io/other-repo/js/version.js','https://eezzye88.github.io/self-storage-tycoon-js/x/js/version.js',
  'https://eezzye88.github.io/self-storage-tycoon-js/version.js','https://eezzye88.github.io/self-storage-tycoon-js/js/main.js'])no(url,good,'unsupported-path');
no('http://eezzye88.github.io/self-storage-tycoon-js/js/version.js',good,'unsupported-protocol');
no('https://eezzye88.github.io:8443/self-storage-tycoon-js/js/version.js',good,'unsupported-host');
for(const url of ['https://someoneelse.github.io/self-storage-tycoon-js/js/version.js','https://eezzye88.github.io.evil.example/self-storage-tycoon-js/js/version.js'])no(url,good,'unsupported-host');
groups++;

// 4. A stamp never creates or overrides exactness off Pages.
for(const url of ['http://localhost:8000/js/version.js','file:///srv/js/version.js','https://self-storage-tycoon-js.vercel.app/js/version.js',
  'https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/master/js/version.js'])no(url,good);
const pinned=parseSourceIdentity(`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${OTHER}/js/version.js`,good);
assert.deepEqual([pinned.exact,pinned.sha,pinned.reason],[true,OTHER,'commit-pinned']);pass('githack URL SHA wins over a different stamp');
groups++;

// 5. Repository stamp is null; the site builder stamps exactly and copies only runtime files unchanged.
assert.equal(STAMP,null);pass('committed js/build-stamp.js exports STAMP = null');
for(const bad of ['d3dff40',SHA.toUpperCase(),SHA+'\n','',"x'); alert(1); ('"])assert.throws(()=>stampSource(bad));pass('stamp writer rejects non-canonical SHAs');
const files=d=>readdirSync(d).flatMap(f=>{const p=join(d,f);return statSync(p).isDirectory()?files(p):[p];});
const out=mkdtempSync(join(tmpdir(),'sst-pages-'));
try{
  buildSite(process.cwd(),SHA,out);
  const built=files(out).map(p=>relative(out,p)).sort();
  for(const f of built)assert.ok(f==='.nojekyll'||SITE_FILES.some(s=>f===s||f.startsWith(s+'/')),'unexpected site file '+f);
  for(const f of ['tests','docs','server','tools','.github','.git','README.md'])assert.ok(!existsSync(join(out,f)),f+' excluded');
  const source=files(process.cwd()+'/js').concat(...['css','vendor'].map(d=>files(process.cwd()+'/'+d))).map(p=>relative(process.cwd(),p)).concat(['index.html','manifest.webmanifest','icon-180.png','icon-512.png']);
  for(const f of source){assert.ok(existsSync(join(out,f)),'copied '+f);if(f!=='js/build-stamp.js')assert.ok(readFileSync(join(out,f)).equals(readFileSync(f)),'byte-identical '+f);}
  assert.equal(built.length,source.length+1);pass(`site has ${source.length} runtime files + .nojekyll, all byte-identical except the stamp`);
  const stamped=await import(pathToFileURL(join(out,'js/build-stamp.js')).href);
  assert.deepEqual({...stamped.STAMP},{repo:REPO,sha:SHA});assert.ok(Object.isFrozen(stamped.STAMP));pass('built stamp holds repo and full SHA');
  const local=await import(pathToFileURL(join(out,'js/version.js')).href);
  assert.equal(local.BUILD.exact,false);assert.equal(local.BUILD.name,UNVERIFIED_NAME);pass('stamped site served from file:// stays dev-unverified');
}finally{rmSync(out,{recursive:true,force:true});}
const wf=readFileSync('.github/workflows/pages.yml','utf8');
assert.match(wf,/node tools\/build-pages-site\.mjs "\$GITHUB_SHA" _site/);assert.match(wf,/branches: \[master\]/);assert.match(wf,/path: _site/);assert.doesNotMatch(wf,/pull_request/);
pass('workflow deploys master only, stamping $GITHUB_SHA');
const gate=wf.slice(wf.indexOf('\n  gate:'),wf.indexOf('\n  deploy:')),deploy=wf.slice(wf.indexOf('\n  deploy:'));
assert.ok(gate.length>20&&deploy.length>20,'gate and deploy jobs present');assert.match(deploy,/\n    needs: gate\n/);
assert.match(gate,/fetch-depth: 0/);assert.match(gate,/run_current_regressions\.py --profile current/);assert.match(gate,/set -o pipefail/);
assert.doesNotMatch(gate,/continue-on-error|pages: write|deploy-pages/);assert.match(deploy,/deploy-pages/);
assert.ok(wf.indexOf('run_current_regressions')<wf.indexOf('build-pages-site'),'gate runs before the site is built');
pass('deploy needs the current gate on full history; gate cannot be skipped or deploy');
groups++;
console.log(`${groups} pages stamp groups passed`);
