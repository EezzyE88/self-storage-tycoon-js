import sys
sys.dont_write_bytecode=True
import pathlib,subprocess,json,os,tempfile,importlib.util,hashlib
r=pathlib.Path('/workspace/scratch/40d3cb6a92ec/payback-cutoff-repair');base=r.parent;focus=base/'payback-cutoff-focused-20261025';full=base/'payback-cutoff-full-20261025';assert not focus.exists() and not full.exists();focus.mkdir()
s=importlib.util.spec_from_file_location('gate',r/'tests/headless/run_current_regressions.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
def hashes(p):return {str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in p.rglob('*') if f.is_file()}
prior=hashes(r/'docs/qa');(focus/'prior-evidence-sha256.json').write_text(json.dumps(prior,indent=2)+'\n')
assert not g.git(r,'status','--porcelain').strip();sha=g.git(r,'rev-parse','HEAD').decode().strip();assert not g.git(r,'diff','4e4afde','HEAD','--','js','css','vendor','index.html')
node=os.environ['CODEX_PRIMARY_RUNTIME_NODE'];report={'scope':'tbplus_payback only; full 12-case operator unchanged','source_commit':sha,'node':subprocess.check_output([node,'--version'],text=True).strip()}
with tempfile.TemporaryDirectory(prefix='sst-payback-cutoff-') as t:
 src=pathlib.Path(t)/'source';report['source_export']=g.export(r,sha,src)
 e=dict(next(e for e in json.loads((src/'tests/headless/current-regressions.json').read_text())['profiles']['current'] if e['id']=='tbplus_payback'));e['command']=[node if x=='@node' else x for x in e['command']]
 env={k:os.environ[k] for k in ['PATH','LANG','TMPDIR','TEMP','TMP'] if k in os.environ};env.update(GIT_DIR=g.git(r,'rev-parse','--absolute-git-dir').decode().strip(),PYTHONDONTWRITEBYTECODE='1')
 print('Starting focused payback test against '+sha,flush=True)
 row=g.run_entry(e,src,env,focus);assert not g.verify_capture(row,focus);report['results']=[row];report['export_changed_files']=[p for p,h in report['source_export']['files'].items() if not (src/p).exists() or g.digest((src/p).read_bytes())!=h]
report['prior_evidence_unchanged']=hashes(r/'docs/qa')==prior;report['exit_code']=g.aggregate(report['results']);(focus/'results.json').write_text(json.dumps(report,indent=2)+'\n');(focus/'SUMMARY.txt').write_text(row['status']+' tbplus_payback — '+row['reason']+'\n'+row['captured_stdout']+row['captured_stderr'])
print('Focused:',row['status'],flush=True);assert report['prior_evidence_unchanged'] and not report['export_changed_files']
if report['exit_code']:sys.exit(report['exit_code'])
print('Starting full current gate against the same exact commit.',flush=True)
p=subprocess.run([sys.executable,str(r/'tests/headless/run_current_regressions.py'),'--profile','current','--ref',sha,'--output',str(full)],cwd=r)
assert hashes(r/'docs/qa')==prior
print('Prior evidence unchanged after both runs.',flush=True);sys.exit(p.returncode)
