// Older "previous game" copies. When the single kept slot (localsave.js, unchanged) must take a new game, the game it
// held moves here instead of being silently discarded. Browser storage only; bounded, and any drop is announced first.
//
// Preservation first: every sequence is ordered so that no game loses its last stored copy before its replacement is
// stored. The displaced previous game is added to the archive (untrimmed) before the kept slot is overwritten, and a
// game being restored keeps its stored copy until the restored game has been autosaved. A failed write can therefore
// leave at most an extra copy, never a missing game. Extra copies survive reloads; only a step whose drop was
// disclosed beforehand trims the list. After a failure, storage is re-read and the report says what it now holds.
const KEY = 'sst.kept.archive';
export const ARCHIVE_MAX = 5;
let store = null;
try { const ls = window.localStorage; const k = 'sst.probe.archive'; ls.setItem(k, '1'); ls.removeItem(k); store = ls; } catch (e) { store = null; }
const valid = (r) => r && typeof r.code === 'string' && r.meta && typeof r.meta === 'object';
const KEPT = 'sst.kept.previous'; // localsave.js's kept slot (that module is unchanged; the key is shared)
const UNREADABLE = '.unreadable'; // an unparseable slot's bytes are copied here before anything overwrites them
// Raw slot bytes; ok:false when storage cannot be read at all (distinct from an empty slot).
function snapshot() {
  if (!store) return { ok: false };
  try { return { ok: true, listRaw: store.getItem(KEY), keptRaw: store.getItem(KEPT) }; } catch (e) { return { ok: false }; }
}
const parseList = (raw) => { if (raw == null) return []; try { const d = JSON.parse(raw); return Array.isArray(d) ? d.filter(valid) : null; } catch (e) { return null; } };
const parseKept = (raw) => { if (raw == null) return null; try { const d = JSON.parse(raw); return valid(d) ? d : undefined; } catch (e) { return undefined; } };
const read = () => { const s = snapshot(); return (s.ok && parseList(s.listRaw)) || []; };
const write = (list) => { try { store.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } };
const entry = (r) => ({ code: r.code, meta: r.meta, at: r.at || 0, archivedAt: Math.floor(Date.now() / 1000) });
const uniq = (list, skip) => { const seen = new Set(skip ? [skip] : []); return list.filter((r) => !seen.has(r.code) && seen.add(r.code)); };
// Copy an unparseable slot's bytes aside before it can be overwritten; false if that copy cannot be stored.
function quarantine(key, raw) { try { if (store.getItem(key + UNREADABLE) !== raw) store.setItem(key + UNREADABLE, raw); return true; } catch (e) { return false; } }
// A step failed. While the kept slot still holds what it held before, the entry this sequence added is a pure
// duplicate, so one attempt is made to put the archive bytes back. That attempt is not relied on: storage is re-read
// and the report states what it now holds (unchanged, extra copies, anything missing, or not verifiable).
function failed(s0) {
  let s1 = snapshot();
  if (s1.ok && s1.keptRaw === s0.keptRaw && s1.listRaw !== s0.listRaw) {
    try { if (s0.listRaw == null) store.removeItem(KEY); else store.setItem(KEY, s0.listRaw); } catch (e) { /* reported below */ }
    s1 = snapshot();
  }
  if (!s1.ok) return { ok: false, reason: 'write', verified: false, unchanged: false, extras: [], lost: [] };
  const before = [...(parseList(s0.listRaw) || []), parseKept(s0.keptRaw)].filter(Boolean);
  const nowList = parseList(s1.listRaw) || [], nowKept = parseKept(s1.keptRaw), has = new Set([...nowList, nowKept].filter(Boolean).map((r) => r.code));
  const unchanged = s1.listRaw === s0.listRaw && s1.keptRaw === s0.keptRaw;
  const extras = unchanged ? [] : nowList.filter((r, i) => (nowKept && r.code === nowKept.code) || nowList.findIndex((x) => x.code === r.code) !== i).map((r) => r.meta);
  const lost = uniq(before).filter((r) => !has.has(r.code)).map((r) => r.meta);
  return { ok: false, reason: 'write', verified: true, unchanged, extras, lost };
}
// Remove copies that are stored elsewhere: the current kept game, repeated codes and, when the caller has confirmed
// the restored game is saved, that game's archive copy. With `trim`, entries beyond ARCHIVE_MAX go; only a sequence
// whose drop was disclosed beforehand passes it. Failure leaves extra copies only.
function tidy(dropCode, trim) {
  const s = snapshot(); if (!s.ok) return false; const list = parseList(s.listRaw), kept = parseKept(s.keptRaw); if (!list) return false;
  let next = uniq(list, kept && kept.code); if (dropCode) next = next.filter((r) => r.code !== dropCode); if (trim) next = next.slice(0, ARCHIVE_MAX);
  return next.length === list.length ? true : write(next);
}
export const savearchive = {
  get ok() { return !!store; },
  list() { return read(); },
  // Entries that keeping a new previous game would remove to make room (the oldest), or [] when none.
  wouldDrop(rec) { const l = read(); return rec && !l.some((r) => r.code === rec.code) ? uniq([entry(rec), ...l]).slice(ARCHIVE_MAX) : []; },
  // Add one entry at the front. Never trims, so it can never drop a game.
  push(rec) { if (!store || !valid(rec)) return false; const l = read().filter((r) => r.code !== rec.code); l.unshift(entry(rec)); return write(l); },
  // Store `cur` as the previous game with keepFn (localsave.keep). (1) Copy the displaced previous game into the
  // archive, untrimmed. (2) Overwrite the kept slot. (3) Unless `hold`, tidy and drop only what wouldDrop disclosed.
  // Restores pass `hold`, so the game they replace keeps its archive copy until settle() runs after a save.
  keep(cur, keepFn, hold) {
    const s0 = snapshot(); if (!s0.ok) return { ok: false, reason: 'read', verified: false, unchanged: true, extras: [], lost: [] };
    let list = parseList(s0.listRaw), kept = parseKept(s0.keptRaw);
    if (list === null) { if (!quarantine(KEY, s0.listRaw)) return failed(s0); list = []; }
    if (kept === undefined) { if (!quarantine(KEPT, s0.keptRaw)) return failed(s0); kept = null; }
    let added = false;
    if (kept && kept.code !== cur.code && !list.some((r) => r.code === kept.code)) { if (!write([entry(kept), ...list])) return failed(s0); added = true; }
    if (!keepFn(cur)) return failed(s0);
    return { ok: true, tidied: hold ? false : tidy(null, added) };
  },
  // After a restored game has been saved: remove its archive copy and any copy of the current previous game.
  settle(code) { return tidy(code, false); },
};
