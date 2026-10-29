// Exact inverse of the isolated Stage 1 placeables contract only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeStage2A} from './stage2a_baseline.mjs';
const hash=t=>createHash('sha256').update(t).digest('hex');
const declared=JSON.parse(readFileSync(new URL('./stage1-allowlist.json',import.meta.url),'utf8'));
export function normalizeStage1(text,file){
 text=normalizeStage2A(text,file);
 const entry=declared.files[file]; if(!entry)return text;
 const identity=hash(text); if(identity===entry.parent_sha256)return text;
 assert.equal(identity,entry.current_sha256,`exact Stage 1 ${file} identity`);
 for(const h of [...entry.hunks].reverse()){
  assert.equal(text.split(h.after).length-1,1,`one declared Stage 1 hunk in ${file}`);
  text=text.replace(h.after,h.before);
 }
 assert.equal(hash(text),entry.parent_sha256,`complete requested parent identity after Stage 1 inverse for ${file}`);
 return text;
}
export const stage1Baseline=file=>normalizeStage1(readFileSync(file,'utf8'),file);
