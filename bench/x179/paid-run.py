"""Every declared frequency width/order is attempted, never called priced on timeout.
Fresh process per attempt: 30 s wall, 900 MiB V8 old-space. These contended times
are resource diagnostics, not speed evidence. Canonical controls are reused.
"""
import subprocess,json,os
from pathlib import Path
root=Path('bench/x179/receipts');jobs=[]
for path in ['bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt','bench/holdout-x41/ps-real.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch','bench/holdout/code-ts.txt']:
 for policy in ['local','eager']:jobs.append(dict(kind='klados',path=path,policy=policy))
jobs.append(dict(kind='control',path='bench/x177/fixtures/python_cpython-datastructures.rst'))
for path in ['bench/holdout-x42/ps-ef.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x41/ls-l-real.txt','bench/x177/fixtures/python_cpython-datastructures.rst']:
 for n in [32,128,512]:
  for order in ['increasing','decreasing']:jobs.append(dict(kind='frequency',path=path,n=n,order=order))
rows=[]
for i,job in enumerate(jobs):
 job['file']=str(root/f'paid-{i:02}.json');log=root/f'paid-{i:02}.log'
 with log.open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=900','bench/x179/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=30);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
  except subprocess.TimeoutExpired:status='TIMEOUT';code=None
 row=dict(job=job,status=status,exit=code,limitSeconds=30,oldSpaceMiB=900,log=str(log));rows.append(row);(root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(row,flush=True)
