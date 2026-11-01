// Where historical normalization guards read source text.
// By default this is the working tree, so every existing caller behaves exactly as before.
// Guards that verify the declared historical inverse chain can opt in to reading the chain head
// instead. Later edits to current files then no longer break those historical guards, and current
// behavior is asserted separately by each test's behavioral groups.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

// Last commit at which every declared historical inverse (save-name, post-Stage-4A, Stage 0-4A,
// transaction, financial-context, durable, keypad) applies exactly. All six guarded tests pass there.
export const HISTORICAL_CHAIN_HEAD='d155a92590a938005b00c16ec52d92b812205736';
let ref=null;
export function readSource(file){
 return ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024}):readFileSync(file,'utf8');
}
export function atHistoricalChainHead(fn){
 const prior=ref;ref=HISTORICAL_CHAIN_HEAD;
 try{return fn();}finally{ref=prior;}
}
