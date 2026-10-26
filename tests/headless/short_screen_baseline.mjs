// Preserve exact historical guards while current behavioral tests execute production UI.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const declaration=JSON.parse(readFileSync(new URL('./short-screen-allowlist.json',import.meta.url)));
const hash=t=>createHash('sha256').update(t).digest('hex');
export function shortScreenBaseline(file) {
 let text=readFileSync(file,'utf8');const entry=declaration.files[file];if(!entry)return text;
 assert.equal(hash(text),entry.current_sha256,'exact declared short-screen presentation: '+file);
 for(const hunk of entry.hunks){assert.equal(text.split(hunk.after).length-1,1,'one exact presentation hunk: '+file);text=text.replace(hunk.after,hunk.before);}
 assert.equal(hash(text),entry.parent_sha256,'complete durable parent after presentation normalization: '+file);
 return text;
}
