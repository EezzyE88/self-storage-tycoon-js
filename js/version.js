// Build identity derived from where this module was served, never from a hand-edited label.
// Only commit-pinned URLs for EezzyE88/self-storage-tycoon-js on explicitly supported hosts
// count as exact. Everything else (branches, short SHAs, localhost, file://, other repos or
// hosts, malformed URLs) is reported as a clearly non-exact development build.
const OWNER = 'eezzye88', REPO = 'self-storage-tycoon-js', MODULE_PATH = 'js/version.js';
// host -> path layout: /<owner>/<repo>/<ref>/<file path>
const SUPPORTED_HOSTS = new Set(['rawcdn.githack.com', 'raw.githack.com']);
const FULL_SHA = /^[0-9a-f]{40}$/i;

export const UNVERIFIED_NAME = 'dev-unverified';

function unverified(reason, source = null) {
  return { name: UNVERIFIED_NAME, date: 'unverified source', exact: false, sha: null, reason, source };
}

export function parseSourceIdentity(moduleUrl) {
  let u;
  try { u = new URL(String(moduleUrl)); } catch { return unverified('malformed-url'); }
  if (u.protocol !== 'https:') return unverified('unsupported-protocol', u.href);
  if (u.username || u.password || u.port) return unverified('unsupported-host', u.href);
  if (!SUPPORTED_HOSTS.has(u.hostname)) return unverified('unsupported-host', u.href);
  let parts;
  try { parts = u.pathname.split('/').map(decodeURIComponent); } catch { return unverified('malformed-url', u.href); }
  // ['', owner, repo, ref, 'js', 'version.js']
  if (parts.length !== 6 || parts[0] !== '') return unverified('unsupported-path', u.href);
  const [, owner, repo, ref, ...file] = parts;
  if (owner.toLowerCase() !== OWNER || repo.toLowerCase() !== REPO) return unverified('wrong-repository', u.href);
  if (file.join('/') !== MODULE_PATH) return unverified('unsupported-path', u.href);
  if (!FULL_SHA.test(ref)) return unverified('mutable-or-malformed-ref', u.href);
  const sha = ref.toLowerCase();
  return { name: sha.slice(0, 7), date: 'exact source', exact: true, sha, reason: 'commit-pinned', source: u.href };
}

export const BUILD = Object.freeze(parseSourceIdentity(import.meta.url));
