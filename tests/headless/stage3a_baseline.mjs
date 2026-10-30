// Exact inverse of Stage 3A selected-gate routing changes only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeStage3B1} from './stage3b1_baseline.mjs';
const hash=t=>createHash('sha256').update(t).digest('hex');
const declared=JSON.parse(readFileSync(new URL('./stage3a-allowlist.json',import.meta.url),'utf8'));
export function normalizeStage3A(text,file){
 text=normalizeStage3B1(text,file);
 const entry=declared.files[file]; if(!entry)return text;
 const identity=hash(text); if(identity===entry.parent_sha256)return text;
 assert.equal(identity,entry.current_sha256,`exact Stage 3A ${file} identity`);
 for(const h of [...entry.hunks].reverse()){
  assert.equal(text.split(h.after).length-1,1,`one declared Stage 3A hunk in ${file}`);
  text=text.replace(h.after,h.before);
 }
 assert.equal(hash(text),entry.parent_sha256,`complete accepted Stage 2A identity after Stage 3A inverse for ${file}`);
 return text;
}
export const stage3aBaseline=file=>normalizeStage3A(readFileSync(file,'utf8'),file);
