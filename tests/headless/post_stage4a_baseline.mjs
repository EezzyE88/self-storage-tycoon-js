// Exact post-Stage-4A inverses, newest first. Production methods are never replaced.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const layers=JSON.parse(readFileSync(new URL('./post_stage4a-allowlist.json',import.meta.url),'utf8')).layers;
const hash=text=>createHash('sha256').update(text).digest('hex');
export function normalizePostStage4A(text,file){
 for(const layer of [...layers].reverse()){
  const entry=layer.files[file];if(!entry)continue;
  // A file may have been unchanged since an earlier declared commit. Only exact
  // known ancestors are accepted; unknown source still reaches a whole-file failure.
  const earlier=layers.slice(0,layers.indexOf(layer)).flatMap(l=>l.files[file]?[l.files[file].current_sha256,l.files[file].parent_sha256]:[]);
  const identity=hash(text);
  if(identity===entry.parent_sha256||earlier.includes(identity))continue;
  assert.equal(identity,entry.current_sha256,`exact ${layer.commit} ${file} identity`);
  for(const h of [...entry.hunks].reverse()){
   assert.equal(text.split(h.after).length-1,1,`one declared ${layer.commit} hunk in ${file}`);
   text=text.replace(h.after,h.before);
  }
  assert.equal(hash(text),entry.parent_sha256,`complete ${layer.parent_commit} identity after inverse for ${file}`);
 }
 return text;
}
