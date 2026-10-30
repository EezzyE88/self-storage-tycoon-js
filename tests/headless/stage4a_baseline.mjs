// Exact inverse of Stage 4A player-buildable second entrance gate changes only.
import assert from 'node:assert/strict';
import {normalizeSaveName} from './save_name_baseline.mjs';
import {normalizePostStage4A} from './post_stage4a_baseline.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=t=>createHash('sha256').update(t).digest('hex');
const declared=JSON.parse(readFileSync(new URL('./stage4a-allowlist.json',import.meta.url),'utf8'));
export function normalizeStage4A(text,file){
 text=normalizePostStage4A(normalizeSaveName(text,file),file);
 const entry=declared.files[file]; if(!entry)return text;
 const identity=hash(text); if(identity===entry.parent_sha256)return text;
 assert.equal(identity,entry.current_sha256,`exact Stage 4A ${file} identity`);
 for(const h of [...entry.hunks].reverse()){
  assert.equal(text.split(h.after).length-1,1,`one declared Stage 4A hunk in ${file}`);
  text=text.replace(h.after,h.before);
 }
 assert.equal(hash(text),entry.parent_sha256,`complete accepted Stage 3B-2A identity after Stage 4A inverse for ${file}`);
 return text;
}
export const stage4aBaseline=file=>normalizeStage4A(readFileSync(file,'utf8'),file);
