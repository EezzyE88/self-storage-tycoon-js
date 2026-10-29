// Exact declared inspector change only; behavioral tests execute the actual UI.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {normalizeStage1} from './stage1_baseline.mjs';
const hash=t=>createHash('sha256').update(t).digest('hex');
const before="      case 'door': {\n        return this.sheet(nm, o.keypad ? 'With keypad' : 'No keypad', `${o.kind === 'auto' ? this.condBar(o.cond) : ''}<div class=\"kv\"><span>Cart speed</span><span>${o.kind === 'std' ? 'Slow' : o.kind === 'wide' ? 'Good' : 'Fast'}</span>${o.keypad ? `<span>Keypad</span><span>${o.keypad === 'operating' ? pct(o.kcond ?? 1) : 'Installing'}</span>` : ''}</div>${o.kind === 'auto' ? this.taskActions(o) : ''}`);\n      }\n";
const after="      case 'door': {\n        const ord = o.keypad === 'pending' && s.orders.find(q => q.id === o.keypadOrder && q.keypadDoor === o.id && q.st === 'construction');\n        return this.sheet(nm, o.keypad ? 'With keypad' : 'No keypad', `${o.kind === 'auto' ? this.condBar(o.cond) : ''}<div class=\"kv\"><span>Cart speed</span><span>${o.kind === 'std' ? 'Slow' : o.kind === 'wide' ? 'Good' : 'Fast'}</span>${o.keypad ? `<span>Keypad</span><span>${o.keypad === 'operating' ? pct(o.kcond ?? 1) : 'Installing'}</span>` : ''}</div>${ord ? this.cmdBtn('Cancel keypad installation\u2026', {type:'cancelOrder',id:ord.id}, 'danger') : ''}${o.kind === 'auto' ? this.taskActions(o) : ''}`);\n      }\n";
export function normalizeKeypadCancel(text,file){
 text=normalizeStage1(text,file);
 if(file!=='js/ui.js')return text;
 assert.equal(hash(text),"1a1de61e9dc1ca335fb07a2bf52e5c8a034c3d8381977a6e5497b280cc4bd48c",'exact keypad cancellation UI identity');
 assert.equal(text.split(after).length-1,1,'one declared door inspector change');
 text=text.replace(after,before);
 assert.equal(hash(text),"b256f12403c2cd817d2780efda8b8001ab31d48cbb3ba0a3dffc26b7a8cc55a0",'complete Stage 0 UI identity after inverse');
 return text;
}
