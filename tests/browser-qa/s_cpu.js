module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:1}); });
  await p.waitForTimeout(3000);
  const c = await p.context().newCDPSession(p);
  await c.send('Profiler.enable'); await c.send('Profiler.start');
  await p.waitForTimeout(4000);
  const { profile } = await c.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map(n=>[n.id,n]));
  const dt = profile.timeDeltas; const counts = new Map();
  profile.samples.forEach((id,i)=>counts.set(id,(counts.get(id)||0)+(dt[i]||0)));
  for (const [id,t] of counts) { const n=byId.get(id); const k=n.callFrame.functionName+' '+n.callFrame.url.split('/').pop()+':'+n.callFrame.lineNumber; self.set(k,(self.get(k)||0)+t); }
  const top=[...self].sort((a,b)=>b[1]-a[1]).slice(0,18); for (const [k,t] of top) log((t/1000).toFixed(0)+'ms', k);
};
