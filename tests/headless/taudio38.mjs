import assert from 'node:assert/strict';
import {Audio} from '../../js/audio.js';
class Param {
  constructor(value=0){this.value=value;this.calls=[];}
  setValueAtTime(v,t){this.calls.push(['set',v,t]);this.value=v;}
  exponentialRampToValueAtTime(v,t){this.calls.push(['exp',v,t]);}
  linearRampToValueAtTime(v,t){this.calls.push(['linear',v,t]);}
  setValueCurveAtTime(v,t,d){this.calls.push(['curve',v,t,d]);}
  setTargetAtTime(v,t,tc){this.calls.push(['target',v,t,tc]);}
  cancelAndHoldAtTime(t){this.calls.push(['hold',t]);}
  cancelScheduledValues(t){this.calls.push(['cancel',t]);}
}
class Node {
  constructor(type){this.kind=type;this.connections=[];for(const p of ['gain','frequency','Q','threshold','knee','ratio','attack','release'])this[p]=new Param();}
  connect(n){this.connections.push(n);return n;}
  disconnect(){this.disconnected=true;this.connections=[];}
  start(t){this.started=t;}
  stop(t){this.stopped=t;}
}
class Context {
  constructor(){this.sampleRate=8000;this.currentTime=0;this.nodes=[];this.state='running';this.destination=new Node('destination');}
  node(k){const n=new Node(k);this.nodes.push(n);return n;}
  createGain(){return this.node('gain');}createOscillator(){return this.node('oscillator');}createBufferSource(){return this.node('source');}
  createBiquadFilter(){return this.node('filter');}createDynamicsCompressor(){return this.node('compressor');}createConvolver(){return this.node('convolver');}
  createBuffer(ch,len){const rows=Array.from({length:ch},()=>new Float32Array(len));return {getChannelData:i=>rows[i]};}
  suspend(){this.state='suspended';return Promise.resolve();}
  resume(){this.resumed=true;this.state='running';return Promise.resolve();}
}
globalThis.window={AudioContext:Context};globalThis.document={hidden:false};
const a=new Audio();a.unlock();const c=a.ctx;
a.tone(440,.3,{delay:2,rev:.2});a.noise(.3,{delay:3});const pending=[...a.sources];assert.equal(pending.length,2);
a.setBackground(true);assert.equal(c.state,'suspended');assert.equal(a.master.gain.value,0);assert.equal(a.sources.size,0);assert.ok(pending.every(s=>s.stopped===c.currentTime));
const count=c.nodes.length;a.play('attention');a.tone(440,.2);a.noise(.2);a.update({});a.unlock();assert.equal(c.nodes.length,count);
a.setBackground(false);assert.equal(c.state,'suspended');a.unlock();await Promise.resolve();assert.equal(c.state,'running');assert.equal(a.master.gain._tgt,a.vol.master);assert.equal(a.sources.size,0);
a.tone(440,.2);const source=[...a.sources][0];source.onended();assert.equal(a.sources.size,0);
c.state='suspended';let resolve;c.resume=()=>new Promise(r=>resolve=r);a.unlock();a.setBackground(true);c.state='running';resolve();await Promise.resolve();assert.equal(c.state,'suspended');assert.equal(a.master.gain._tgt,0);
document.hidden=true;const locked=new Audio();locked.unlock();assert.equal(locked.ctx,null);document.hidden=false;
console.log('PASS lifecycle: delayed cues cancelled, background silent, gesture resume, cleanup, resume race, hidden unlock');
