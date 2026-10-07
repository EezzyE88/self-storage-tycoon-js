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
  resume(){this.resumed=true;this.state='running';return Promise.resolve();}
}
globalThis.window={AudioContext:Context};globalThis.document={hidden:false};
let now=0;globalThis.performance={now:()=>now};
const keys=['click','tab','confirm','refuse','place','complete','rent','lease','gate','keypad','rollup','cart','chime','fault','repair','work','attention','milestone','flourish','shutter'];
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS '+name);};
const fixture=()=>{const a=new Audio();a.unlock();return a;};
test('unavailable WebAudio and locked playback are harmless',()=>{const old=window.AudioContext;delete window.AudioContext;const a=new Audio();a.unlock();a.play('click');assert.equal(a.ctx,null);window.AudioContext=old;});
test('gesture unlock creates one context and resumes it without rebuilding',()=>{const a=fixture(),c=a.ctx;a.unlock();assert.equal(a.ctx,c);c.state='suspended';a.unlock();assert.ok(c.resumed);});
test('master includes a low-pass and gentle dynamics control',()=>{const a=fixture(),f=a.master.connections[0],comp=f.connections[0];assert.equal(f.type,'lowpass');assert.equal(f.frequency.value,3400);assert.equal(comp.kind,'compressor');assert.equal(comp.ratio.value,3);assert.ok(comp.attack.value>0.01);});
test('wet reverb returns respect both effect and music volume buses',()=>{const a=fixture();assert.equal(a.revSfx.connections[0].connections[0].connections[0],a.sfx);assert.equal(a.revMusic.connections[0].connections[0].connections[0],a.mus);a.setVol('sfx',0);assert.equal(a.sfx.gain._tgt,0);a.musicOn=false;a.applyVol();assert.equal(a.mus.gain._tgt,0);a.setVol('master',0);assert.equal(a.master.gain._tgt,0);});
test('volume changes glide and reject invalid keys or values',()=>{const a=fixture();a.setVol('sfx',100);assert.equal(a.vol.sfx,1);a.setVol('sfx',-4);assert.equal(a.vol.sfx,0);a.setVol('sfx',NaN);assert.equal(a.vol.sfx,0);a.setVol('bogus',1);assert.equal(a.vol.bogus,undefined);assert.ok(a.sfx.gain.calls.some(c=>c[0]==='target'));});
for(const key of keys)test(key+' uses rounded envelopes, restrained peaks and no jagged waveforms',()=>{const a=fixture();a.last={};now=0;const first=a.ctx.nodes.length;a.play(key);const nodes=a.ctx.nodes.slice(first);assert.ok(nodes.some(n=>n.kind==='oscillator'||n.kind==='source'));
for(const node of nodes){if(node.kind==='oscillator'){assert.equal(node.type,'sine');assert.ok(node.frequency.calls[0][1]<=800);}if(node.kind==='filter'){assert.ok(node.frequency.calls[0][1]<=1100);assert.ok(node.Q.value<=0.5);}for(const c of node.gain.calls.filter(c=>c[0]==='curve')){const curve=c[1];assert.equal(curve[0],0);assert.equal(curve.at(-1),0);assert.ok(Math.max(...curve)<=0.05);assert.ok([...curve].every(x=>Number.isFinite(x)&&x>=0));}}
});
test('source stop occurs after silence and disconnected nodes are reclaimed',()=>{const a=fixture(),start=a.ctx.nodes.length;a.tone(440,0.3,{rev:0.2});const nodes=a.ctx.nodes.slice(start),osc=nodes.find(n=>n.kind==='oscillator'),g=nodes.find(n=>n.kind==='gain'),curve=g.gain.calls.find(c=>c[0]==='curve');assert.ok(osc.stopped>curve[2]+curve[3]);osc.onended();assert.ok(nodes.every(n=>n.disconnected));});
test('noise sources also stop silently and clean up filters',()=>{const a=fixture(),start=a.ctx.nodes.length;a.noise(0.3);const nodes=a.ctx.nodes.slice(start);nodes.find(n=>n.kind==='source').onended();assert.ok(nodes.every(n=>n.disconnected));});
test('repeated taps at time zero cannot bypass cooldown',()=>{const a=fixture();now=0;const start=a.ctx.nodes.length;for(let i=0;i<100;i++)a.play('refuse');assert.equal(a.ctx.nodes.slice(start).filter(n=>n.kind==='oscillator').length,2);});
test('a burst of different routine property events schedules only one cue',()=>{const a=fixture();now=100;const start=a.ctx.nodes.length;for(const k of ['gate','keypad','rollup','cart','chime','work'])a.play(k);assert.equal(a.ctx.nodes.slice(start).filter(n=>n.kind==='source').length,1);});
test('routine activity cannot suppress an owner attention cue',()=>{const a=fixture();now=100;a.play('gate');const start=a.ctx.nodes.length;a.play('attention');assert.equal(a.ctx.nodes.slice(start).filter(n=>n.kind==='oscillator').length,2);});
test('musical catch-up is bounded after prolonged mute',()=>{const a=fixture();a.update({});a.musicOn=false;a.ctx.currentTime=3600;a.update({});a.musicOn=true;const start=a.ctx.nodes.length;a.update({});assert.ok(a.ctx.nodes.length-start<100);assert.ok(a.nextNote>a.ctx.currentTime);});
test('music modes and rain transitions schedule finite, smoothed audio',()=>{const a=fixture();for(const mode of ['title','day','build','night','photo','quiet']){a.ctx.currentTime+=1;a.update({mode,night:mode==='night'?1:0,rain:true,hvac:3,speed:4});}assert.equal(a.rainG.gain._tgt,0.025);assert.ok(a.nextNote>a.ctx.currentTime);});
test('hidden document neither resumes the context nor adds effects',()=>{const a=fixture();document.hidden=true;a.ctx.state='suspended';const len=a.ctx.nodes.length;a.play('click');a.unlock();assert.equal(a.ctx.nodes.length,len);assert.equal(a.ctx.resumed,undefined);document.hidden=false;});
console.log(`${n} soft-audio checks passed`);
