// Only the exact single-property wrapper correction is inverted for historical guards.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const d=JSON.parse(readFileSync(new URL('./save_name-allowlist.json',import.meta.url)));
const hash=s=>createHash('sha256').update(s).digest('hex');
export function normalizeSaveName(text,file){
 if(file!==d.file)return text;
 if(hash(text)===d.parent_sha256)return text;
 assert.equal(hash(text),d.current_sha256,'exact save-name correction identity');
 assert.equal(text.split(d.after).length-1,1,'single exact save-name hunk');
 const parent=text.replace(d.after,d.before);
 assert.equal(hash(parent),d.parent_sha256,'complete save-name parent identity');
 return parent;
}
