// Exact inverse of Stage 0 only; current behavioral checks execute the real guard.
import assert from 'node:assert/strict';
import {normalizeKeypadCancel} from './keypad_cancel_baseline.mjs';
import {normalizeStage1} from './stage1_baseline.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=t=>createHash('sha256').update(t).digest('hex');
const insertion="        if (o.cstate === 'construction' || o.keypad === 'pending') { failItem('Construction or installation is unfinished. Use Cancel construction for the applicable refund.'); return R; }\n";
export function normalizeStage0(text,file) {
 if(file!=='js/sim.js')return text;
 return invertStage0(normalizeStage1(text,file));
}
function invertStage0(text){
 assert.equal(hash(text),'8dbd416d8fc705d590df9a38b7632a067da4d5d110e6f4e505992555be48308c','exact Stage 0 simulation identity');
 assert.equal(text.split(insertion).length-1,1,'one exact Stage 0 insertion');
 text=text.replace(insertion,'');
 assert.equal(hash(text),'4f981640eaa7827a6ecb02e5ded951f370c7735feee8676b532045d1b7702656','complete eec4f5b simulation identity after Stage 0 inverse');
 return text;
}
export function stage0Baseline(file){
 // Keypad normalization already runs the shared Stage 1 chain. Do not run the
 // destructive inverse twice; each existing identity/hunk assertion runs once.
 const text=normalizeKeypadCancel(readFileSync(file,'utf8'),file);
 return file==='js/sim.js'?invertStage0(text):text;
}
