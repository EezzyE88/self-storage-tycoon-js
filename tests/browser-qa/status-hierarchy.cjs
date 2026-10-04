// node tests/browser-qa/status-hierarchy.cjs <playwright-package> <browser-executable> <output-dir>
// Local Chromium layout/input smoke checks; not physical Safari acceptance.
const {chromium}=require(process.argv[2]);
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[4]);fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const file=path.join(root,p==='/'?'index.html':p);const b=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(b)}catch{res.statusCode=404;res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__game);
await page.getByRole('button',{name:/Maple Street Tutorial/}).click();await page.evaluate(()=>{__game.sim.s.speed=0;__game.rend.todOverride=12});
for(const [w,h] of [[320,568],[393,852],[430,932],[568,320],[667,375],[852,393],[1024,768]]){
 await page.setViewportSize({width:w,height:h});
 for(const expanded of [false,true]){
  await page.evaluate(expanded=>{const ui=__game.ui;ui.setTab(expanded?'operate':null);ui.tutMin=!expanded;ui.renderTut(true)},expanded);await page.waitForTimeout(350);
  const r=await page.evaluate(()=>{const tut=document.querySelector('.tut').getBoundingClientRect(),sh=document.querySelector('.sheet')?.getBoundingClientRect(),body=document.querySelector('.sheet .body'),detail=document.querySelector('[data-a=tutMin]').getBoundingClientRect();if(body)body.scrollTop=350;return {w:innerWidth,h:innerHeight,tutorialHeight:tut.height,bodyHeight:body?.clientHeight,scrolls:body?body.scrollTop>0:null,overflow:document.documentElement.scrollWidth>innerWidth,overlap:!!sh&&tut.left<sh.right&&tut.right>sh.left&&tut.top<sh.bottom&&tut.bottom>sh.top,detailHeight:detail.height,detailWidth:detail.width}});
  assert.equal(r.overflow,false);assert.equal(r.overlap,false,JSON.stringify(r));assert.ok(r.detailHeight>=44&&r.detailWidth>=44);if(expanded){assert.ok(r.bodyHeight>=80);assert.ok(r.scrolls)}results.push({...r,expanded});
  await page.screenshot({path:path.join(out,`${w}x${h}-${expanded?'details':'compact'}.png`)});
 }
}
await page.setViewportSize({width:320,height:568});
await page.evaluate(()=>{__game.ui.setTab('operate');const el=document.querySelector('.status-key');el.open=true;document.querySelector('.sheet .body').scrollTop=100;const nav=document.querySelector('.section-shortcuts');nav.scrollLeft=150;__game.ui.renderSheet(true)});
assert.ok(await page.locator('.status-key').evaluate(e=>e.open));assert.ok(await page.locator('.section-shortcuts').evaluate(e=>e.scrollLeft>0));
// Real browser events: a touch on the unobstructed map then double-tap zoom.
await page.evaluate(()=>{const g=__game;g.sim.s.tut.on=false;g.sim.s.tut.done=true;g.ui.setTab(null);g.ui.renderTut(true);g.ui.renderCoach();});
const zoom=await page.evaluate(()=>__game.rend.zoom);await page.touchscreen.tap(180,350);await page.touchscreen.tap(180,350);await page.waitForTimeout(400);assert.ok(await page.evaluate(z=>__game.rend.zoom>z,zoom));
// Exact suggested construction still produces review without spending.
const placement=await page.evaluate(()=>{const g=__game;g.newGame('maple');g.sim.s.speed=0;g.sim.s.tut.beat=4;g.sim.s.tut.idMark=Math.max(...Object.keys(g.sim.s.objects).map(Number));g.ui.setTab('build');g.ui.cat='units';g.ui.tool='du10x10';g.ui.renderTut(true);const before=g.sim.s.cash;const plan=g.ui.currentBlueprintPlan();if(!plan)return {skipped:true};g.ui.suggestPlacement();return {tool:g.ui.tool,cashUnchanged:g.sim.s.cash===before,review:!!document.querySelector('[data-a=confirm]')}});
assert.ok(!placement.skipped);assert.ok(placement.cashUnchanged);assert.ok(placement.review);
// Property switch must refresh presentation from the new simulation.
const switched=await page.evaluate(async()=>{const g=__game,{makeMaple}=await import('/js/maple.js');g.ui.tool=null;const other=makeMaple(123);other.s.speed=0;g.company.props.push({name:'QA second property',sim:other});g.switchProperty(1);g.rend.frame(.016);return g.rend.sim===other&&g.ui.sim===other});assert.ok(switched);
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:'Installed Edge / Chromium headless; touch emulation',layouts:results,checks:{statusDetailsPersist:true,shortcutScrollPersists:true,doubleTap:true,placement,propertySwitch:switched},errors},null,2));console.log('PASS 14 layout states, status/shortcut persistence, browser double-tap, placement review, property switch; no page errors');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
