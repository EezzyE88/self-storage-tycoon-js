// Build identity: js/version.js derives BUILD from its own served module URL. Only commit-pinned URLs
// for EezzyE88/self-storage-tycoon-js on supported hosts are exact; everything else is dev-unverified.
// Also checks that saveMeta() keeps the same structure and only the build value changes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseSourceIdentity, BUILD, UNVERIFIED_NAME} from '../../js/version.js';

let groups=0;
const pass=m=>console.log('PASS '+m);
const SHA='bfcc68951c0f64a8fdfb08d917a26c373ed0cf44', MOD='/js/version.js';
const exact=(url,sha=SHA)=>{const b=parseSourceIdentity(url);
  assert.equal(b.exact,true,url);assert.equal(b.sha,sha.toLowerCase(),url);assert.equal(b.name,sha.toLowerCase().slice(0,7),url);
  assert.match(b.name,/^[0-9a-f]{7}$/);assert.equal(b.date,'exact source');pass('exact '+url);};
const notExact=(url,reason)=>{const b=parseSourceIdentity(url);
  assert.equal(b.exact,false,String(url));assert.equal(b.sha,null);assert.equal(b.name,UNVERIFIED_NAME);
  assert.equal(b.date,'unverified source');assert.doesNotMatch(b.name,/^[0-9a-f]{7}$/);
  if(reason)assert.equal(b.reason,reason,String(url));pass(`not exact (${b.reason}) ${String(url)}`);};

// 1. Supported commit-pinned URLs are exact; short SHA is the first 7 of the full SHA.
for(const host of ['rawcdn.githack.com','raw.githack.com'])exact(`https://${host}/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`);
exact(`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA.toUpperCase()}${MOD}`);
exact(`https://rawcdn.githack.com/eezzye88/Self-Storage-Tycoon-JS/${SHA}${MOD}`);
exact(`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}?v=1#x`);
exact(`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/0123456789abcdef0123456789abcdef01234567${MOD}`,'0123456789abcdef0123456789abcdef01234567');
groups++;

// 2. Mutable branches and malformed refs.
for(const ref of ['master','main','claude/project-thread-m2qbfo','HEAD','bfcc689',SHA.slice(0,39),SHA+'0','g'+SHA.slice(1),'v62-career-camera-clearance-20261023',''])
  notExact(`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${ref}${MOD}`);
notExact(`https://raw.githack.com/EezzyE88/self-storage-tycoon-js/master${MOD}`,'mutable-or-malformed-ref');
notExact(`https://raw.githack.com/EezzyE88/self-storage-tycoon-js/bfcc689${MOD}`,'mutable-or-malformed-ref');
groups++;

// 3. Localhost, file, other protocols and unknown hosts.
for(const url of [`http://localhost:8000${MOD}`,`https://localhost${MOD}`,`http://127.0.0.1:5173${MOD}`,'file:///home/user/self-storage-tycoon-js/js/version.js',
  `http://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`,
  `https://rawcdn.githack.com:8443/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`,
  `https://user@rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`,
  `https://self-storage-tycoon-js.vercel.app${MOD}`,`https://cdn.jsdelivr.net/gh/EezzyE88/self-storage-tycoon-js@${SHA}${MOD}`,
  `https://raw.githubusercontent.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`,`https://evil.example/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`,
  `https://rawcdn.githack.com.evil.example/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`,`https://githack.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`])notExact(url);
groups++;

// 4. Wrong repositories, wrong paths and malformed input.
for(const url of [`https://rawcdn.githack.com/someoneelse/self-storage-tycoon-js/${SHA}${MOD}`,`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon/${SHA}${MOD}`,
  `https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js-fork/${SHA}${MOD}`])notExact(url,'wrong-repository');
for(const url of [`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}/js/main.js`,`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}/version.js`,
  `https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}/x/js/version.js`,`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}/`,
  `https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}`,`https://rawcdn.githack.com/x/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`])notExact(url);
for(const url of ['','not a url','https://','//rawcdn.githack.com/x',null,undefined,42,`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/%E0%A4%A${MOD}`])notExact(url);
groups++;

// 5. Module export under node (file://) is non-exact, frozen; saveMeta keeps its structure, build changes only in value.
assert.equal(BUILD.exact,false);assert.equal(BUILD.name,UNVERIFIED_NAME);assert.ok(Object.isFrozen(BUILD));pass('node file:// import is dev-unverified and frozen');
const src=readFileSync('js/version.js','utf8');assert.doesNotMatch(src,/v62-career-camera-clearance|name:\s*'[^']*-20\d{6}'/);pass('no hardcoded candidate label');
const main=readFileSync('js/main.js','utf8');
assert.match(main,/import \{ BUILD \} from '\.\/version\.js';/);assert.match(main,/build: BUILD\.name \};/);assert.match(main,/game\.BUILD = BUILD;/);pass('main.js consumers unchanged');
const ui=readFileSync('js/ui.js','utf8');
assert.ok(ui.includes("Build ${esc(this.g.BUILD ? this.g.BUILD.name : 'dev')}</div>"));assert.ok(ui.includes("Build ${esc(this.g.BUILD ? this.g.BUILD.name : 'dev')} · ${esc(this.g.BUILD ? this.g.BUILD.date : '')}."));pass('ui.js title and menu consumers unchanged');
const {Sim,fmtTime}=await import('../../js/sim.js');const {makeMaple}=await import('../../js/maple.js');
const {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H}=await import('../../js/data.js');const {modeLabel,sandboxName}=await import('../../js/scenarios.js');
function metaWith(build){const ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:build,localsave:{ok:false},savearchive:{},cloud:{ok:false},performance,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+';globalThis.game=game;',ctx);
  const g=ctx.game,sim=makeMaple(5);g.sim=sim;g.company={props:[{name:'Maple Street Storage',sim}],active:0,feed:[]};return JSON.parse(JSON.stringify(g.saveMeta()));}
const before=metaWith({name:'v62-career-camera-clearance-20261023',date:'2026-10-23'});
for(const b of [parseSourceIdentity(`https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/${SHA}${MOD}`),BUILD]){const after=metaWith(b);
  assert.deepEqual(Object.keys(after),Object.keys(before));assert.equal(typeof after.build,'string');assert.equal(after.build,b.name);
  assert.deepEqual({...after,build:before.build},before);assert.ok(!('sha' in after)&&!('exact' in after));pass(`saveMeta identical except build: ${before.build} -> ${after.build}`);}
groups++;
console.log(`${groups} build identity groups passed`);
