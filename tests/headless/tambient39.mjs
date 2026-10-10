import assert from 'node:assert/strict';
const {Audio} = await import(process.env.SST_AUDIO_BASELINE || '../../js/audio.js');
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
  suspend(){this.state='suspended';this.onstatechange?.();return Promise.resolve();}
  resume(){this.resumed=true;this.state='running';this.onstatechange?.();return Promise.resolve();}
}
globalThis.window={AudioContext:Context};globalThis.document={hidden:false};
const realSet=setTimeout,realClear=clearTimeout;let next=0;const timers=new Map();globalThis.setTimeout=(fn,ms)=>{timers.set(++next,{fn,ms});return next};globalThis.clearTimeout=id=>timers.delete(id);
const tick=(a)=>{a.ctx.currentTime+=.08;for(const [id,{fn}] of [...timers]){timers.delete(id);fn()}};
const fixture=()=>{const a=new Audio();a.unlock();a.setVol('sfx',0);a.setVol('music',0);a.update({hvac:3,rain:true});return a};let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS '+name)};
if(process.env.SST_REPRODUCE_38){const a=fixture(),sources=a.ctx.nodes.filter(x=>x.loop||x.kind==='oscillator');assert.equal(sources.length,3);a.setBackground(true);assert.ok(sources.every(x=>x.stopped===undefined));assert.ok(sources.every(x=>!x.disconnected));assert.ok(a.master.gain.calls.some(x=>x[0]==='set'&&x[1]===0&&x[2]===a.ctx.currentTime));console.log('REPRODUCED 38: three ambient sources survive suspension; master gain cuts immediately');process.exit(0)}
test('ambient-only suspension fades then stops and disconnects every loop',()=>{const a=fixture(),c=a.ctx,sources=[...a.ambientSources],nodes=[...a.ambientNodes],initial=c.currentTime;a.master.gain.calls=[];a.setBackground(true);assert.equal(c.state,'running');assert.ok(a.master.gain.calls.some(x=>x[0]==='target'&&x[1]===0&&x[3]===.01));assert.ok(a.master.gain.calls.some(x=>x[0]==='set'&&x[1]===0&&x[2]===initial+.08));assert.ok(!a.master.gain.calls.some(x=>x[0]==='set'&&x[1]===0&&x[2]===initial));tick(a);assert.equal(c.state,'suspended');assert.equal(a.ambientSources.length,0);assert.ok(sources.every(x=>x.stopped===c.currentTime));assert.ok(nodes.every(x=>x.disconnected));});
test('hidden/direct paths do not create ambient or one-shot sources',()=>{const a=fixture();a.setBackground(true);tick(a);const len=a.ctx.nodes.length;for(let i=0;i<20;i++){a.startAmbience();a.update({});a.play('attention');a.tone(58,.2);a.noise(.2);a.unlock()}assert.equal(a.ctx.nodes.length,len);});
test('resume creates one fresh graph starting from zero, then smooths world gains',()=>{const a=fixture(),old=[...a.ambientNodes];a.setBackground(true);tick(a);a.setBackground(false);a.ctx.state='running';a.update({rain:true,hvac:3});assert.equal(a.ambientSources.length,3);assert.ok(a.ambientNodes.every(x=>!old.includes(x)));for(const g of [a.ambG,a.humG,a.rainG]){assert.equal(g.gain.value,0);assert.ok(g.gain.calls.some(x=>x[0]==='target'))}const len=a.ctx.nodes.length;for(let i=0;i<50;i++)a.update({rain:true,hvac:3});assert.equal(a.ctx.nodes.length,len);});
test('Safari interruption without visibility event disposes loops',()=>{const a=fixture(),old=[...a.ambientNodes];a.ctx.state='interrupted';a.ctx.onstatechange();assert.ok(old.every(x=>x.disconnected));assert.equal(a.ambientSources.length,0);a.update({});assert.equal(a.ambientSources.length,0);});
test('rapid return cancels delayed suspension and stale scheduled mute',()=>{const a=fixture();a.setBackground(true);a.setBackground(false);a.unlock();a.update({});tick(a);assert.equal(a.ctx.state,'running');assert.equal(a.master.gain._tgt,a.vol.master);assert.equal(a.ambientSources.length,3);});
test('repeated hidden notifications do not extend release or duplicate cleanup',()=>{const a=fixture();a.setBackground(true);assert.equal(timers.size,1);a.setBackground(true);assert.equal(timers.size,1);tick(a);a.setBackground(true);assert.equal(timers.size,0);});
test('volume preferences survive resume and Ambience off remains off',()=>{const a=fixture();a.setVol('master',.6);a.setVol('amb',0);a.setBackground(true);tick(a);a.setBackground(false);a.ctx.state='running';a.unlock();a.update({rain:true,hvac:3});assert.equal(a.vol.master,.6);assert.equal(a.vol.amb,0);assert.equal(a.amb.gain._tgt,0);});
test('twenty cycles retain only one connected ambient graph',()=>{const a=fixture();for(let i=0;i<20;i++){a.setBackground(true);tick(a);a.setBackground(false);a.ctx.state='running';a.unlock();a.update({})}assert.equal(a.ambientSources.length,3);assert.equal(a.ctx.nodes.filter(x=>(x.loop||x.kind==='oscillator')&&!x.disconnected).length,3);});
const a=fixture();a.setBackground(true);tick(a);a.setBackground(false);let resolve;a.ctx.resume=()=>new Promise(r=>resolve=r);a.unlock();a.setBackground(true);a.ctx.state='running';resolve();await Promise.resolve();assert.equal(a.ctx.state,'suspended');assert.equal(a.ambientSources.length,0);console.log('PASS resume/background promise race stays silent');n++;
globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;console.log(n+' ambient lifecycle groups passed');
