// Disposable intercepted origin; natural scheduled Maple visitors, no synthetic agents/routes.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),out=path.resolve(process.argv[2]||'/workspace/sst-evidence');fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
for(const [width,height] of [[375,667],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='sst-lab.test')return route.abort();
  const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'}[path.extname(f)]||'application/octet-stream';
  return route.fulfill({body:fs.readFileSync(f),contentType:mime});
 });
 await page.goto('http://sst-lab.test/?visualLab');await page.waitForFunction(()=>window.__game);
 const setup=await page.evaluate(async()=>{
  const {makeMaple}=await import('/js/maple.js');const g=__game,sm=makeMaple(4401);
  // Test-only operating-company fixture: bypass tutorial prompts, leave all visits/routes intact.
  sm.s.mode='sandbox';sm.s.tut={on:false,done:true,beat:99,flags:{}};sm.s.open=true;
  g.company={props:[{name:'Maple Street Storage',sim:sm}],active:0,feed:[]};g.attach(sm,'visual-lab-test');g.ui.closeModal();g.ui.tutMin=true;g.ui.setTab(null);
  let steps=0,a;
  for(;steps<2880;steps++) {sm.step();sm.events.length=0;a=sm.s.agents.find(a=>a.kind==='cust'&&!a.hidden&&a.unit&&sm.s.objects[a.unit]?.access==='interior'&&a.st==='walk'&&a.x>13&&a.y<10.5);if(a)break;}
  if(!a)throw Error('No naturally scheduled interior visitor reached');
  sm.s.speed=0;g.ui.update(.016);g.rend.setView(0);g.ui.syncFloorUi();g.rend.todOverride=12;g.rend.weatherOverride='clear';g.rend.frame(.016);g.visualLab.update();
  window.__labAgent=a.id;
  return {steps,t:sm.s.t,agent:structuredClone(a),vehicle:structuredClone(sm.s.vehicles.find(v=>v.id===a.veh))};
 });
 await page.waitForTimeout(120);
 const original=await page.evaluate(()=>{const g=__game,r=g.rend;r.center.set(20,0,10);r.zoom=1.45;r.updateCamera();r.r.info.autoReset=false;r.r.info.reset();r.frame(.016);g.visualLab.update();window.__labState=JSON.stringify(g.sim.s);window.__labMaterials=Object.fromEntries(Object.entries(r.mat).filter(([k,m])=>m.color).map(([k,m])=>[k,[m.color.getHex(),m.roughness]]));return {calls:r.r.info.render.calls,triangles:r.r.info.render.triangles,geometries:r.r.info.memory.geometries,textures:r.r.info.memory.textures};});
 await page.screenshot({path:`${out}/${width}-original.png`});
 await page.locator('#visual-lab summary').tap();await page.locator('#visual-lab button').first().tap();
 const experiment=await page.evaluate(()=>{const g=__game;g.rend.r.info.reset();g.rend.frame(.016);return {sameState:window.__labState===JSON.stringify(g.sim.s),enabled:g.visualLab.lab.enabled,calls:g.rend.r.info.render.calls,triangles:g.rend.r.info.render.triangles,geometries:g.rend.r.info.memory.geometries,textures:g.rend.r.info.memory.textures,visit:g.visualLab.lab.currentVisit()};});
 assert.equal(experiment.sameState,true);assert.equal(experiment.enabled,true);
 await page.locator('#visual-lab summary').tap();await page.screenshot({path:`${out}/${width}-experimental.png`});
 const checks=await page.evaluate(()=>{const g=__game,r=g.rend,lab=g.visualLab.lab;
  const saved=g.saveJSON(),storage=JSON.stringify({...localStorage});const before=JSON.stringify(g.sim.s);r.rebuildStatic();r.frame(.016);if(r.mat.roof.color.getHexString()!=='366b70')throw Error('rebuild palette');
  lab.setEnabled(false);r.frame(.016);const mats=Object.fromEntries(Object.entries(r.mat).filter(([k,m])=>m.color).map(([k,m])=>[k,[m.color.getHex(),m.roughness]]));
  const restore=JSON.stringify(mats)===JSON.stringify(window.__labMaterials),paused=before===JSON.stringify(g.sim.s)&&g.sim.s.speed===0;const storageUnchanged=storage===JSON.stringify({...localStorage}),saveUnchanged=saved===g.saveJSON();
  // Continue the exact observed visit, then use normal UI Pause/resume (which legitimately autosave).
  lab.setEnabled(true);g.sim.s.speed=1;const t=g.sim.s.t;for(let i=0;i<15;i++)g.sim.step();g.sim.events.length=0;r.frame(.016);g.visualLab.update();
  const resumed=g.sim.s.t===t+15;const active=JSON.stringify(g.sim.s);lab.setEnabled(false);lab.setEnabled(true);if(active!==JSON.stringify(g.sim.s))throw Error('running toggle wrote state');g.ui.requestSpeed(0);lab.setEnabled(false);lab.setEnabled(true);const manualPause=g.sim.s.speed===0;g.ui.requestSpeed(1);const manualResume=g.sim.s.speed===1;
  r.setOverlay('clean');r.zoomBy(1.1);r.frame(.016);const overlay=r.overlay==='clean';r.setOverlay(null);
  lab.setEnabled(false);g.visualLab.update();return {restore,paused,resumed,overlay,manualPause,manualResume,storageUnchanged,saveUnchanged,visitAfter:lab.currentVisit()};
 });
 for(const v of ['restore','paused','resumed','overlay','manualPause','manualResume','storageUnchanged','saveUnchanged'])assert.equal(checks[v],true,v);
 const rect=await page.locator('#visual-lab summary').boundingBox();assert.ok(rect.height>=44&&rect.x>=0&&rect.x+rect.width<=width);
 await page.locator('#visual-lab summary').tap();await page.locator('#visual-lab button').first().tap();await page.screenshot({path:`${out}/${width}-controls.png`});const keySpeed=await page.evaluate(()=>__game.sim.s.speed);await page.locator('#visual-lab button').first().press('Space');await page.locator('#visual-lab button').first().press('Enter');assert.equal(await page.evaluate(()=>__game.sim.s.speed),keySpeed,'keyboard toggle preserves speed');const reset=await page.evaluate(()=>{const g=__game,sim=g.sim;g.attach(sim,'lab-reset');g.visualLab.update();return !g.visualLab.lab.enabled;});assert.equal(reset,true);await page.locator('#visual-lab summary').tap();await page.locator('#visual-lab button').first().tap();await page.locator('[data-close]').tap();assert.equal(await page.locator('#visual-lab').count(),0);
 const cleanup=await page.evaluate(()=>__game.rend.mat.roof.color.getHex());assert.equal(cleanup,0x2f8a8f);assert.deepEqual(errors,[]);results.push({width,height,setup,original,experiment,checks,rect,errors});await ctx.close();
}
const normal=await browser.newPage();await normal.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='sst-normal.test')return route.abort();const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(f),contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'}[path.extname(f)]||'application/octet-stream'});});await normal.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await normal.goto('http://sst-normal.test/');await normal.waitForFunction(()=>window.__game);assert.equal(await normal.evaluate(()=>!!__game.visualLab||!!document.querySelector('#visual-lab')),false);await browser.close();fs.writeFileSync(out+'/browser.json',JSON.stringify(results,null,2));console.log('PASS browser A/B, Pause, rebuild, resume, restore, overlay, zoom, touch controls and close at both sizes');
})().catch(e=>{console.error(e);process.exit(1)});
