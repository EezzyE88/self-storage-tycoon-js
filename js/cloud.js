// Autosave to the save server (one slot per browser). The hosting proxy identifies the browser with
// an X-Visitor-Id header; browser storage is unavailable in the sandboxed preview, so saves live server-side.
const RAW = 'port/8000';
const BASE = RAW.startsWith('__') ? 'http://localhost:8000' : RAW; // rewritten to the proxy path when deployed
const q = new URLSearchParams(location.search);
const CID = (q.get('cid') || ('t' + Math.random().toString(36).slice(2) + Date.now().toString(36))).replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 64);
const H = { 'X-Client-Id': CID };

export const cloud = {
  ok: null, // null = unknown, true = reachable, false = offline
  lastAt: 0, lastErr: '', busy: false,
  async get() {
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
      const r = await fetch(BASE + '/api/save', { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ code, meta }) });
      this.ok = r.ok; if (r.ok) { this.lastAt = Date.now(); this.lastErr = ''; } else this.lastErr = 'HTTP ' + r.status;
      return r.ok;
    } catch (e) { this.ok = false; this.lastErr = 'offline'; return false; }
    finally { this.busy = false; }
  },
  // best-effort save while the page is being hidden (iOS may freeze the page right after)
  beacon(code, meta) {
    const body = JSON.stringify({ code, meta });
    try {
      if (body.length < 60000) { fetch(BASE + '/api/save', { method: 'PUT', keepalive: true, headers: { ...H, 'Content-Type': 'application/json' }, body }).then((r) => { if (r.ok) this.lastAt = Date.now(); }).catch(() => {}); return; }
    } catch (e) { /* fall through */ }
    this.put(code, meta);
  },
  async clear() { try { await fetch(BASE + '/api/save', { method: 'DELETE', headers: H }); } catch (e) { /* ignore */ } },
};
