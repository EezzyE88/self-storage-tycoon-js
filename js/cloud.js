// Autosave transport. Perplexity's sandbox rewrites __PORT_8000__ to its private save server.
// Normal web hosts (including a separate Vercel Preview) leave the token untouched, so use
// same-origin browser storage there. Both paths preserve the product contract: one autosave slot
// for this browser, used by Continue; save codes/files remain portable backups.
const RAW = '__PORT_8000__';
const SERVER = !RAW.startsWith('__');
const BASE = SERVER ? RAW : null;
const STORE_KEY = 'sst.autosave.v1';
const MAX = 2_000_000;
const q = new URLSearchParams(location.search);
const CID = (q.get('cid') || ('t' + Math.random().toString(36).slice(2) + Date.now().toString(36))).replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 64);
const H = { 'X-Client-Id': CID };

function localRead() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.code !== 'string') return null;
    return d;
  } catch (e) { return null; }
}
function localWrite(code, meta) {
  try {
    const d = { code, meta, at: Date.now() / 1000 };
    const body = JSON.stringify(d);
    if (!code || body.length > MAX) return false;
    localStorage.setItem(STORE_KEY, body);
    return true;
  } catch (e) { return false; }
}

export const cloud = {
  ok: null, // null = unknown, true = reachable/usable, false = offline/unavailable
  lastAt: 0, lastErr: '', busy: false,
  async get() {
    if (!SERVER) {
      const d = localRead();
      this.ok = true;
      if (d && d.at) this.lastAt = d.at * 1000;
      return d;
    }
    try {
      const r = await fetch(BASE + '/api/save', { headers: H, cache: 'no-store' });
      this.ok = r.ok;
      if (r.status !== 200) return null;
      const d = await r.json(); if (!d || typeof d.code !== 'string') return null;
      return d;
    } catch (e) { this.ok = false; return null; }
  },
  async put(code, meta) {
    if (this.busy) return false; this.busy = true;
    try {
      if (!SERVER) {
        const ok = localWrite(code, meta);
        this.ok = ok;
        if (ok) { this.lastAt = Date.now(); this.lastErr = ''; }
        else this.lastErr = 'browser storage unavailable';
        return ok;
      }
      const r = await fetch(BASE + '/api/save', { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ code, meta }) });
      this.ok = r.ok; if (r.ok) { this.lastAt = Date.now(); this.lastErr = ''; } else this.lastErr = 'HTTP ' + r.status;
      return r.ok;
    } catch (e) { this.ok = false; this.lastErr = 'offline'; return false; }
    finally { this.busy = false; }
  },
  // Best-effort save while the page is being hidden. Browser storage is synchronous, which is
  // more reliable on iOS pagehide than starting a network request. The sandbox server path keeps
  // the original keepalive behavior.
  beacon(code, meta) {
    if (!SERVER) {
      const ok = localWrite(code, meta);
      this.ok = ok;
      if (ok) { this.lastAt = Date.now(); this.lastErr = ''; }
      else this.lastErr = 'browser storage unavailable';
      return;
    }
    const body = JSON.stringify({ code, meta });
    try {
      if (body.length < 60000) { fetch(BASE + '/api/save', { method: 'PUT', keepalive: true, headers: { ...H, 'Content-Type': 'application/json' }, body }).then((r) => { if (r.ok) this.lastAt = Date.now(); }).catch(() => {}); return; }
    } catch (e) { /* fall through */ }
    this.put(code, meta);
  },
  async clear() {
    if (!SERVER) {
      try { localStorage.removeItem(STORE_KEY); this.ok = true; } catch (e) { this.ok = false; }
      return;
    }
    try { await fetch(BASE + '/api/save', { method: 'DELETE', headers: H }); } catch (e) { /* ignore */ }
  },
};
