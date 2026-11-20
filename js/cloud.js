// FS-01 never uses the legacy per-visitor slot, including on localhost or after browser failure.
// Guards remain on every operation. No URL/header/metadata can enable this adapter.
const BASE = null;
const H = {};

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
