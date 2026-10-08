#!/usr/bin/env python3
"""Candidate 33 final checks; preserve complete logs before handoff."""
import argparse, concurrent.futures, json, os, pathlib, subprocess
root=pathlib.Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=pathlib.Path);args=p.parse_args()
scripts=['tclimate33','tsection32','tlayout_hierarchy','tmenu_touch','tc24_requests','tc27_availability','tc29_climate_bubbles','tsoft_audio','tclock24','tthreefloor_save','tsave_recovery','tguidance_banner','tvisual31','tfeedback_interactions']
jobs=[(['node','tests/headless/'+s+'.mjs'],{}) for s in scripts]
jobs.append((['node','tests/headless/tsave_recovery.mjs'],{'SST_TEST_PRODUCTION_AUTOSAVE':'1','SST_TEST_AUTOSAVE_DELAY_MS':'100'}))
jobs.extend((['node','--check',f],{}) for f in ['js/climateavailability.js','js/complaints.js','js/sim.js','js/ui.js','js/version.js','tests/headless/tclimate33.mjs'])
def run(job):
 cmd,env=job
 try:
  r=subprocess.run(cmd,cwd=root,env={**os.environ,**env},capture_output=True,text=True,timeout=180)
  result={'command':cmd,'environment':env,'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
 except subprocess.TimeoutExpired as e:
  result={'command':cmd,'environment':env,'exit_code':-1,'stdout':str(e.stdout or ''),'stderr':'TIMEOUT '+str(e.stderr or '')}
 print(('PASS ' if result['exit_code']==0 else 'FAIL ')+' '.join(cmd),flush=True)
 return result
results=[]
with concurrent.futures.ThreadPoolExecutor(4) as pool:
 for result in pool.map(run,jobs):
  results.append(result)
  args.output.parent.mkdir(parents=True,exist_ok=True)
  args.output.write_text(json.dumps({'complete':False,'results':results},indent=2)+'\n')
report={'complete':True,'node':subprocess.check_output(['node','--version'],text=True).strip(),'checks':len(results),'passed':sum(r['exit_code']==0 for r in results),'results':results}
args.output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='results'}))
raise SystemExit(0 if report['passed']==report['checks'] else 1)
