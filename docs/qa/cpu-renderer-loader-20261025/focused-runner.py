import sys
sys.dont_write_bytecode=True
import importlib.util,json,os,pathlib,tempfile,concurrent.futures,shutil,subprocess,hashlib
root=pathlib.Path('/workspace/scratch/40d3cb6a92ec/renderer-loader-repair')
out=pathlib.Path('/workspace/scratch/40d3cb6a92ec/renderer-loader-validation-20261025-attempt2')
prior=pathlib.Path('/workspace/scratch/40d3cb6a92ec/merge-validation-current')
assert not out.exists(), 'new evidence directory required'
out.mkdir()
spec=importlib.util.spec_from_file_location('gate',root/'tests/headless/run_current_regressions.py');gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
def hashes(p):return {str(f.relative_to(p)):gate.digest(f.read_bytes()) for f in p.rglob('*') if f.is_file()}
prior_hashes=hashes(prior)
previous=json.loads((prior/'results.json').read_text());ids=[r['id'] for r in previous['results'] if r['status']=='ERROR'];assert len(ids)==18
assert not gate.git(root,'status','--porcelain').strip()
sha=gate.git(root,'rev-parse','HEAD').decode().strip();gitdir=gate.git(root,'rev-parse','--absolute-git-dir').decode().strip();node=os.environ.get('CODEX_PRIMARY_RUNTIME_NODE') or shutil.which('node')
report={'scope':'18 previously errored entries only; not the full current gate','source_commit':sha,'source_tree':gate.git(root,'rev-parse','HEAD^{tree}').decode().strip(),'previous_source':previous['source_commit'],'node':subprocess.check_output([node,'--version'],text=True).strip(),'results':[],'limitations':['CPU scene graphs / stubbed GPU only; no rendered browser or physical Safari acceptance.','Other 77 current-gate entries were not rerun.']}
with tempfile.TemporaryDirectory(prefix='sst-renderer-subset-') as td:
 temp=pathlib.Path(td);source=temp/'source';report['source_export']=gate.export(root,sha,source)
 manifest=json.loads((source/'tests/headless/current-regressions.json').read_text());entries=[e for e in manifest['profiles']['current'] if e['id'] in ids];assert len(entries)==18
 exports={};report['parent_exports']={}
 for parent in sorted({a.split(':',1)[1] for e in entries for a in e['command'] if a.startswith('@export:')}):
  exports[parent]=temp/parent;report['parent_exports'][parent]=gate.export(root,parent,exports[parent],('js',))
 env={k:os.environ[k] for k in ['PATH','SYSTEMROOT','TMPDIR','TEMP','TMP','LANG'] if k in os.environ};env.update(GIT_DIR=gitdir,PYTHONDONTWRITEBYTECODE='1')
 def run(entry):
  e=dict(entry);e['command']=[node if a=='@node' else sys.executable if a=='@python' else a for a in e['command']]
  for obj in e.get('required_objects',[]):gate.git(root,'cat-file','-e',obj)
  return gate.run_entry(e,source,env,out,exports)
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for row in pool.map(run,entries):report['results'].append(row);print(row['status'],row['id'],flush=True)
 for row in report['results']:
  errors=gate.verify_capture(row,out)
  if errors:row.update(status='ERROR',reason='; '.join(errors))
 report['export_changed_files']=[p for p,h in report['source_export']['files'].items() if not (source/p).exists() or gate.digest((source/p).read_bytes())!=h]
report['prior_evidence_unchanged']=hashes(prior)==prior_hashes
report['counts']={k:sum(r['status']==k for r in report['results']) for k in ['PASS','FAIL','ERROR','BLOCKED','TIMEOUT']}
report['selected']=len(entries);report['attempted']=gate.attempted_count(report['results']);report['exit_code']=gate.aggregate(report['results']);report['complete']=True
report['production_export_unchanged']=not [p for p in report['export_changed_files'] if not p.startswith(('tests/','docs/'))]
(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'prior-evidence-sha256.json').write_text(json.dumps(prior_hashes,indent=2)+'\n')
summary=json.dumps(report['counts'])+'\n'+'\n'.join(r['id']+': '+r['status']+' — '+r['reason'] for r in report['results'])+'\n'
(out/'SUMMARY.txt').write_text(summary);print(summary,flush=True)
sys.exit(report['exit_code'])
