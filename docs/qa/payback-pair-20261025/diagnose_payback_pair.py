from pathlib import Path
import subprocess,json,hashlib,tarfile,io,os,concurrent.futures,time
repo=Path('/workspace/scratch/40d3cb6a92ec/yard-numbering-repair');out=repo.parent/'payback-pair-20261025';assert not out.exists();out.mkdir()
def git(*args):return subprocess.check_output(['git',*args],cwd=repo)
def sha(b):return hashlib.sha256(b).hexdigest()
source=git('show','HEAD:tests/headless/tbplus_payback.mjs');(out/'original-tbplus_payback.mjs').write_bytes(source)
operator=source.decode().split("const results = ['infill'",1)[0]
report={'operator_sha256':sha(operator.encode()),'original_test_sha256':sha(source),'scope':'complete6, seed 4401 only; unmodified operator; each run stops at its own payback or original horizon','results':[]}
refs=['b89d711c9a89ce49229fae5888c1d94b7b1666d4','6e278d65d5ed5de6a5bf24e5daa36df857f0dda6']
for ref in refs:
 assert git('show',ref+':tests/headless/tbplus_payback.mjs')==source
 data=git('archive',ref);dest=out/ref[:7];dest.mkdir()
 with tarfile.open(fileobj=io.BytesIO(data)) as t:t.extractall(dest,filter='data')
 code=operator+"const result=run('complete6',4401);\nconsole.log('DIAGNOSTIC_RESULT '+JSON.stringify({...result,benchmarkOver18:result.monthsFromCommit==null||result.monthsFromCommit>18}));\n"
 (dest/'tests/headless/payback-diagnostic.mjs').write_text(code)
 report.setdefault('sources',[]).append({'commit':ref,'tree':git('rev-parse',ref+'^{tree}').decode().strip(),'archive_sha256':sha(data),'diagnostic_sha256':sha(code.encode()),'inventory':{str(p.relative_to(dest)):sha(p.read_bytes()) for p in dest.rglob('*') if p.is_file()}})
node=os.environ['CODEX_PRIMARY_RUNTIME_NODE'];report['node']=subprocess.check_output([node,'--version'],text=True).strip()
def run(ref):
 dest=out/ref[:7];start=time.monotonic();env={k:os.environ[k] for k in ['PATH','LANG','TMPDIR','TEMP','TMP'] if k in os.environ}
 p=subprocess.run([node,'tests/headless/payback-diagnostic.mjs'],cwd=dest,env=env,capture_output=True,timeout=180)
 (out/(ref[:7]+'.stdout.log')).write_bytes(p.stdout);(out/(ref[:7]+'.stderr.log')).write_bytes(p.stderr)
 result={'commit':ref,'exit':p.returncode,'seconds':round(time.monotonic()-start,2),'stdout_sha256':sha(p.stdout),'stderr_sha256':sha(p.stderr)}
 if p.returncode==0:result.update(json.loads(p.stdout.decode().split('DIAGNOSTIC_RESULT ',1)[1]))
 before=next(x for x in report['sources'] if x['commit']==ref)['inventory'];result['export_changed_files']=[f for f,h in before.items() if sha((dest/f).read_bytes())!=h]
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for result in pool.map(run,refs):report['results'].append(result);print(json.dumps(result),flush=True)
(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
