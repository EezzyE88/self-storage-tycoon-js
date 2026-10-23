#!/usr/bin/env python3
"""Explicit native regression gate. Exports committed source; never opens browser/company storage."""
import argparse
import concurrent.futures
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

FAIL_LINE = re.compile(r'^\s*(?:FAIL(?:\s|:|$)|SOME FAILED\b|[1-9]\d* DISTINCT ISSUES\b)', re.M)
EXCEPTION = re.compile(r'(?:SyntaxError|TypeError|ReferenceError|ERR_MODULE_NOT_FOUND|Traceback \(most recent call last\))')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def assess(entry, code, stdout, stderr, timed_out=False):
    failures = FAIL_LINE.findall(stdout + '\n' + stderr)
    if timed_out:
        return 'TIMEOUT', 'execution limit exceeded', failures
    if code:
        return ('ERROR' if EXCEPTION.search(stderr) else 'FAIL'), f'process exit {code}', failures
    if failures:
        return 'FAIL', 'explicit failure output despite successful exit', failures
    lines = [x for x in stdout.splitlines() if x.strip()]
    if not lines or not re.fullmatch(entry['completion'], lines[-1]):
        return 'ERROR', 'declared terminal completion evidence missing', failures
    if len(re.findall(r'^PASS\b', stdout, re.M)) < entry.get('minimum_pass_lines', 0):
        return 'ERROR', 'fewer check markers than declared', failures
    if entry.get('observation'):
        try:
            value = json.loads(lines[-1])
            if value['status'] != 'OBSERVATION' or value['cause_resolved'] is not False or value['historical_expectation'] not in ['FAIL', 'MET_IN_THIS_RUN']:
                raise ValueError('invalid observation classification')
        except (ValueError, KeyError, TypeError) as exc:
            return 'ERROR', str(exc), failures
        return 'OBSERVATION', 'non-gating historical result; cause unresolved', failures
    return 'PASS', 'process, output and completion checks passed', failures

def attempted_count(rows):
    # A timed-out child did execute even though it has no exit code.
    return sum('seconds' in row for row in rows)

def aggregate(rows):
    if any(r['status'] in ['FAIL', 'TIMEOUT'] for r in rows):
        return 1
    if any(r['status'] in ['ERROR', 'BLOCKED', 'NOT_RUN'] for r in rows):
        return 2
    if not rows:
        return 2
    return 0

def run_entry(entry, cwd, environment, output, exports=None):
    result = {'id': entry['id'], 'required': not entry.get('observation', False),
              'evidence': entry.get('evidence', 'native production methods / disposable fixtures'),
              'declared_completion': entry.get('completion'), 'declared_minimum_pass_lines': entry.get('minimum_pass_lines', 0)}
    def unavailable(reason):
        return {**result, 'status': 'BLOCKED', 'reason': reason, 'exit_code': None}
    if entry.get('blocked_reason'):
        return unavailable(entry['blocked_reason'])
    for name in entry.get('required_files', []):
        if not (cwd / name).is_file():
            return unavailable('missing exact fixture: ' + name)
    args = []
    for arg in entry['command']:
        if arg.startswith('@export:'):
            sha = arg.split(':', 1)[1]
            if not exports or sha not in exports:
                return unavailable('missing verified parent export: ' + sha)
            arg = str(exports[sha])
        args.append(arg)
    fixture_hashes = {p: digest((cwd / p).read_bytes()) for p in entry.get('required_files', [])}
    result.update(command=args, fixture_hashes=fixture_hashes, environment={'GIT_DIR': environment.get('GIT_DIR')})
    logdir = output / 'logs'
    logdir.mkdir(parents=True, exist_ok=True)
    stdout_path, stderr_path = logdir / (entry['id'] + '.stdout.log'), logdir / (entry['id'] + '.stderr.log')
    start = time.monotonic()
    try:
        with stdout_path.open('w') as out, stderr_path.open('w') as err:
            proc = subprocess.Popen(args, cwd=cwd, env=environment, stdout=out, stderr=err)
            try:
                code = proc.wait(timeout=entry.get('timeout', 180))
                timeout = False
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
                code, timeout = None, True
        stdout, stderr = stdout_path.read_text(errors='replace'), stderr_path.read_text(errors='replace')
        status, reason, failures = assess(entry, code, stdout, stderr, timeout)
        notes=[line for line in stdout.splitlines() if re.match(r'^(?:SKIP|NOT TESTED|LIMIT:)',line)]
        unexpected=[line for line in notes if not any(re.fullmatch(pattern,line) for pattern in entry.get('allowed_notes',[]))]
        if status=='PASS' and unexpected:status,reason='ERROR','undeclared skipped/limited scope: '+str(unexpected)
        result['scope_notes']=notes
        result['declared_scope']=entry.get('scope')
        result.update(status=status, reason=reason, exit_code=code, failure_markers=failures)
        if status == 'OBSERVATION':
            result['observation'] = json.loads(stdout.splitlines()[-1])
    except OSError as exc:
        result.update(status='ERROR', reason=str(exc), exit_code=None)
    result.update(seconds=round(time.monotonic()-start, 3), stdout=str(stdout_path.relative_to(output)), stderr=str(stderr_path.relative_to(output)))
    return result

def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE)

def export(root, sha, destination, paths=()):
    data = git(root, 'archive', sha, *paths)
    destination.mkdir()
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        archive.extractall(destination, filter='data')
    return {'commit': sha, 'tree': git(root, 'rev-parse', sha+'^{tree}').decode().strip(),
            'export_paths': list(paths) or ['entire committed tree'], 'archive_sha256': digest(data),
            'files': {str(p.relative_to(destination)): digest(p.read_bytes()) for p in sorted(destination.rglob('*')) if p.is_file()}}

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['current', 'historical', 'stress', 'observations'], default='current')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--ref', default='HEAD', help='exact committed source to export; default HEAD')
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[2]
    output = args.output.resolve()
    if output.is_relative_to(root):
        parser.error('output must be outside the source checkout')
    if output.exists() and any(output.iterdir()):
        parser.error('use a new empty output directory; existing evidence is never overwritten')
    output.mkdir(parents=True, exist_ok=True)
    report = {'profile': args.profile, 'complete': False, 'results': [], 'limitations': ['Native/stubbed evidence only; no new rendered-browser, Safari, VoiceOver, enjoyment or performance acceptance.']}
    try:
        if git(root,'status','--porcelain','--untracked-files=normal').strip():
            raise RuntimeError('source checkout has uncommitted changes; commit the test candidate before running the current gate')
        sha = git(root, 'rev-parse', args.ref+'^{commit}').decode().strip()
        gitdir = git(root, 'rev-parse', '--absolute-git-dir').decode().strip()
        node = shutil.which('node')
        if not node:
            raise RuntimeError('Node executable unavailable')
        report.update(source_commit=sha, source_tree=git(root,'rev-parse',sha+'^{tree}').decode().strip(),
                      python=sys.version.split()[0], node=subprocess.check_output([node,'--version'], text=True).strip())
        # No inherited reproduction flags, tuning overrides, credentials or NODE_OPTIONS.
        env = {k: os.environ[k] for k in ['PATH', 'SYSTEMROOT', 'TMPDIR', 'TEMP', 'TMP', 'LANG'] if k in os.environ}
        env.update(GIT_DIR=gitdir, PYTHONDONTWRITEBYTECODE='1')
        with tempfile.TemporaryDirectory(prefix='sst-current-') as temp:
            temp = Path(temp)
            source = temp/'source'
            report['source_export'] = export(root, sha, source)
            # The executing runner must itself belong to the declared source.
            if (source/'tests/headless/run_current_regressions.py').read_bytes() != Path(__file__).read_bytes():
                raise RuntimeError('executing runner differs from declared committed source')
            manifest_path = source/'tests/headless/current-regressions.json'
            manifest = json.loads(manifest_path.read_text())
            report['manifest_sha256'] = digest(manifest_path.read_bytes())
            entries = manifest['profiles'][args.profile]
            ids = [x['id'] for x in entries]
            if len(ids) != len(set(ids)):
                raise RuntimeError('duplicate manifest entry IDs')
            exports, evidence = {}, {}
            for parent in sorted({arg.split(':',1)[1] for e in entries for arg in e.get('command',[]) if arg.startswith('@export:')}):
                try:
                    exports[parent] = temp/parent
                    evidence[parent] = export(root, parent, exports[parent], ('js',))
                except subprocess.CalledProcessError:
                    exports.pop(parent, None)
                    evidence[parent] = {'status': 'BLOCKED', 'reason': 'required immutable parent unavailable; no fetch attempted'}
            report['parent_exports'] = evidence
            def run(entry):
                e = dict(entry)
                e['command'] = [node if x == '@node' else sys.executable if x == '@python' else x for x in e.get('command', [])]
                for obj in e.get('required_objects', []):
                    try:
                        git(root, 'cat-file', '-e', obj)
                    except subprocess.CalledProcessError:
                        e['blocked_reason'] = 'required Git object unavailable: '+obj
                return run_entry(e, source, env, output, exports)
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                for row in pool.map(run, entries):
                    report['results'].append(row)
                    print(row['status'], row['id'], flush=True)
            report['unselected_entries'] = manifest.get('excluded_from_current', []) if args.profile == 'current' else []
            # Detect any production mutation, even inside the disposable export.
            changed = [p for p,h in report['source_export']['files'].items()
                       if not p.startswith(('tests/', 'docs/')) and (not (source/p).is_file() or digest((source/p).read_bytes()) != h)]
            changed.extend(str(p.relative_to(source)) for p in source.rglob('*') if p.is_file() and str(p.relative_to(source)) not in report['source_export']['files'] and not str(p.relative_to(source)).startswith(('tests/','docs/')))
            report['production_export_unchanged'] = not changed
            if changed:
                report['results'].append({'id':'production-preservation','status':'FAIL','required':True,'reason':str(changed)})
            report['complete'] = True
    except Exception as exc:
        report['results'].append({'id':'runner','status':'ERROR','required':True,'reason':str(exc)})
    report['counts'] = {k:sum(x['status']==k for x in report['results']) for k in ['PASS','FAIL','ERROR','BLOCKED','TIMEOUT','OBSERVATION','NOT_RUN']}
    report['selected'] = len(report['results'])
    report['required'] = sum(x.get('required',True) for x in report['results'])
    report['attempted'] = attempted_count(report['results'])
    report['exit_code'] = aggregate(report['results'])
    (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
    headline = ('ALL REQUIRED CHECKS PASSED' if report['exit_code']==0 and args.profile!='observations'
                else 'OBSERVATIONS RECORDED; NO REGRESSION PASS CLAIM' if report['exit_code']==0 else 'NOT PASS')
    summary = headline+'\n'+json.dumps(report['counts'], sort_keys=True)+'\n'
    summary += '\n'.join(x['id']+': '+x['status']+' — '+x.get('reason','') for x in report['results'])+'\n'
    (output/'SUMMARY.txt').write_text(summary)
    print(headline, report['counts'], flush=True)
    return report['exit_code']

if __name__ == '__main__':
    raise SystemExit(main())
