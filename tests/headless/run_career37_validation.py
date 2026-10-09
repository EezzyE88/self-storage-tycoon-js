#!/usr/bin/env python3
"""Comeback-to-career candidate regressions with complete captured logs and exit statuses."""
import argparse, concurrent.futures, io, json, os, pathlib, subprocess, tarfile, tempfile
root = pathlib.Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('--output', required=True, type=pathlib.Path)
args = p.parse_args()
baseline = tempfile.TemporaryDirectory(prefix='sst-candidate36-')
archive = subprocess.check_output(['git', 'archive', '0c8ffcacc8ceb974c890d97d2a9c611b89f6ea24'], cwd=root)
with tarfile.open(fileobj=io.BytesIO(archive)) as tf: tf.extractall(baseline.name, filter='data')
node = os.environ.get('CODEX_PRIMARY_RUNTIME_NODE', 'node')
scripts = ['tfeedback35', 'tfeedback35_equivalence', 'treporting34', 'treporting34_equivalence', 'tclimate33', 'tsection32',
           'tlayout_hierarchy', 'tmenu_touch', 'tc24_requests', 'tc27_availability',
           'tc29_climate_bubbles', 'tsoft_audio', 'tclock24', 'tthreefloor_save',
           'tsave_recovery', 'tguidance_banner', 'tvisual31', 'tfeedback_interactions',
           'tbplus', 'tfinancial_trust', 'tcapacity', 'tstafffirst']
jobs = [([node, 'tests/headless/' + s + '.mjs'], {}) for s in scripts]
jobs.extend(([node, 'tests/headless/' + s + '.mjs'], {'SST_BASELINE_36': baseline.name}) for s in ['tcareer37','tcareer37_economy','tcomeback36','tcomeback36_save','twalk','tr'])
jobs.extend(([node, '--check', f], {}) for f in ['js/career.js','js/main.js','js/tutorial.js','js/comeback.js','tests/headless/tcareer37.mjs','tests/headless/tcareer37_economy.mjs'])
jobs.append(([node, 'tests/headless/tsave_recovery.mjs'],
             {'SST_TEST_PRODUCTION_AUTOSAVE': '1', 'SST_TEST_AUTOSAVE_DELAY_MS': '100'}))
jobs.extend(([node, '--check', f], {}) for f in
            ['js/feedbackcopy.js', 'js/complaints.js', 'js/climateavailability.js',
             'tests/headless/tfeedback35.mjs', 'tests/headless/tfeedback35_equivalence.mjs',
             'js/sim.js', 'js/economics.js', 'js/ui.js', 'js/reporting.js',
             'js/version.js', 'tests/headless/treporting34.mjs',
             'tests/headless/treporting34_equivalence.mjs', 'tests/headless/tclimate33.mjs'])
def run(job):
    cmd, extra = job
    try:
        r = subprocess.run(cmd, cwd=root, env={**os.environ, **extra},
                           capture_output=True, text=True, timeout=180)
        result = dict(command=cmd, environment=extra, exit_code=r.returncode,
                      stdout=r.stdout, stderr=r.stderr)
    except subprocess.TimeoutExpired as e:
        result = dict(command=cmd, environment=extra, exit_code=-1,
                      stdout=str(e.stdout or ''), stderr='TIMEOUT ' + str(e.stderr or ''))
    print(('PASS ' if result['exit_code'] == 0 else 'FAIL ') + ' '.join(cmd[1:]), flush=True)
    return result
with concurrent.futures.ThreadPoolExecutor(4) as pool:
    results = list(pool.map(run, jobs))
report = dict(complete=True, node=subprocess.check_output([node, '--version'], text=True).strip(),
              checks=len(results), passed=sum(r['exit_code'] == 0 for r in results), results=results)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'results'}))
raise SystemExit(0 if report['checks'] == report['passed'] else 1)
