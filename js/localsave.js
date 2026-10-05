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
  archives() { try{return JSON.parse(store?.getItem('sst.kept.archives')||'[]');}catch{return [];} },
  activateImport(outgoing, incoming) {
    if(!store || !incoming || typeof incoming.code!=='string')return false;
    const keys=[MAIN,BAK,KEPT,'sst.kept.archives'],before=keys.map(k=>store.getItem(k));
    try {
      if(outgoing && !this.keepPreserving(outgoing))throw Error('Cannot preserve outgoing game');
      if(before[0])store.setItem(BAK,before[0]);
      store.setItem(MAIN,JSON.stringify({...incoming,at:Math.floor(Date.now()/1000),v:1}));
      this.lastAt=Date.now();this.lastErr='';return true;
    }catch {
      for(let i=0;i<keys.length;i++)try{if(before[i]===null)store.removeItem(keys[i]);else store.setItem(keys[i],before[i]);}catch{}
      this.lastErr='Import refused: storage full';return false;
    }
  },
  keepPreserving(rec) {
    if(!store || !rec)return false;const previous=store.getItem(KEPT),oldArchives=store.getItem('sst.kept.archives');
    try { if(previous){const a=this.archives();a.push(JSON.parse(previous));store.setItem('sst.kept.archives',JSON.stringify(a));}if(!this.keep(rec))throw Error('Storage full');return true; }
    catch {try{if(oldArchives===null)store.removeItem('sst.kept.archives');else store.setItem('sst.kept.archives',oldArchives);if(previous===null)store.removeItem(KEPT);else store.setItem(KEPT,previous);}catch{}return false;}
  },
  keep(rec) { // the game being replaced by New game or Load, kept in its own slot until the next replacement
    if (!store || !rec || typeof rec.code !== 'string') return false;
    try { store.setItem(KEPT, JSON.stringify({ code: rec.code, meta: rec.meta || {}, at: rec.at || Math.floor(Date.now() / 1000), keptAt: Math.floor(Date.now() / 1000), v: 1 })); return true; } catch (e) { return false; }
  },
  clear() { try { store && store.removeItem(MAIN); store && store.removeItem(BAK); } catch (e) { /* ignore */ } },
};
