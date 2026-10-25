import sys
sys.dont_write_bytecode=True
import importlib.util,json,pathlib,os,tempfile,subprocess,concurrent.futures
r=pathlib.Path('/workspace/scratch/40d3cb6a92ec/yard-numbering-repair');o=r.parent/('yard-numbering-validation-'+sys.argv[1]);assert not o.exists();o.mkdir()
s=importlib.util.spec_from_file_location('gate',r/'tests/headless/run_current_regressions.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
def hashes(p):return {str(f.relative_to(p)):g.digest(f.read_bytes()) for f in p.rglob('*') if f.is_file()}
prior=[r.parent/p for p in ['merge-validation-current','renderer-loader-validation-20261025','renderer-loader-validation-20261025-attempt2','performance-fixture-validation-20261025','floor-context-validation-20261025','menu-borrowing-validation-20261025','menu-borrowing-validation-20261025-attempt2','floor-price-validation-20261025','commissioning-b6-validation-20261025']];before={str(p):hashes(p) for p in prior}
sha=g.git(r,'rev-parse','HEAD').decode().strip();assert not g.git(r,'status','--porcelain').strip();node=os.environ['CODEX_PRIMARY_RUNTIME_NODE'];report={'scope':'tyard40 and tunitnumbering_parity only','source_commit':sha,'source_tree':g.git(r,'rev-parse','HEAD^{tree}').decode().strip(),'node':subprocess.check_output([node,'--version'],text=True).strip(),'limitations':['Native/disposable simulation/UI only; no browser or physical Safari acceptance.','Other regression entries not selected.'],'results':[]}
with tempfile.TemporaryDirectory(prefix='sst-yard-numbering-') as t:
 src=pathlib.Path(t)/'source';report['source_export']=g.export(r,sha,src)
 entries=[e for e in json.loads((src/'tests/headless/current-regressions.json').read_text())['profiles']['current'] if e['id'] in ['tyard40','tunitnumbering_parity']];assert len(entries)==2
 exports={};report['parent_exports']={}
 for parent in sorted({a.split(':',1)[1] for e in entries for a in e['command'] if a.startswith('@export:')}):
  exports[parent]=pathlib.Path(t)/parent;report['parent_exports'][parent]=g.export(r,parent,exports[parent],('js',))
 env={k:os.environ[k] for k in ['PATH','SYSTEMROOT','TMPDIR','TEMP','TMP','LANG'] if k in os.environ};env.update(GIT_DIR=g.git(r,'rev-parse','--absolute-git-dir').decode().strip(),PYTHONDONTWRITEBYTECODE='1')
 def run(entry):
  e=dict(entry);e['command']=[node if x=='@node' else x for x in e['command']]
  for obj in e.get('required_objects',[]):g.git(r,'cat-file','-e',obj)
  return g.run_entry(e,src,env,o,exports)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for row in pool.map(run,entries):report['results'].append(row);print(row['id'],row['status'],row['captured_stdout'][-1800:],row['captured_stderr'][:1500],flush=True)
 for row in report['results']:
  errors=g.verify_capture(row,o)
  if errors:row.update(status='ERROR',reason='; '.join(errors))
 report['export_changed_files']=[p for p,h in report['source_export']['files'].items() if not (src/p).exists() or g.digest((src/p).read_bytes())!=h]
report['prior_evidence_unchanged']=all(hashes(p)==before[str(p)] for p in prior);report['exit_code']=g.aggregate(report['results'])
(o/'results.json').write_text(json.dumps(report,indent=2)+'\n');(o/'prior-evidence-sha256.json').write_text(json.dumps(before,indent=2)+'\n');(o/'SUMMARY.txt').write_text('\n'.join(x['id']+': '+x['status']+' — '+x['reason'] for x in report['results'])+'\n')
print('Prior evidence unchanged:',report['prior_evidence_unchanged'],'Export changes:',report['export_changed_files']);assert report['prior_evidence_unchanged'] and not report['export_changed_files'];sys.exit(report['exit_code'])
