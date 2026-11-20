// Browser autosave (concept §13: save/resume is foundational). One main slot plus the previous save as a backup.
// Used wherever browser storage exists (GitHub Pages, any normal host). In the sandboxed preview, storage is blocked
// and the save server in cloud.js is used instead.
import { SAVE_KEYS } from './savegeneration.js';
import { checkpointOrder } from './durablesave.js';
const MAIN = SAVE_KEYS.main, BAK = SAVE_KEYS.backup, KEPT = SAVE_KEYS.kept; // KEPT is never written by autosave
let store = null;
try { const ls = window.localStorage; const k = SAVE_KEYS.probe; ls.setItem(k, '1'); ls.removeItem(k); store = ls; } catch (e) { store = null; }
const read = (k) => { try { const raw = store && store.getItem(k); if (!raw) return null; const d = JSON.parse(raw); return d && typeof d.code === 'string' && d.meta ? d : null; } catch (e) { return null; } };
// Hold the origin's checkpoint writer lock for this document. Page-exit
// saves can then write synchronously without an asynchronous lock request.
export function claimCheckpointWriter() {
  const unavailable = 'This browser could not coordinate autosaving across tabs.';
  return new Promise(resolve => {
    const locks = navigator.locks;
    if (!locks) { resolve(null); return; }
    locks.request(SAVE_KEYS.durable, { ifAvailable: true }, lock => {
      if (!lock) { resolve('Another tab owns autosaving. Close it and reload before saving here.'); return; }
      resolve('');
      return new Promise(() => {});
    }).catch(() => resolve(unavailable));
  });
}
const EXIT_PREFIX = SAVE_KEYS.main + '.exit.';
export function createExitJournal() {
  const writer = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
  let pending;
  return {
    writer,
    stage(record, ticket, base) {
      if (!base || !store) return;
      const key = EXIT_PREFIX + writer + '.' + ticket.revision;
      try {
        store.setItem(key, JSON.stringify({ ...record, checkpoint: ticket, base, writer }));
        if (pending) store.removeItem(pending);
        pending = key;
      } catch {}
    },
    retire() {
      try { if (pending) store.removeItem(pending); pending = null; } catch {}
    },
  };
}

export function exitJournalRecords(control) {
  const records = [];
  try {
    for (const key of Object.keys(store || {})) {
      if (!key.startsWith(EXIT_PREFIX)) continue;
      const record = read(key);
      const order = record && control ? checkpointOrder(record, { checkpoint: control }) : null;
      if (order < 0 || (order === 0 && control.strict !== false)) store.removeItem(key);
      else if (record) records.push(record);
    }
  } catch {}
  return records;
}
export const localsave = {
  ok: !!store, lastAt: 0, lastErr: '',
  get() { return { main: read(MAIN), backup: read(BAK) }; },
  put(code, meta, checkpoint) {
    if (!store) return false;
    const rec = JSON.stringify({ code, meta, at: Math.floor((checkpoint?.atMs ?? Date.now()) / 1000), v: 1, ...(checkpoint ? { checkpoint: { epoch: checkpoint.epoch, revision: checkpoint.revision, atMs: checkpoint.atMs } } : {}) });
    try {
      const prev = store.getItem(MAIN); if (prev && read(MAIN)) store.setItem(BAK, prev); // keep the previous good save
      store.setItem(MAIN, rec); this.lastAt = Date.now(); this.lastErr = ''; return true;
    } catch (e) { // storage full: drop the backup and try once more
      try { store.removeItem(BAK); store.setItem(MAIN, rec); this.lastAt = Date.now(); this.lastErr = 'backup dropped (storage full)'; return true; } catch (e2) { this.lastErr = 'storage full'; return false; }
    }
  },
  getKept() { return read(KEPT); },
  keep(rec) { // the game being replaced by New game or Load, kept in its own slot until the next replacement
    if (!store || !rec || typeof rec.code !== 'string') return false;
    try { store.setItem(KEPT, JSON.stringify({ code: rec.code, meta: rec.meta || {}, at: rec.at || Math.floor(Date.now() / 1000), keptAt: Math.floor(Date.now() / 1000), v: 1 })); return true; } catch (e) { return false; }
  },
  onClear: null,
  clear() { if (this.canClear && !this.canClear()) return false; const barrier = this.onClear?.(); try { if (store && this.clearShared !== false) { store.removeItem(MAIN); store.removeItem(BAK); } } catch (e) { /* ignore */ } return barrier; },
};
