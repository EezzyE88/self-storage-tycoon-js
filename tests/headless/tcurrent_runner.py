"""Real child-process tests: false passes, completion, prerequisites and observations."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('current_runner',Path(__file__).with_name('run_current_regressions.py'))
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class RunnerTests(unittest.TestCase):
    def execute(self, code, **extra):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)
            entry={'id':'child','command':[sys.executable,'-c',code], 'completion':r'PASS complete','minimum_pass_lines':1,**extra}
            return runner.run_entry(entry,p,dict(os.environ),p)

    def test_legitimate_complete_pass(self):
        self.assertEqual(self.execute("print('PASS complete')")['status'],'PASS')
    def test_exit_zero_printed_failure(self):
        r=self.execute("print('FAIL conversion');print('PASS complete')")
        self.assertEqual(r['exit_code'],0);self.assertEqual(r['status'],'FAIL')
    def test_some_failed_and_issue_count(self):
        for s in ['SOME FAILED','2 DISTINCT ISSUES']:
            self.assertEqual(self.execute(f"print({s!r});print('PASS complete')")['status'],'FAIL')
    def test_missing_or_early_completion(self):
        self.assertEqual(self.execute("print('PASS first');raise SystemExit(0)")['status'],'ERROR')
    def test_nonzero(self):
        self.assertEqual(self.execute("print('PASS complete');raise SystemExit(1)")['status'],'FAIL')
    def test_thrown_exception(self):
        self.assertNotEqual(self.execute("raise RuntimeError('broken')")['status'],'PASS')
    def test_timeout(self):
        row=self.execute('import time;time.sleep(2)',timeout=.03)
        self.assertEqual(row['status'],'TIMEOUT')
        self.assertEqual(runner.attempted_count([row,{'status':'BLOCKED'}]),1)
    def test_missing_fixture_and_export(self):
        self.assertEqual(self.execute("print('PASS complete')",required_files=['absent.sst'])['status'],'BLOCKED')
        self.assertEqual(self.execute('',command=['@export:missing'])['status'],'BLOCKED')
    def test_no_unanchored_failure_false_alarm(self):
        self.assertEqual(self.execute("print('Example text contains FAIL but is not a failed check');print('PASS complete')")['status'],'PASS')
    def test_observation_does_not_turn_into_pass(self):
        value={'status':'OBSERVATION','historical_expectation':'FAIL','cause_resolved':False}
        row=self.execute('print('+repr(json.dumps(value))+')',completion=r'\{.*\}',minimum_pass_lines=0,observation=True)
        self.assertEqual(row['status'],'OBSERVATION');self.assertFalse(row['required']);self.assertEqual(runner.aggregate([row]),0)
        failed=self.execute("print('FAIL eligibility');print('PASS complete')")
        self.assertEqual(runner.aggregate([row,failed]),1)
    def test_incomplete_observation_is_not_success(self):
        self.assertEqual(self.execute("print('{}')",completion=r'\{.*\}',minimum_pass_lines=0,observation=True)['status'],'ERROR')
    def test_aggregate_never_green_for_missing_or_failed_runs(self):
        for s,code in [('BLOCKED',2),('ERROR',2),('NOT_RUN',2),('TIMEOUT',1),('FAIL',1)]:
            self.assertEqual(runner.aggregate([{'status':'PASS'},{'status':s}]),code)
        self.assertEqual(runner.aggregate([]),2)

if __name__=='__main__':
    result=unittest.TextTestRunner(stream=sys.stdout,verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(RunnerTests))
    if result.wasSuccessful():print('PASS runner failure-detection contract: 12 tests')
    raise SystemExit(0 if result.wasSuccessful() else 1)
