// Older "previous game" copies. When the single kept slot (localsave.js, unchanged) must take a new game, the game it
// held moves here instead of being silently discarded. Browser storage only; bounded, and any drop is announced first.
const KEY = 'sst.kept.archive';
export const ARCHIVE_MAX = 5;
let store = null;
try { const ls = window.localStorage; const k = 'sst.probe.archive'; ls.setItem(k, '1'); ls.removeItem(k); store = ls; } catch (e) { store = null; }
const valid = (r) => r && typeof r.code === 'string' && r.meta && typeof r.meta === 'object';
const read = () => { try { const d = JSON.parse((store && store.getItem(KEY)) || '[]'); return Array.isArray(d) ? d.filter(valid) : []; } catch (e) { return []; } };
const write = (list) => { try { store.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } };
export const savearchive = {
  get ok() { return !!store; },
  list() { return read(); },
  // The entry that pushing one more would drop (newest first, so the last one), or null.
  wouldDrop(rec) { const l = read(); return rec && !l.some((r) => r.code === rec.code) && l.length >= ARCHIVE_MAX ? l[l.length - 1] : null; },
  push(rec) { if (!store || !valid(rec)) return false; const l = read().filter((r) => r.code !== rec.code); l.unshift({ code: rec.code, meta: rec.meta, at: rec.at || 0, archivedAt: Math.floor(Date.now() / 1000) }); return write(l.slice(0, ARCHIVE_MAX)); },
  take(i) { const l = read(); if (!store || !l[i]) return null; const [r] = l.splice(i, 1); return write(l) ? r : null; },
  put(i, rec) { if (!store || !valid(rec)) return false; const l = read(); l.splice(Math.max(0, Math.min(i, l.length)), 0, rec); return write(l.slice(0, ARCHIVE_MAX)); },
};
