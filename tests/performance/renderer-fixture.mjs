// GPU/canvas stubs for scene construction tests only.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export async function loadRenderer(base) {

const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : k === 'measureText' ? t => ({ width: String(t).length * 6 }) : /Gradient/.test(k) ? () => ({ addColorStop() {} }) : () => {}, set: (o,k,v) => (o[k]=v,true) });
globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
globalThis.window = { innerWidth: 393, innerHeight: 720, devicePixelRatio: 3 };
globalThis.matchMedia = () => ({ matches: true });
globalThis.MockWebGLRenderer = class { shadowMap = {}; setPixelRatio() {} setSize() {} };
// `base` is a committed renderer file (reproducible from a fresh clone) or, for ad-hoc use, a git revision.
let code = !base ? readFileSync('js/render.js','utf8') : /\.js$/.test(base) ? readFileSync(base,'utf8') : execFileSync('git',['show',base+':js/render.js'],{encoding:'utf8'});
code = code.replace("'./unitupgrades.js'", JSON.stringify(pathToFileURL(process.cwd()+'/js/unitupgrades.js').href));
code = code.replace("'three'", JSON.stringify(pathToFileURL(process.cwd()+'/vendor/three.module.min.js').href)).replace("'./data.js'",JSON.stringify(pathToFileURL(process.cwd()+'/js/data.js').href)).replace("'./comeback.js'",JSON.stringify(pathToFileURL(process.cwd()+'/js/comeback.js').href)).replace("'./status.js'",JSON.stringify(pathToFileURL(process.cwd()+'/js/status.js').href)).replace('new THREE.WebGLRenderer(', 'new globalThis.MockWebGLRenderer(');
// The visual module has browser import-map dependencies too. Resolve them in
// the CPU harness; this does not stub its scene-construction implementation.
if(code.includes("'./openhouse.js'")) {
 const visual=readFileSync('js/openhouse.js','utf8').replace("'three'",JSON.stringify(pathToFileURL(process.cwd()+'/vendor/three.module.min.js').href)).replace("'./data.js'",JSON.stringify(pathToFileURL(process.cwd()+'/js/data.js').href));
 code=code.replace("'./openhouse.js'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(visual).toString('base64')));
}
return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).Renderer;
}
