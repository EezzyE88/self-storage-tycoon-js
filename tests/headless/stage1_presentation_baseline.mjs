// The rendered Stage 1 correction sits between Stage 1 and Stage 2A.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const declared=JSON.parse(readFileSync(new URL('./stage1_presentation-allowlist.json',import.meta.url),'utf8'));
const hash=text=>createHash('sha256').update(text).digest('hex');
export function normalizeStage1Presentation(text,file){
 const entry=declared.files[file];if(!entry)return text;
 const identity=hash(text);if(identity===entry.parent_sha256)return text;
 assert.equal(identity,entry.current_sha256,`exact Stage 1 presentation ${file} identity`);
 for(const h of [...entry.hunks].reverse()){
  assert.equal(text.split(h.after).length-1,1,`one declared Stage 1 presentation hunk in ${file}`);
  text=text.replace(h.after,h.before);
 }
 assert.equal(hash(text),entry.parent_sha256,`complete ${declared.parent_commit} identity after presentation inverse for ${file}`);
 return text;
}
