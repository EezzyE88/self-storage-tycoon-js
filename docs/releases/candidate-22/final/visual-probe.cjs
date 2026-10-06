// Visual measurement harness (headless Chromium device emulation; NOT Safari, NOT a physical iPhone).
// Setup disclosed: Maple, tutorial off, cash 1e6, build-up lesson state set directly, construction fast-forwarded by
// sim.step(), generated customer requests cleared. Builds use sim.dispatch (the same command the Confirm button sends).
const pw=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright');
const [,,URL,OUT,LABEL]=process.argv;require('fs').mkdirSync(OUT,{recursive:true});
const MEASURE=()=>{const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};};const hit=(a,c)=>a.l<c.r&&c.l<a.r&&a.t<c.b&&c.t<a.b;
  const texts=[...document.querySelectorAll('#blueprint text')].filter(t=>t.textContent).map(t=>({n:t.textContent,...R(t)}));const ov=[];
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++)if(hit(texts[i],texts[j]))ov.push(texts[i].n+' × '+texts[j].n);
  const ui=__game.ui,obs=[...document.querySelectorAll('.hud > *, #speed, .viewctl, #tut .tut, #tabs, #guide:not([hidden])')].map(e=>({n:e.id||e.className.split(' ')[0],...R(e)})).filter(o=>o.r>o.l);
  const under=[];for(const t of texts)for(const o of obs)if(hit(t,o))under.push(t.n+' under '+o.n);
  const sr=ui.safeRect();const polys=[...document.querySelectorAll('#blueprint polygon')].map(R);const shell=polys[0];
  const inside=!!shell&&shell.l>=sr.left-1&&shell.r<=sr.right+1&&shell.t>=sr.top-1&&shell.b<=sr.bottom+1;
  const g=document.querySelector('#guide');return {tut:document.querySelector('#tut').innerText.replace(/\s+/g,' ').trim().slice(0,80),ring:g&&!g.hidden?g.innerText:null,captions:texts.map(t=>t.n),overlaps:ov,underUi:under,placeHere:texts.some(t=>/Place here/.test(t.n)),safe:sr,shell,shellInsideSafe:inside,zoom:+__game.rend.zoom.toFixed(3),speed:__game.sim.s.speed};};
async function run(w,h,phase){const b=await pw.chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const phone=Math.min(w,h)<600;
 const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_/.test(m.text()))errs.push(m.text());});
 await p.addInitScript(()=>window.addEventListener('unhandledrejection',e=>console.error('unhandledrejection '+(e.reason&&e.reason.message||e.reason))));
 await p.goto(URL);await p.waitForFunction(()=>window.__game&&__game.ui);
 await p.evaluate(()=>{const g=__game;g.newGame('maple');g.ui.title=false;g.ui.closeModal();const s=g.sim.s;s.tut.on=false;s.tut.done=true;s.cash=1e6;s.open=true;});
 await p.evaluate(async(phase)=>{const g=__game,sim=g.sim,s=sim.s,B=await import('./js/blueprint.js');s.open=false;s.speed=0;s.lesson={id:'up',idMark:s.nextId,built:[],flags:{},entered:true};
  const L=()=>B.verticalLayout(sim),bd=k=>sim.dispatch({type:'build',...L().plans[k]}).ok,settle=()=>{for(let i=0;i<20000&&s.orders.some(o=>o.st==='construction');i++){s.t++;sim.step();sim.events.length=0;}s.convos.length=0;};
  bd('aisle');bd('shell2');settle();for(const k of ['hall','doorWide','loading','hall2'])bd(k);if(phase==='place')settle();if(phase==='wait')bd('elevator');s.convos.length=0;s.speed=0;g.ui.renderFeed(true);g.ui.renderTut(true);},phase);
 const fr=async()=>{await p.evaluate(()=>{const g=__game;for(let i=0;i<6;i++){g.rend.frame(1/30);g.ui.update(1/30);}});await p.waitForTimeout(300);};await fr();await fr();
 const out={w,h,phase,initial:await p.evaluate(MEASURE)};await p.screenshot({path:`${OUT}/${LABEL}-${phase}-${w}x${h}.png`});
 // Normal player camera movement: drag the map, then pinch-zoom in, re-measuring each time (no re-framing expected).
 await p.evaluate(()=>{__game.rend.pan(-70,-40);});await fr();out.afterPan=await p.evaluate(MEASURE);
 await p.evaluate(()=>{__game.rend.zoomAt(innerWidth/2,innerHeight/2,1.5);});await fr();out.afterZoom=await p.evaluate(MEASURE);await p.screenshot({path:`${OUT}/${LABEL}-${phase}-${w}x${h}-zoomed.png`});
 out.errs=errs;await b.close();return out;}
(async()=>{const all=[];for(const [w,h] of [[393,659],[430,932],[1280,720]])for(const ph of ['place','wait']){try{all.push(await run(w,h,ph));}catch(e){all.push({w,h,phase:ph,error:e.message});}}
 require('fs').writeFileSync(`${OUT}/${LABEL}-measurements.json`,JSON.stringify(all,null,1));
 for(const o of all){if(o.error){console.log(o.w+'x'+o.h,o.phase,'ERROR',o.error);continue;}const f=m=>`ov=${m.overlaps.length} underUi=${m.underUi.length} placeHere=${m.placeHere} inside=${m.shellInsideSafe}`;console.log(`${LABEL} ${o.w}x${o.h} ${o.phase} | ${f(o.initial)} | pan: ${f(o.afterPan)} | zoom: ${f(o.afterZoom)} | caps: ${o.initial.captions.join(' / ')} | errs ${o.errs.length}`);}})();
