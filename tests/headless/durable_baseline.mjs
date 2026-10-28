// Historical byte guards may normalize only this declared, hashed durability patch.
// Runtime behavioral tests continue to execute current production methods.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shortScreenBaseline } from './short_screen_baseline.mjs';
import { createHash } from 'node:crypto';
const declarations = JSON.parse(readFileSync(new URL('./durable-allowlist.json', import.meta.url)));
const hash = text => createHash('sha256').update(text).digest('hex');
export function durableBaseline(file) {
  let text = shortScreenBaseline(file);
  const entry = declarations.files[file]; if (!entry) return text;
  assert.equal(hash(text), entry.current_sha256, 'exact declared durable change: ' + file);
  for (const hunk of entry.hunks) {
    assert.equal(text.split(hunk.after).length - 1, 1, 'one exact declared durability hunk: ' + file);
    text = text.replace(hunk.after, hunk.before);
  }
  assert.equal(hash(text), entry.parent_sha256, 'complete parent identity after exact durability normalization: ' + file);
  return text;
}
