// Exact inverse of this UI-only patch for historical whole-file guards.
// Behavioral tests import current production methods, never this normalized text.
import assert from 'node:assert/strict';
import {transactionBaseline} from './transaction_baseline.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const declaration=JSON.parse(readFileSync(new URL('./financial-context-allowlist.json',import.meta.url)));
const hash=t=>createHash('sha256').update(t).digest('hex');
export function financialContextBaseline(file) {
 let text=transactionBaseline(file);const entry=declaration.files[file];if(!entry)return text;
 assert.equal(hash(text),entry.current_sha256,'exact financial-context patch: '+file);
 for(const hunk of entry.hunks){assert.equal(text.split(hunk.after).length-1,1,'one exact financial-context hunk: '+file);text=text.replace(hunk.after,hunk.before);}
 assert.equal(hash(text),entry.parent_sha256,'complete b8ce9e9 identity after financial-context normalization: '+file);
 return text;
}
