// Browser autosave (concept §13: save/resume is foundational). One main slot plus the previous save as a backup.
// Used wherever browser storage exists (GitHub Pages, any normal host). In the sandboxed preview, storage is blocked
// and the save server in cloud.js is used instead.
const MAIN = 'sst.autosave.main', BAK = 'sst.autosave.backup', KEPT = 'sst.kept.previous'; // KEPT is never written by autosave
let store = null;
try { const ls = window.localStorage; const k = 'sst.probe'; ls.setItem(k, '1'); ls.removeItem(k); store = ls; } catch (e) { store = null; }
const read = (k) => { try { const raw = store && store.getItem(k); if (!raw) return null; const d = JSON.parse(raw); return d && typeof d.code === 'string' && d.meta ? d : null; } catch (e) { return null; } };
export const localsave = {
  ok: !!store, lastAt: 0, lastErr: '',
  get() { return { main: read(MAIN), backup: read(BAK) }; },
  put(code, meta) {
    if (!store) return false;
    const rec = JSON.stringify({ code, meta, at: Math.floor(Date.now() / 1000), v: 1 });
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
  clear() { try { store && store.removeItem(MAIN); store && store.removeItem(BAK); } catch (e) { /* ignore */ } },
};
