// Existing offline production-render capture method; no preview server or live storage.
// Usage: SST_ART_BROWSER=/path/chrome-headless-shell node ... BASE FIXTURE OUT
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(process.argv[2]),fixture=fs.readFileSync(process.argv[3]),out=path.resolve(process.argv[4]);fs.mkdirSync(out,{recursive:true});
(async()=>{const results={environment:'Actual production game, Chromium software WebGL, 390x844 CSS pixels, DPR2. Not Safari or physical iPhone acceptance.',screens:{}};
for(const [label,root] of [['before',base],['after',process.cwd()]]){
const browser=await chromium.launch({executablePath:process.env.SST_ART_BROWSER,args:['--single-process','--no-zygote','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='sst-work.test')return route.abort();if(u.pathname==='/test-state.json')return route.fulfill({contentType:'application/json',body:fixture});const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:''});const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(f)]||'application/octet-stream';return route.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.goto('http://sst-work.test/');await page.waitForFunction(()=>window.__game);
await page.evaluate(async()=>{const {Sim}=await import('/js/sim.js');const sm=new Sim(await(await fetch('/test-state.json')).json());sm.s.speed=0;sm.s.lesson=null;sm.s.lessonOffer=null;const g=__game;g.autoQ=false;g.company={props:[{name:'The Comeback Yard',sim:sm}],active:0,feed:[]};g.attach(sm,'report-render');g.ui.title=false;g.ui.closeModal();g.ui.scMin=true;g.ui.tutMin=true;g.ui.setView('ext');g.ui.setTab('operate');g.ui.update(.2);g.rend.todOverride=12;g.rend.frame(.016);});
await page.waitForTimeout(600);await page.screenshot({path:path.join(out,label+'.png')});
results.screens[label]=await page.evaluate(()=>{const card=document.querySelector('.working-yard'),body=document.querySelector('.sheet .body');return {build:__game.BUILD.name,text:card?.innerText||null,card:card?.getBoundingClientRect().toJSON(),body:body?.getBoundingClientRect().toJSON(),horizontalOverflow:body.scrollWidth>body.clientWidth};});assert.equal(results.screens[label].horizontalOverflow,false);
if(label==='after'){
assert.ok(results.screens.after.text.includes('Payroll accrued'));assert.ok(results.screens.after.card.bottom<=results.screens.after.body.bottom,'summary fits visible sheet');
const proof=await page.evaluate(async()=>{const g=__game,report=JSON.stringify(g.sim.s.workReport);const code=await g.saveCode(),p=await g.prepareLoad(code);if(!p.ok)throw Error(p.msg);g.applyLoad(p);return {reportMatches:report===JSON.stringify(g.sim.s.workReport),rescue:g.sim.s.scenario.status,ack:g.sim.s.scenario.acknowledged};});assert.equal(proof.reportMatches,true);results.saveCode=proof;
await page.locator('[data-a="workingNext"]').click();results.next=await page.evaluate(()=>__game.ui.tab);assert.equal(results.next,'growth');
}
assert.deepEqual(errors,[]);results.screens[label].pageErrors=errors;await browser.close();
}
fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
