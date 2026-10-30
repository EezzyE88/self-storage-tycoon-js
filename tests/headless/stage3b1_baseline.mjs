// Exact inverse of Stage 3B-1 gate-local lifecycle isolation changes only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=t=>createHash('sha256').update(t).digest('hex');
const declared=JSON.parse(readFileSync(new URL('./stage3b1-allowlist.json',import.meta.url),'utf8'));
export function normalizeStage3B1(text,file){
 const entry=declared.files[file]; if(!entry)return text;
 const identity=hash(text); if(identity===entry.parent_sha256)return text;
 assert.equal(identity,entry.current_sha256,`exact Stage 3B-1 ${file} identity`);
 for(const h of [...entry.hunks].reverse()){
  assert.equal(text.split(h.after).length-1,1,`one declared Stage 3B-1 hunk in ${file}`);
  text=text.replace(h.after,h.before);
 }
 assert.equal(hash(text),entry.parent_sha256,`complete accepted Stage 3A identity after Stage 3B-1 inverse for ${file}`);
 return text;
}
export const stage3b1Baseline=file=>normalizeStage3B1(readFileSync(file,'utf8'),file);
