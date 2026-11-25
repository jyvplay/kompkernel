"""Escalate the remaining five ps-ef plans after a 39-second successful retry.
Fresh processes, 90 s each, no concurrent benchmark or canonical worker.
Together with paid-38 this attempts a complete six-plan priced tournament.
"""
import json,subprocess
from pathlib import Path
root=Path('bench/x179/receipts');rows=[];i=39
for n in [32,128,512]:
 for order in ['increasing','decreasing']:
  if n==512 and order=='decreasing':continue
  job=dict(kind='frequency',path='bench/holdout-x42/ps-ef.txt',n=n,order=order,file=str(root/f'paid-{i:02}.json'))
  with (root/f'paid-{i:02}.log').open('w') as f:
   try:p=subprocess.run(['node','--max-old-space-size=900','bench/x179/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if p.returncode==0 else 'process-failed';code=p.returncode
   except subprocess.TimeoutExpired:status='TIMEOUT';code=None
  rows.append(dict(job=job,status=status,exit=code,limitSeconds=90,oldSpaceMiB=900));(root/'ps-ef-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True);i+=1
