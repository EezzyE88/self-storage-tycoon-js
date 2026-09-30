"""Autosave server: one save slot per visitor (X-Visitor-Id from the hosting proxy, else X-Client-Id)."""
import json, os, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saves'); os.makedirs(DIR, exist_ok=True)
MAX = 2_000_000
def key(h):
    k = h.get('X-Visitor-Id') or h.get('X-Client-Id') or 'anon'
    return re.sub(r'[^A-Za-z0-9._:-]', '', k)[:80] or 'anon'
class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,X-Client-Id')
    def _send(self, code, body=b''):
        self.send_response(code); self._cors(); self.send_header('Content-Type', 'application/json'); self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def log_message(self, *a): pass
    def do_OPTIONS(self): self._send(204)
    def path_for(self): return os.path.join(DIR, key(self.headers).replace(':', '_') + '.json')
    def do_GET(self):
        if not self.path.startswith('/api/save'): return self._send(404)
        p = self.path_for()
        if not os.path.exists(p): return self._send(204)
        with open(p, 'rb') as f: self._send(200, f.read())
    def do_PUT(self):
        if not self.path.startswith('/api/save'): return self._send(404)
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX: return self._send(413)
        try: d = json.loads(self.rfile.read(n)); assert isinstance(d.get('code'), str)
        except Exception: return self._send(400)
        tmp = self.path_for() + '.tmp'
        with open(tmp, 'w') as f: json.dump({'code': d['code'], 'meta': d.get('meta')}, f)
        os.replace(tmp, self.path_for()); self._send(200, b'{"ok":true}')
    def do_DELETE(self):
        try: os.remove(self.path_for())
        except FileNotFoundError: pass
        self._send(200, b'{"ok":true}')
ThreadingHTTPServer(('0.0.0.0', 8000), H).serve_forever()
