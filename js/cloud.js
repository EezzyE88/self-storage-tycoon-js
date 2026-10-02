// Autosave to the save server (one slot per browser). The hosting proxy identifies the browser with
// an X-Visitor-Id header; browser storage is unavailable in the sandboxed preview, so saves live server-side.
const RAW = '__PORT_8000__';
// The save server exists only in the sandboxed preview (placeholder rewritten) or when the game itself runs on this machine.
// On public hosts such as GitHub Pages it is switched off: no failed requests, no local-network permission prompts.
const LOCAL_HOST = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const BASE = !RAW.startsWith('__') ? RAW : LOCAL_HOST ? 'http://localhost:8000' : null;
const q = new URLSearchParams(location.search);
const CID = (q.get('cid') || ('t' + Math.random().toString(36).slice(2) + Date.now().toString(36))).replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 64);
const H = { 'X-Client-Id': CID };

export const cloud = {
  ok: BASE ? null : false, // null = unknown, true = reachable, false = offline or not used on this host
  enabled: !!BASE,
  lastAt: 0, lastErr: '', busy: false,
  async get() {
    if (!BASE) return null;
    try {
      const r = await fetch(BASE + '/api/save', { headers: H, cache: 'no-store' });
      this.ok = r.ok;
      if (r.status !== 200) return null;
      const d = await r.json(); if (!d || typeof d.code !== 'string') return null;
      return d;
    } catch (e) { this.ok = false; return null; }
  },
  async put(code, meta) {
    if (!BASE) return false;
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
    if (!BASE) return;
    const body = JSON.stringify({ code, meta });
    try {
      if (body.length < 60000) { fetch(BASE + '/api/save', { method: 'PUT', keepalive: true, headers: { ...H, 'Content-Type': 'application/json' }, body }).then((r) => { if (r.ok) this.lastAt = Date.now(); }).catch(() => {}); return; }
    } catch (e) { /* fall through */ }
    this.put(code, meta);
  },
  async clear() { if (!BASE) return; try { await fetch(BASE + '/api/save', { method: 'DELETE', headers: H }); } catch (e) { /* ignore */ } },
};
