// Storage-only envelope. Game save codes and manual exports are unchanged.
const zero = () => ({ epoch: 0, revision: 0, atMs: 0, cleared: false });
const stampOK = s => s && ['epoch', 'revision', 'atMs'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0);
export const checkpointRecord = r => r && typeof r.code === 'string' && r.meta && typeof r.meta === 'object';
export function checkpointOrder(a, b) {
  const A = a?.checkpoint, B = b?.checkpoint;
  if (stampOK(A) && stampOK(B)) return A.epoch - B.epoch || A.revision - B.revision;
  return (a?.at || 0) - (b?.at || 0) || Number(stampOK(A)) - Number(stampOK(B));
}
export async function recoverCheckpoints(records, validate) {
  const seen = new Set(), valid = []; let damaged = false;
  for (const record of records.filter(checkpointRecord).sort((a, b) => checkpointOrder(b, a))) {
    if (seen.has(record.code)) continue; seen.add(record.code);
    let ok = false; try { ok = (await validate(record.code)).ok; } catch {}
    if (ok) valid.push(record); else if (!valid.length) damaged = true;
  }
  return { main: valid[0] || null, backup: valid[1] || null, damaged };
}
const failure = (message, code = 'storage') => Object.assign(new Error(message), { code });

// Strict commits are bounded. A timed-out transaction is aborted, not later reported saved.
export function indexedCheckpointStore(factory, timeoutMs = 8000) {
  if (factory === undefined) { try { factory = globalThis.indexedDB; } catch { factory = null; } }
  let dbPromise;
  const open = () => dbPromise ||= new Promise((resolve, reject) => {
    if (!factory) return reject(failure('Durable storage unavailable', 'unsupported'));
    let done = false;
    const timer = setTimeout(() => finish(failure('Opening durable storage timed out')), timeoutMs);
    const finish = (error, db) => { if (done) { db?.close(); return; } done = true; clearTimeout(timer); error ? reject(error) : resolve(db); };
    try {
      const req = factory.open('sst.autosave.durable', 1);
      req.onupgradeneeded = () => { if (done) { req.transaction.abort(); return; } if (!req.result.objectStoreNames.contains('slots')) req.result.createObjectStore('slots'); };
      req.onerror = () => finish(req.error || failure('Durable storage could not open'));
      req.onblocked = () => finish(failure('Durable storage is blocked by another tab'));
      req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); finish(null, req.result); };
    } catch (error) { finish(error); }
  });
  function transact(db, mode, run, active) {
    return new Promise((resolve, reject) => {
      let tx, error, result, done = false;
      const finish = err => { if (done) return; done = true; clearTimeout(timer); active?.(null); err ? reject(err) : resolve(result); };
      const timer = setTimeout(() => { error = failure('Durable save timed out'); try { tx?.abort(); } catch {} finish(error); }, timeoutMs);
      try {
        tx = mode === 'readwrite' ? db.transaction('slots', mode, { durability: 'strict' }) : db.transaction('slots', mode);
        active?.(tx);
        if (mode === 'readwrite' && tx.durability !== 'strict') throw failure('Strict save completion is unavailable', 'unsupported');
        tx.oncomplete = () => finish();
        tx.onabort = () => finish(error || tx.error || failure('Durable transaction aborted'));
        tx.onerror = () => { error ||= tx.error; };
        run(tx.objectStore('slots'), value => { result = value; }, err => { error = err; tx.abort(); });
      } catch (err) { try { tx?.abort(); } catch {} finish(err); }
    });
  }
  return {
    async read() {
      return transact(await open(), 'readonly', (store, result) => {
        const values = {};
        for (const key of ['control', 'main', 'backup']) { const req = store.get(key); req.onsuccess = () => { values[key] = req.result || null; }; }
        result(values);
      });
    },
    async commit(op, active) {
      return transact(await open(), 'readwrite', (store, result, abort) => {
        const req = store.get('control');
        req.onsuccess = () => {
          try {
          const current = req.result || zero();
          if (!stampOK(current) || current.epoch !== op.expected.epoch || current.revision !== op.expected.revision)
            return abort(failure('Saved progress changed in another tab. Reload before saving here.', 'conflict'));
          if (op.kind === 'replace') { store.delete('main'); store.delete('backup'); }
          else { if (op.previous) store.put(op.previous, 'backup'); store.put(op.record, 'main'); }
          store.put(op.control, 'control'); result(op.control);
          } catch (error) { abort(error); }
        };
      }, active);
    },
  };
}

export function createDurableSave(storage = indexedCheckpointStore()) {
  let tail = Promise.resolve(), token = 0, activeTx = null, good = null;
  let disk = zero(), epoch = 0, next = 0, latest = 0;
  const D = {
    ok: null, status: 'checking', lastErr: '', lastAt: 0, snapshot: null, onChange: null,
    emit() { this.onChange?.(); },
    observe(records) { for (const r of records.filter(Boolean)) if (stampOK(r.checkpoint)) { epoch = Math.max(epoch, r.checkpoint.epoch); next = Math.max(next, r.checkpoint.revision); } },
    accept(record) { good = checkpointRecord(record) ? record : null; },
    ticket() { return { epoch, revision: ++next, atMs: Date.now(), token }; },
    allows(record) {
      const control = this.snapshot?.control; if (!control) return true;
      if (stampOK(record?.checkpoint)) return record.checkpoint.epoch >= control.epoch && (!control.cleared || checkpointOrder(record, { checkpoint: control }) > 0);
      return !control.cleared && (!control.epoch || (record?.at || 0) * 1000 > control.atMs);
    },
    enqueue(kind, ticket, record) {
      const captured = ticket.token; latest = ticket.revision; this.latest = latest;
      this.status = 'pending'; this.lastErr = ''; this.emit();
      const task = tail.then(async () => {
        await this.ready;
        if (captured !== token) return { ok: false, stale: true };
        if (!this.ok) return { ok: false, reason: this.lastErr || 'Durable storage unavailable' };
        try {
          const control = { epoch: ticket.epoch, revision: ticket.revision, atMs: ticket.atMs, cleared: kind === 'replace' };
          const previous = good?.checkpoint?.epoch === ticket.epoch ? good : null;
          const committed = await storage.commit({ kind, expected: { ...disk }, control, record, previous }, tx => { activeTx = tx; });
          disk = committed; this.snapshot = kind === 'replace' ? { control, main: null, backup: null } : { control, main: record, backup: previous || this.snapshot?.backup || null };
          if (captured === token) good = kind === 'replace' ? null : record;
          return { ok: true, stale: captured !== token };
        } catch (error) {
          if (captured === token) { this.lastErr = error.message || 'Durable save failed'; if (error.code === 'unsupported') this.ok = false; }
          return { ok: false, stale: captured !== token, reason: error.message };
        }
      }).then(result => {
        if (captured === token && latest === ticket.revision) {
          this.status = result.ok ? (kind === 'replace' ? 'idle' : 'saved') : 'error';
          if (result.ok) this.lastAt = Date.now();
          this.emit();
        }
        return result;
      });
      tail = task.catch(() => {}); return task;
    },
    put(record, ticket = this.ticket()) {
      if (!checkpointRecord(record)) return Promise.resolve({ ok: false, reason: 'Invalid checkpoint' });
      return this.enqueue('put', ticket, { ...record, checkpoint: { epoch: ticket.epoch, revision: ticket.revision, atMs: ticket.atMs } });
    },
    replace() {
      token++; epoch++; good = null;
      try { activeTx?.abort(); } catch {}
      return this.enqueue('replace', this.ticket(), null);
    },
    clear() { return this.replace(); },
    idle() { return tail; },
  };
  D.ready = storage.read().then(snapshot => {
    const control = snapshot.control || zero();
    if (!stampOK(control)) throw failure('Durable save ordering record is damaged');
    disk = control; epoch = control.epoch; next = control.revision;
    D.snapshot = { control, main: snapshot.main, backup: snapshot.backup }; D.ok = true; D.status = 'idle'; D.emit(); return D.snapshot;
  }).catch(error => { D.ok = false; D.status = 'unavailable'; D.lastErr = error.message || 'Durable storage unavailable'; D.emit(); return null; });
  return D;
}
export const durablesave = createDurableSave();
