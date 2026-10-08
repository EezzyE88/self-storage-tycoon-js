#!/usr/bin/env python3
"""Run validation from a temporary source export with no Git history. Preserve full process logs."""
import argparse, concurrent.futures, hashlib, json, os, pathlib, shutil, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True, type=pathlib.Path)
parser.add_argument('--history', action='store_true', help='also run the exact Candidate 31 reproduction; requires Git history')
args = parser.parse_args()
results = []
with tempfile.TemporaryDirectory(prefix='sst-validation-') as tmp:
    export = pathlib.Path(tmp)
    for name in ('js', 'css', 'vendor', 'tests'):
        shutil.copytree(ROOT / name, export / name)
    # Exact archived Candidate 32 harness; only this derivative adds the disclosed timing injection.
    baseline = (export / 'tests/headless/fixtures/tsave_recovery-c32.mjs.txt').read_text()
    old = "g.autosave=async()=>localsave.put(await g.saveCode(),g.saveMeta());"
    assert baseline.count(old) == 1
    (export / 'tests/headless/save_original.mjs').write_text(baseline)
    delayed = baseline.replace(old, "g.autosave=async()=>{const code=await g.saveCode();await new Promise(r=>setTimeout(r,100));return localsave.put(code,g.saveMeta());};")
    (export / 'tests/headless/save_original_delay.mjs').write_text(delayed)
    def run(label, script, env=None, expected_failure=False, cwd=export):
        command = ['node', script]
        p = subprocess.run(command, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=180)
        matched = p.returncode == 0 if not expected_failure else p.returncode != 0 and '"Nothing was changed" only when byte-identical' in p.stderr
        print(('MATCH ' if matched else 'UNEXPECTED ')+label, flush=True)
        return dict(label=label, command=command, environment=env or {}, no_git=cwd == export, expected='timing assertion failure' if expected_failure else 'pass', exit_code=p.returncode, matched=matched, stdout=p.stdout, stderr=p.stderr)
    for i in range(4): results.append(run('original isolated '+str(i+1), 'tests/headless/save_original.mjs'))
    with concurrent.futures.ThreadPoolExecutor(4) as pool:
        results.extend(pool.map(lambda i: run('original concurrent '+str(i+1), 'tests/headless/save_original.mjs'), range(8)))
    results.append(run('original + injected 100ms', 'tests/headless/save_original_delay.mjs', expected_failure=True))
    for i in range(4): results.append(run('tracked isolated '+str(i+1), 'tests/headless/tsave_recovery.mjs'))
    with concurrent.futures.ThreadPoolExecutor(4) as pool:
        results.extend(pool.map(lambda i: run('tracked concurrent '+str(i+1), 'tests/headless/tsave_recovery.mjs'), range(8)))
    results.append(run('tracked double +100ms', 'tests/headless/tsave_recovery.mjs', {'SST_TEST_AUTOSAVE_DELAY_MS':'100'}))
    for delay in ('0', '100'):
        results.append(run('production autosave +'+delay+'ms', 'tests/headless/tsave_recovery.mjs', {'SST_TEST_PRODUCTION_AUTOSAVE':'1', 'SST_TEST_AUTOSAVE_DELAY_MS':delay}))
    for name in ('tsection32','tlayout_hierarchy','tmenu_touch','tc24_requests','tc27_availability','tc29_climate_bubbles','tsoft_audio','tclock24','tthreefloor_save','tguidance_banner','tvisual31','tfeedback_interactions'):
        results.append(run(name+' without Git', 'tests/headless/'+name+'.mjs'))
    if args.history: results.append(run('exact Candidate 31 historical reproduction', 'tests/headless/tsection32.mjs', {'SST_C31_HISTORY':'1'}, cwd=ROOT))
    for name in ('tsection32.mjs', 'tsave_recovery.mjs'):
        p = subprocess.run(['node','--check','tests/headless/'+name], cwd=export, capture_output=True,text=True)
        results.append(dict(label='syntax '+name,command=['node','--check','tests/headless/'+name],exit_code=p.returncode,matched=p.returncode==0,stdout=p.stdout,stderr=p.stderr))
report = dict(node=subprocess.check_output(['node','--version'],text=True).strip(), baseline_sha256=hashlib.sha256(baseline.encode()).hexdigest(), expected_outcomes=len(results), matched=sum(r['matched'] for r in results), results=results)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k != 'results'},indent=2))
for r in results:
    if not r['matched']: print('UNEXPECTED: '+r['label']+'\n'+r['stderr'])
raise SystemExit(0 if all(r['matched'] for r in results) else 1)
