"""Serial bounded paid jobs, then one fresh canonical replay. No hidden parallelism.
Prior ps-ef all-plan tournament is complete and deliberately not repeated.
"""
import subprocess,json
from pathlib import Path
root=Path('bench/x180/receipts');jobs=[]
for path in ['bench/holdout-x41/ps-aux-real.txt','bench/holdout-x41/ls-l-real.txt']:
 jobs.append(dict(kind='frequency',path=path,limitSeconds=180))
jobs.append(dict(kind='control',path='bench/x177/fixtures/python_cpython-datastructures.rst',limitSeconds=180))
jobs.append(dict(kind='frequency',path='bench/x177/fixtures/python_cpython-datastructures.rst',limitSeconds=180))
for path in ['bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt','bench/holdout-x41/ps-real.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch','bench/holdout/code-ts.txt']:
 jobs.append(dict(kind='apousia',path=path,limitSeconds=90))
rows=[]
for i,job in enumerate(jobs):
 job['file']=str(root/f'paid-{i:02}.json')
 with (root/f'paid-{i:02}.log').open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=1100','bench/x180/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=job['limitSeconds']);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
  except subprocess.TimeoutExpired:status='TIMEOUT';code=None
 rows.append(dict(job=job,status=status,exit=code,oldSpaceMiB=1100));(root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
with (root/'frontier.log').open('w') as f:
 r=subprocess.run(['node','--max-old-space-size=1400','bench/x180/frontier.mjs','bench/x180/lanes.txt',str(root/'frontier.jsonl')],stdout=f,stderr=subprocess.STDOUT)
(root/'frontier-exit.json').write_text(json.dumps(dict(exit=r.returncode)));assert r.returncode==0
