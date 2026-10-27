// Exact first-gate UI patch for historical source guards; current behavior imports production UI.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {financialContextBaseline} from './financial_context_baseline.mjs';
const declaration=JSON.parse(readFileSync(new URL('./first-gate-allowlist.json',import.meta.url)));
const hash=t=>createHash('sha256').update(t).digest('hex');
export function firstGateBaseline(file) {
 let text=financialContextBaseline(file);const entry=declaration.files[file];if(!entry)return text;
 assert.equal(hash(text),entry.current_sha256,'exact declared first-gate guidance: '+file);
 for(const hunk of entry.hunks){assert.equal(text.split(hunk.after).length-1,1,'one exact first-gate hunk: '+file);text=text.replace(hunk.after,hunk.before);}
 assert.equal(hash(text),entry.parent_sha256,'complete acquisition-guidance parent after gate normalization: '+file);
 return text;
}
