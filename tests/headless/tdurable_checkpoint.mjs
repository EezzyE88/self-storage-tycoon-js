import assert from 'node:assert/strict';
import { createDurableSave, indexedCheckpointStore, checkpointOrder, recoverCheckpoints } from '../../js/durablesave.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { UI } from '../../js/ui.js';
import { Sim, fmtTime } from '../../js/sim.js';
import { makeMaple } from '../../js/maple.js';
import { makeSandbox, makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { MARKETS, ROLES, MIN_PER_DAY, TIERS } from '../../js/data.js';
import { FINANCIAL_MINUTE } from '../../js/finance.js';
import { portfolioCareer } from '../../js/career.js';
const memory = new Map();
globalThis.window = { localStorage: { getItem: k => memory.get(k) || null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k) } };
const { localsave } = await import('../../js/localsave.js');
const { savearchive } = await import('../../js/savearchive.js');
const clone = x => structuredClone(x);
const zero = () => ({ epoch: 0, revision: 0, atMs: 0, cleared: false });
function store() {
  let data = { control: zero(), main: null, backup: null };
  const S = {
    held: [], writes: [], hold: false, fail: null,
    async read() { return clone(data); },
    external(control) { data.control = control; },
    get data() { return clone(data); },
    commit(op, active) {
      let reject; const promise = new Promise((resolve, no) => {
        reject = no;
        const finish = () => {
          if (S.fail) return no(Object.assign(Error(S.fail), { code: S.fail }));
          if (data.control.epoch !== op.expected.epoch || data.control.revision !== op.expected.revision)
            return no(Object.assign(Error('conflict'), { code: 'conflict' }));
          S.writes.push(clone(op));
          data = op.kind === 'replace' ? { control: clone(op.control), main: null, backup: null }
            : { control: clone(op.control), main: clone(op.record), backup: op.previous ? clone(op.previous) : data.backup };
          active?.(null); resolve(clone(data.control));
        };
        if (S.hold) S.held.push(finish); else queueMicrotask(finish);
      });
      active?.({ abort() { active?.(null); reject(Error('aborted')); } });
      return promise;
    },
  };
  return S;
}
const record = code => ({ code, meta: { name: 'Disposable', cash: 123 }, at: 1, v: 1 });
const turns = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
let n = 0;
async function test(name, body) { await body(); console.log('PASS ' + name); n++; }

await test('save is pending until commit completion, then acknowledges exact record', async () => {
  const S = store(), D = createDurableSave(S); await D.ready; S.hold = true;
  const p = D.put(record('loan')); await turns(); assert.equal(D.status, 'pending'); assert.equal(D.lastAt, 0);
  S.held.shift()(); assert.equal((await p).ok, true); assert.equal(D.status, 'saved'); assert.equal(S.data.main.code, 'loan');
});
await test('rapid snapshots serialize with monotonic same-second revisions and full backup', async () => {
  const S = store(), D = createDurableSave(S); await D.ready;
  const ps = ['loan', 'acquisition', 'transfer', 'build'].map(code => D.put(record(code)));
  assert.ok((await Promise.all(ps)).every(r => r.ok));
  assert.deepEqual(S.writes.map(w => w.control.revision), [1, 2, 3, 4]);
  assert.equal(S.data.main.code, 'build'); assert.equal(S.data.backup.code, 'transfer');
});
await test('replacement aborts an in-flight old write and fences queued old snapshots', async () => {
  const S = store(), D = createDurableSave(S); await D.ready; S.hold = true;
  const old = D.put(record('old')); await turns(); const queued = D.put(record('old queued'));
  const barrier = D.replace(); const fresh = D.put(record('new')); S.hold = false;
  assert.equal((await old).ok, false); assert.equal((await queued).stale, true);
  assert.equal((await barrier).ok, true); assert.equal((await fresh).ok, true);
  assert.equal(S.data.main.code, 'new'); assert.equal(S.data.backup, null);
  assert.deepEqual(S.writes.map(w => w.kind), ['replace', 'put']);
});
await test('clear commits a tombstone and excludes old legacy, main and backup records', async () => {
  const S = store(), D = createDurableSave(S); await D.ready; await D.put(record('old'));
  const old = S.data.main; assert.equal((await D.clear()).ok, true);
  assert.equal(S.data.main, null); assert.equal(S.data.backup, null); assert.equal(D.allows(old), false);
  assert.equal(D.allows(record('legacy')), false);
  await D.put(record('new')); assert.equal(D.allows(old), false); assert.equal(D.allows(S.data.main), true);
});
await test('another tab revision cannot be overwritten and is never labelled saved', async () => {
  const S = store(), D = createDurableSave(S); await D.ready;
  S.external({ epoch: 4, revision: 22, atMs: Date.now(), cleared: true });
  assert.equal((await D.put(record('stale tab'))).ok, false); assert.equal(D.status, 'error');
  assert.equal(S.data.main, null); assert.equal(S.data.control.revision, 22);
});
await test('quota or abort failure keeps the previous record and supports a later retry', async () => {
  const S = store(), D = createDurableSave(S); await D.ready; await D.put(record('before'));
  S.fail = 'quota'; assert.equal((await D.put(record('after'))).ok, false);
  assert.equal(D.status, 'error'); assert.equal(S.data.main.code, 'before');
  S.fail = null; assert.equal((await D.put(record('after'))).ok, true);
  assert.equal(S.data.main.code, 'after'); assert.equal(S.data.backup.code, 'before');
});
await test('missing IndexedDB resolves unavailable without pretending to commit', async () => {
  const D = createDurableSave(indexedCheckpointStore(null)); await D.ready;
  assert.equal(D.ok, false); assert.equal((await D.put(record('local fallback'))).ok, false);
  assert.equal(D.status, 'error'); assert.equal(D.lastAt, 0);
});
await test('strict unsupported status is explicit and never acknowledges a save', async () => {
  const S = store(), D = createDurableSave(S); await D.ready; S.fail = 'unsupported';
  assert.equal((await D.put(record('x'))).ok, false); assert.equal(D.ok, false); assert.equal(D.status, 'error');
});
await test('storage revisions order same-second records ahead of stale browser copies', async () => {
  const S = store(), D = createDurableSave(S); await D.ready;
  await D.put(record('first')); const first = S.data.main; await D.put(record('last'));
  assert.equal(checkpointOrder(S.data.main, first) > 0, true);
  const local = { ...first, checkpoint: { ...first.checkpoint, revision: 100, epoch: 3 } };
  D.observe([local]); assert.equal((await D.put(record('restored local'))).ok, true);
  assert.equal(S.data.main.checkpoint.epoch, 3); assert.equal(S.data.main.checkpoint.revision, 101);
});
await test('validated backup is retained instead of rotating a corrupt newest payload', async () => {
  const S = store(), D = createDurableSave(S); await D.ready;
  await D.put(record('valid')); const valid = S.data.main;
  D.accept(valid); await D.put(record('new valid'));
  assert.equal(S.data.backup.code, 'valid');
  const reloaded = createDurableSave(S); await reloaded.ready; reloaded.accept(valid);
  await reloaded.put(record('recovered')); assert.equal(S.data.backup.code, 'valid');
});
await test('startup validates before offering Continue and falls back from corrupt newest code', async () => {
  const cp = revision => ({ epoch: 1, revision, atMs: 1000 });
  const result = await recoverCheckpoints([
    { ...record('bad'), checkpoint: cp(3) }, { ...record('valid backup'), checkpoint: cp(2) },
    { ...record('valid older'), checkpoint: cp(1) }, { ...record('valid backup'), checkpoint: cp(2) },
  ], async code => ({ ok: code.startsWith('valid') }));
  assert.equal(result.main.code, 'valid backup'); assert.equal(result.backup.code, 'valid older'); assert.equal(result.damaged, true);
  const legacy = await recoverCheckpoints([record('legacy')], async () => ({ ok: true })); assert.equal(legacy.main.code, 'legacy');
});

const main = readFileSync('js/main.js','utf8');
async function gameFixture() {
  memory.clear(); localsave.onClear = null;
  memory.set('sst.kept.previous','manual sentinel'); memory.set('sst.kept.archive','archive sentinel');
  const S = store(), D = createDurableSave(S); await D.ready;
  const cloud = { ok: false, put: async () => false, beacon() {} };
  const context = vm.createContext({ Audio:class{}, Sim, fmtTime, makeMaple, makeSandbox, makeScenario, SCENARIOS,
    modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, TIERS, FINANCIAL_MINUTE, portfolioCareer,
    localsave, savearchive, cloud, performance, console, BUILD:{name:'test'}, CompressionStream, DecompressionStream,
    Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) +
    main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes')) +
    main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice')) +
    main.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0] + ';globalThis.game=game;',context);
  const g = context.game, sim = makeSandbox({start:'starter',cash:250000}); sim.s.speed=0; sim.s.convos=[];
  g.sim=sim; g.company={props:[{name:'Yard',sim}],active:0,feed:[]}; g.rend={view:'ext',setPreview(){}}; g.durable=D;
  const ui=Object.create(UI.prototype);ui.g=g;ui.title=false;g.ui=ui;
  for(const name of ['sfx','toast','renderActionBar','renderTut','setMeta'])ui[name]=()=>{};
  g.attach=function(s){this.sim=s;};
  localsave.onClear=()=>g.beginSaveSession();
  return {g,ui,sim,S,D};
}
await test('actual paused loan keeps synchronous legacy fallback and acknowledges full strict snapshot later', async () => {
  const {g,ui,sim,S,D}=await gameFixture(),t=sim.s.t; S.hold=true;
  assert.ok(ui.do({type:'borrow',amt:50000}).ok);
  assert.equal(sim.s.cash,300000); assert.equal(sim.s.t,t); assert.equal(sim.s.speed,0);
  assert.equal(JSON.parse(await g.decodeSave(localsave.get().main.code)).cash,300000);
  await turns(); assert.equal(D.status,'pending'); S.held.shift()(); await D.idle();
  assert.equal(D.status,'saved'); const prep=await g.prepareLoad(S.data.main.code); assert.ok(prep.ok);
  assert.equal(prep.company.props[0].sim.s.cash,300000);
  assert.equal(memory.get('sst.kept.previous'),'manual sentinel'); assert.equal(memory.get('sst.kept.archive'),'archive sentinel');
});
await test('actual New game fences pending compression from the outgoing company', async () => {
  const {g,S,D}=await gameFixture(); let release;
  g.saveCode=json=>new Promise(resolve=>{release=()=>resolve(g.rawSaveCode(json));});
  const pending=g.autosave(); g.newGame('empty'); g.ui.title=false; await g.autosave(true);
  const fresh=S.data.main.code; release(); assert.equal(await pending,false); await D.idle();
  assert.equal(S.data.main.code,fresh); assert.equal(S.data.control.epoch,1); assert.equal(S.data.backup,null);
});
await test('actual imported Load replaces durable generation without changing manual save encoding', async () => {
  const {g,S,D}=await gameFixture(); await g.autosave(true); const outgoing=S.data.main.code;
  g.sim.s.cash=777; const incoming=g.rawSaveCode(g.saveJSON()); g.sim.s.cash=250000;
  const prep=await g.prepareLoad(incoming); assert.ok(prep.ok); g.applyLoad(prep); await g.autosave(true); await D.idle();
  assert.equal(S.data.control.epoch,1); assert.equal(S.data.backup,null); assert.notEqual(S.data.main.code,outgoing);
  assert.equal(JSON.parse(await g.decodeSave(S.data.main.code)).cash,777); assert.ok(S.data.main.code.startsWith('SST0.'));
  assert.equal(memory.get('sst.kept.previous'),'manual sentinel');
});
await test('actual legacy clear dispatches the durable tombstone and invalidates old compression', async () => {
  const {g,S,D}=await gameFixture(); await g.autosave(true); let release;
  g.saveCode=json=>new Promise(resolve=>{release=()=>resolve(g.rawSaveCode(json));}); const pending=g.autosave();
  await localsave.clear(); release(); assert.equal(await pending,false); await D.idle();
  assert.equal(S.data.main,null); assert.equal(S.data.control.cleared,true); assert.equal(localsave.get().main,null);
});
await test('current menu copy distinguishes pending, saved and unconfirmed fallback without changing Pause', async () => {
  const {g,ui,sim,D}=await gameFixture();
  for (const [status,match] of [['pending',/Saving progress/],['saved',/Progress saved/],['error',/could not confirm/],['unavailable',/could not confirm/]]) {
    D.status=status;assert.match(ui.autosaveNote(),match);assert.equal(sim.s.speed,0);
  }
});
console.log(`ALL PASS: ${n} durable checkpoint groups (queue/failure model; real IndexedDB separately browser-tested)`);
