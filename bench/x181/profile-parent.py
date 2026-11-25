"""Bounded V8 sampling of the unresolved APOUSIA ls-l parent search.
This diagnostic overlaps replay; sampled attribution is not a speed proof.
"""
import subprocess,json,time
from pathlib import Path
job=dict(kind='apousia',path='bench/holdout-x41/ls-l-real.txt',limitSeconds=180,file='bench/x181/receipts/apousia-profile-paid.json')
start=time.monotonic()
with Path('bench/x181/receipts/parent-profile-run.log').open('w') as f:
 try:r=subprocess.run(['node','--max-old-space-size=1000','--prof','--logfile=.cache/x181/apousia-v8.log','.cache/x181/apousia-worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=180);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
 except subprocess.TimeoutExpired:status='TIMEOUT';code=None
Path('bench/x181/receipts/parent-profile-process.json').write_text(json.dumps(dict(status=status,exit=code,wallSeconds=time.monotonic()-start,job=job,isolated=False),indent=2))
logs=list(Path('.cache/x181').glob('*apousia-v8.log'));assert len(logs)==1,logs
with Path('bench/x181/receipts/parent-v8-profile.txt').open('w') as f:subprocess.run(['node','--prof-process',str(logs[0])],stdout=f,stderr=subprocess.STDOUT,check=True)
