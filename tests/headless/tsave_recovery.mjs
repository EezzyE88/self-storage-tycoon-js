// Preservation-first save recovery (Candidate 22 follow-up). Real localsave.js / savearchive.js / main.js / ui.js over
// a localStorage double that can fail the Nth write once (transient) or every write from the Nth on (persistent),
// and can fail reads. For archive restore, keep-current (import / New game) and Restore previous game, with an empty,
// partial and full archive, every write position is failed. Invariants after each run, after a simulated reload and
// after a clean retry: every original game is still stored somewhere (or is still the running game), "Nothing was
// changed" appears only when storage is byte-identical, extra copies are reported exactly, and nothing is trimmed
// unless that drop was disclosed beforehand.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const mem=new Map();let writes=0,failAt=0,persistent=false,readFail=null;
const probe=k=>/probe/.test(k);
const hit=()=>{writes++;if(failAt&&(persistent?writes>=failAt:writes===failAt))throw new DOMException('QuotaExceededError','QuotaExceededError');};
globalThis.window={localStorage:{
  getItem:k=>{if(readFail&&readFail(k))throw new DOMException('SecurityError','SecurityError');return mem.has(k)?mem.get(k):null;},
  setItem:(k,v)=>{if(!probe(k))hit();mem.set(k,String(v));},
  removeItem:k=>{if(!probe(k))hit();mem.delete(k);}}};
const {localsave}=await import('../../js/localsave.js');
const {savearchive,ARCHIVE_MAX}=await import('../../js/savearchive.js');
const {UI,storeFailText}=await import('../../js/ui.js');
const {makeMaple}=await import('../../js/maple.js');
const {Sim,fmtTime}=await import('../../js/sim.js');
const {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H}=await import('../../js/data.js');
const {modeLabel,sandboxName}=await import('../../js/scenarios.js');
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
const main=readFileSync('js/main.js','utf8');
function harness(){const ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave,savearchive,cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,setTimeout,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
  const g=ctx.game;g.localsave=localsave;g.ui={title:false};g.rend={view:'ext'};g.autosave=async()=>localsave.put(await g.saveCode(),g.saveMeta());g.attach=function(s){this.sim=s;};return g;}
function uiFor(g){const ui=Object.create(UI.prototype);ui.g=g;ui.toasts=[];ui.toast=t=>ui.toasts.push(t);ui.closeModal=()=>{};ui.sfx=()=>{};ui.contSave=null;return ui;}
const G=harness();
async function codeFor(name,cash){const sim=makeMaple(7);sim.s.cash=cash;const keep=[G.sim,G.company];G.sim=sim;G.company={props:[{name,sim}],active:0,feed:[]};const code=await G.saveCode();[G.sim,G.company]=keep;return {code,meta:{name,day:1,cash},at:1};}
function session(g){const sim=makeMaple(9);sim.s.cash=2222;g.sim=sim;g.company={props:[{name:'Running Lot',sim}],active:0,feed:[]};return sim;}
const ARCH=[];for(let i=1;i<=6;i++)ARCH.push(await codeFor('Archive '+i,100+i));const PREV=await codeFor('Previous',555);
// Seed storage: `size` archived games (newest first), the kept previous game, and an autosave of the running game.
function seed(size){mem.clear();failAt=0;persistent=false;readFail=null;
  mem.set('sst.kept.archive',JSON.stringify(ARCH.slice(0,size).reverse().map(r=>({...r,archivedAt:1}))));mem.set('sst.kept.previous',JSON.stringify({...PREV,keptAt:1,v:1}));
  const g=harness();session(g);mem.set('sst.autosave.main',JSON.stringify({code:'RUNNING-AUTOSAVE',meta:{name:'Running Lot',cash:2222},at:1,v:1}));return g;}
const settleTasks=()=>new Promise(r=>setTimeout(r,30)); // let un-awaited autosaves land before storage is compared
const same=(a,b,msg)=>assert.ok(a===b,msg); // compare raw bytes without dumping save codes
const snap=()=>JSON.stringify([...mem].filter(([k])=>!probe(k)).sort());
// Every game anywhere in storage (archive, kept slot, autosave main and backup), read raw. Games are identified by
// their unique cash (archive 101-106, previous 555, running 2222): a loaded company may be renamed, its cash is not.
function storedIds(){const ids=[];const j=k=>{try{return JSON.parse(mem.get(k)||'null');}catch(e){return null;}};
  for(const r of j('sst.kept.archive')||[])ids.push(+r.meta.cash);for(const k of ['sst.kept.previous','sst.autosave.main','sst.autosave.backup']){const r=j(k);if(r&&r.meta)ids.push(+r.meta.cash);}return ids;}
const cashOf=name=>[...ARCH,PREV].find(r=>r.meta.name===name).meta.cash;
// Every original game must remain recoverable: stored somewhere, or still the game in memory.
function recoverable(g,size,running,label,disclosed=[]){const have=new Set(storedIds());const want=[...ARCH.slice(0,size).map(r=>r.meta.name),'Previous'].filter(w=>!disclosed.includes(w));
  for(const w of want)assert.ok(have.has(cashOf(w))||(g.sim&&Math.round(g.sim.s.cash)===cashOf(w)),`${label}: ${w} still stored`);
  assert.ok(have.has(2222)||g.sim===running,`${label}: running game stored or still running`);}
const archNames=()=>savearchive.list().map(r=>r.meta.name);
// A failure toast's storage claims must match what storage now holds.
function claimsMatch(toast,before,label){
  if(/Nothing was changed\./.test(toast))same(snap(),before,`${label}: "Nothing was changed" only when byte-identical`);
  if(/Nothing was written\./.test(toast))same(snap(),before,`${label}: "Nothing was written" only when nothing was written`);
  const m=toast.match(/extra copy of ([^.]+)\./);if(m){const names=archNames(),kept=localsave.getKept();for(const nm of m[1].split(', '))assert.ok(names.filter(x=>x===nm).length>1||(kept&&kept.meta.name===nm&&names.includes(nm)),`${label}: reported extra copy of ${nm} exists`);}
  else if(!/Nothing was changed|could not be checked|no longer holds/.test(toast)){const names=archNames(),kept=localsave.getKept();assert.ok(!names.some((x,i)=>names.indexOf(x)!==i)&&!(kept&&names.includes(kept.meta.name)),`${label}: an unreported duplicate`);}
  assert.doesNotMatch(toast,/no longer holds/,`${label}: nothing lost`);}
// Writes a successful run makes, so every position (plus one past the end) is failed.
async function writesFor(size,op){const g=seed(size);writes=0;await op(g,uiFor(g));await settleTasks();return writes;}
const INCOMING=ARCH[5]; // not in storage: the save being imported
const OPS={
  // The real import confirmation (validated save → keepCurrent → load), as reached from Load game.
  'import / keep current':async(g,ui)=>{const running=g.sim;ui.showLoad=()=>{};ui.pendingImport=await g.prepareLoad(INCOMING.code);await ui.confirmImport();return g.sim!==running;},
  'Restore previous game':async(g,ui)=>ui.restoreKept(),
  'archive restore (index 1)':async(g,ui)=>ui.restoreArchived(1),
};
const __fail=r=>storeFailText(r,'nothing was loaded');
for(const [opName,op] of Object.entries(OPS))for(const size of [0,3,ARCHIVE_MAX]){if(size<2&&opName.startsWith('archive'))continue;
  await test(`${opName}, ${size} archived: every write position, transient and persistent, reload and retry`,async()=>{
    const total=await writesFor(size,op);assert.ok(total>=1);
    for(const mode of ['transient','persistent'])for(let pos=1;pos<=total+1;pos++){const label=`${opName} size ${size} ${mode} @${pos}/${total}`;
      const g=seed(size),running=g.sim,ui=uiFor(g),before=snap(),dropsBefore=savearchive.wouldDrop(localsave.getKept()).map(r=>r.meta.name);
      writes=0;failAt=pos;persistent=mode==='persistent';const ok=await op(g,ui);await settleTasks();failAt=0;
      recoverable(g,size,running,label,ok?dropsBefore:[]);
      if(!ok){assert.equal(g.sim,running,`${label}: failure loads nothing`);assert.ok(ui.toasts.length,`${label}: failure is reported`);claimsMatch(ui.toasts.at(-1),before,label);}
      else if(pos<=total)assert.ok(ui.toasts.length===0||/^(Restored|Save loaded)/.test(ui.toasts.at(-1)),label);
      // No silent trim: entries only disappear when restored (and saved) or disclosed by wouldDrop beforehand.
      const restored=opName.startsWith('archive')?ARCH[size-2]?.meta.name:null;
      for(const nm of ARCH.slice(0,size).map(r=>r.meta.name))if(!archNames().includes(nm))assert.ok(nm===restored&&ok||dropsBefore.includes(nm)&&ok,`${label}: ${nm} left the archive without disclosure`);
      // Reload: a fresh game object reads the same slots; extra copies are still there, nothing re-trimmed.
      const afterRun=snap(),g2=harness();session(g2);same(snap(),afterRun,`${label}: reload changes nothing`);recoverable(g2,size,running,label+' after reload',ok?dropsBefore:[]);
      // Clean retry from the reloaded state succeeds and still loses nothing.
      if(!ok){const ui2=uiFor(g2);const ok2=await op(g2,ui2);await settleTasks();assert.ok(ok2,`${label}: retry succeeds`);recoverable(g2,size,null,label+' after retry',dropsBefore);if(opName.startsWith('import'))assert.ok(storedIds().includes(2222),label+': retry kept the outgoing game');
        const names=archNames(),kept=localsave.getKept();assert.ok(!(kept&&names.includes(kept.meta.name)),`${label}: retry tidies the duplicate of the previous game`);}
    }
  });
}

await test('a full archive keeps every game through a persistent failure at each step, and the next keep discloses every drop',async()=>{
  for(let pos=1;pos<=3;pos++){const g=seed(ARCHIVE_MAX);writes=0;failAt=pos;persistent=true;await g.keepCurrent(null);failAt=0;recoverable(g,ARCHIVE_MAX,g.sim,'full @'+pos);}
  // A transient failure at the kept slot after the archive copy: the archive bytes are put back and verified.
  let g=seed(ARCHIVE_MAX);const before=snap();writes=0;failAt=2;persistent=false;let r=await g.keepCurrent(null);assert.equal(r.ok,false);assert.equal(r.unchanged,true);same(snap(),before,'storage byte-identical');
  // Persistent from the kept slot: the extra copy cannot be removed, so it is reported, kept across reload, and not trimmed.
  g=seed(ARCHIVE_MAX);writes=0;failAt=2;persistent=true;r=await g.keepCurrent(null);failAt=0;assert.equal(r.ok,false);assert.equal(r.verified,true);assert.equal(r.unchanged,false);assert.deepEqual(r.extras.map(m=>m.name),['Previous']);assert.deepEqual(r.lost,[]);
  assert.equal(savearchive.list().length,ARCHIVE_MAX+1,'six entries: the extra copy is not trimmed');assert.match(__fail(r),/No saved game was lost\. Older saved games now also holds an extra copy of Previous\./);
  assert.equal(harness()&&savearchive.list().length,ARCHIVE_MAX+1,'still there after reload');
  // An unrelated full keep later: Previous is already archived, so nothing new is added and nothing is trimmed.
  r=await g.keepCurrent(null);assert.equal(r.ok,true);assert.equal(savearchive.list().length,ARCHIVE_MAX+1);assert.equal(localsave.getKept().meta.name,'Running Lot');
  // The next keep that adds an entry discloses both drops beforehand and removes exactly those.
  const disclosed=savearchive.wouldDrop(localsave.getKept()).map(r=>r.meta.name);assert.deepEqual(disclosed,['Archive 2','Archive 1']);
  const ui=uiFor(g);ui.$=()=>({innerHTML:''});const box={innerHTML:''};ui.$=()=>box;ui.g.playing=()=>true;ui.g.outgoingMeta=()=>({name:'Other',day:1,cash:1});ui.showImportConfirm({meta:{name:'Incoming',day:1,cash:1}});
  assert.match(box.innerHTML,/the 2 oldest archived games \(<b>Archive 2<\/b>.*<b>Archive 1<\/b>.*\) will be removed/);
  session(g);g.sim.s.cash=3333;r=await g.keepCurrent(null);assert.equal(r.ok,true);
  assert.deepEqual(savearchive.list().map(r=>r.meta.name),['Running Lot','Previous','Archive 5','Archive 4','Archive 3']);});

await test('read failures are explicit: nothing is written and the message says the games could not be read',async()=>{
  for(const key of ['sst.kept.archive','sst.kept.previous']){const g=seed(3),ui=uiFor(g),running=g.sim,before=snap();readFail=k=>k===key;writes=0;
    const r=await g.keepCurrent(null);assert.equal(r.ok,false);assert.equal(r.reason,'read');assert.equal(writes,0);readFail=null;same(snap(),before,'storage byte-identical');assert.match(__fail(r),/could not be read, so nothing was loaded\. Nothing was written\./);
    readFail=k=>k===key;assert.equal(await ui.restoreArchived(0),false,'archive restore');readFail=null;assert.equal(g.sim,running);same(snap(),before,'storage byte-identical');}
  // Reads that fail only after a failed write: no claim of "Nothing was changed".
  const g=seed(3);let wrote=false;failAt=1;persistent=true;const orig=window.localStorage.setItem;window.localStorage.setItem=(k,v)=>{wrote=true;return orig(k,v);};readFail=k=>wrote&&k==='sst.kept.archive';
  const r=await g.keepCurrent(null);window.localStorage.setItem=orig;readFail=null;failAt=0;assert.equal(r.ok,false);assert.equal(r.verified,false);assert.match(__fail(r),/could not be checked afterwards/);assert.doesNotMatch(__fail(r),/Nothing was changed/);recoverable(g,3,g.sim,'unverifiable');});

await test('an unreadable archive or kept slot is copied aside before anything overwrites it',async()=>{
  let g=seed(3);mem.set('sst.kept.archive','{not json');let r=await g.keepCurrent(null);assert.equal(r.ok,true);assert.equal(mem.get('sst.kept.archive.unreadable'),'{not json');assert.deepEqual(savearchive.list().map(r=>r.meta.name),['Previous']);
  g=seed(3);mem.set('sst.kept.previous','garbage');r=await g.keepCurrent(null);assert.equal(r.ok,true);assert.equal(mem.get('sst.kept.previous.unreadable'),'garbage');assert.equal(localsave.getKept().meta.name,'Running Lot');
  g=seed(3);mem.set('sst.kept.archive','{not json');const before=snap();writes=0;failAt=1;persistent=true;r=await g.keepCurrent(null);failAt=0;assert.equal(r.ok,false);same(snap(),before,'quarantine failed: nothing overwritten');});

await test('a restore keeps the restored game listed until it has been saved, then removes only that copy',async()=>{
  // Autosave fails (writes 3+ fail persistently after kept slot + archive copy succeed): the restored game stays listed.
  let g=seed(3),ui=uiFor(g);const target=savearchive.list()[1].meta.name;writes=0;failAt=3;persistent=true;assert.equal(await ui.restoreArchived(1),true);failAt=0;
  assert.ok(archNames().includes(target),'restored game still listed: its save did not reach storage');assert.match(ui.toasts.at(-1),new RegExp(`could not be saved yet, so ${target} also stays in Older saved games`));
  assert.ok(archNames().includes('Previous'));assert.equal(localsave.getKept().meta.name,'Running Lot');
  // Saved normally: the restored entry goes, the displaced previous game is in, nothing else changes.
  g=seed(3);ui=uiFor(g);assert.equal(await ui.restoreArchived(1),true);assert.deepEqual(archNames(),['Previous','Archive 3','Archive 1']);assert.equal(localsave.getKept().meta.name,'Running Lot');assert.equal(g.sim.s.cash,102);
  // Restore previous game: the restored previous game is archived until its autosave lands, then removed.
  g=seed(3);ui=uiFor(g);writes=0;failAt=3;persistent=true;assert.equal(await ui.restoreKept(),true);failAt=0;assert.ok(archNames().includes('Previous'),'restored previous game keeps its archive copy');assert.match(ui.toasts.at(-1),/could not be saved yet, so Previous also stays in Older saved games/);
  g=seed(3);ui=uiFor(g);assert.equal(await ui.restoreKept(),true);assert.deepEqual(archNames(),['Archive 3','Archive 2','Archive 1']);assert.equal(localsave.getKept().meta.name,'Running Lot');assert.equal(g.sim.s.cash,555);});

await test("reviewer's sequence: 5 archived, restore index 2, the third and every later write fails",async()=>{
  const g=seed(ARCHIVE_MAX),ui=uiFor(g),running=g.sim;assert.deepEqual(archNames(),['Archive 5','Archive 4','Archive 3','Archive 2','Archive 1']);
  writes=0;failAt=3;persistent=true;const ok=await ui.restoreArchived(2);await settleTasks();failAt=0;
  // Writes 1-2 (archive copy of Previous, kept slot) succeed; the restored game's autosave fails, so Archive 3 must stay.
  assert.equal(ok,true);assert.ok(archNames().includes('Archive 3'),'Archive 3 keeps its stored copy');assert.ok(archNames().includes('Previous'));assert.equal(localsave.getKept().meta.name,'Running Lot');
  assert.match(ui.toasts.at(-1),/could not be saved yet, so Archive 3 also stays in Older saved games/);assert.doesNotMatch(ui.toasts.join(' '),/Nothing was changed/);
  recoverable(g,ARCHIVE_MAX,running,'reviewer');
  // The same sequence when the kept-slot write (2nd) is the first to fail persistently: nothing restored, extra copy reported.
  const h=seed(ARCHIVE_MAX),u=uiFor(h);writes=0;failAt=2;persistent=true;assert.equal(await u.restoreArchived(2),false);failAt=0;
  assert.equal(h.sim.s.cash,2222);assert.match(u.toasts.at(-1),/nothing was restored\. No saved game was lost\. Older saved games now also holds an extra copy of Previous\./);recoverable(h,ARCHIVE_MAX,h.sim,'reviewer @2');});

console.log(n+' save-recovery checks passed');
