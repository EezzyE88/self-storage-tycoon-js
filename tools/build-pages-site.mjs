// Assemble the GitHub Pages site for one exact commit and stamp that commit into js/build-stamp.js.
// Usage: node tools/build-pages-site.mjs <40-hex commit sha> <output dir>
// Copies only the files the game needs at runtime; tests, docs, tools and the save server stay out.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const REPO = 'EezzyE88/self-storage-tycoon-js';
export const SITE_FILES = ['index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'css', 'js', 'vendor'];

export function stampSource(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('build stamp needs a full lowercase 40-hex commit sha, got: ' + sha);
  return `// Deploy-time build stamp written by tools/build-pages-site.mjs for GitHub Pages.\nexport const STAMP = Object.freeze(${JSON.stringify({ repo: REPO, sha })});\n`;
}

export function buildSite(root, sha, out) {
  const source = stampSource(sha);
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  for (const f of SITE_FILES) {
    if (!existsSync(resolve(root, f))) throw new Error('missing site file: ' + f);
    cpSync(resolve(root, f), resolve(out, f), { recursive: true });
  }
  writeFileSync(resolve(out, 'js/build-stamp.js'), source);
  writeFileSync(resolve(out, '.nojekyll'), '');
  if (readFileSync(resolve(out, 'js/build-stamp.js'), 'utf8') !== source) throw new Error('stamp write did not stick');
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sha, out] = process.argv.slice(2);
  if (!sha || !out) { console.error('usage: node tools/build-pages-site.mjs <sha> <out>'); process.exit(2); }
  const root = fileURLToPath(new URL('../', import.meta.url));
  buildSite(root, sha, resolve(out));
  console.log(`site for ${sha} written to ${resolve(out)}`);
}
