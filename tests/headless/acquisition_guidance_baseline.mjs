// Exact presentation-only acquisition patch for historical whole-file guards.
// Current behavior tests always import the unmodified production module.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstGateBaseline} from './first_gate_baseline.mjs';
import {createHash} from 'node:crypto';
const declaration=JSON.parse(readFileSync(new URL('./acquisition-guidance-allowlist.json',import.meta.url)));
const hash=t=>createHash('sha256').update(t).digest('hex');
export function acquisitionGuidanceBaseline(file) {
 let text=firstGateBaseline(file);const entry=declaration.files[file];if(!entry)return text;
 assert.equal(hash(text),entry.current_sha256,'exact declared acquisition guidance: '+file);
 for(const hunk of entry.hunks){assert.equal(text.split(hunk.after).length-1,1,'one exact acquisition guidance hunk: '+file);text=text.replace(hunk.after,hunk.before);}
 assert.equal(hash(text),entry.parent_sha256,'complete short-screen parent after guidance normalization: '+file);
 return text;
}
