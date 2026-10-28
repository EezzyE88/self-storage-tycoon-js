// Undo only the complete declared repair; historical guards still compare entire files.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const declaration=JSON.parse(readFileSync(new URL('./transaction-safety-allowlist.json',import.meta.url)));
const hash=s=>createHash('sha256').update(s).digest('hex');
export function transactionBaseline(file) {
 let text=readFileSync(file,'utf8');const entry=declaration.files[file];if(!entry)return text;
 assert.equal(hash(text),entry.current_sha256,'exact transaction repair: '+file);
 for(const h of [...entry.hunks].reverse()) {
  assert.equal(text.split(h.after).length-1,1,'one exact transaction hunk: '+file);
  text=text.replace(h.after,h.before);
 }
 assert.equal(hash(text),entry.parent_sha256,'complete d03bbcd source after transaction inverse: '+file);
 return text;
}
