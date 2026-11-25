"""Fresh-process parent trials after a 700 MiB cumulative worker exhausted V8 heap.
Resource failures remain failures. No weakened codec or omitted header.
120 s per fresh-process attempt, 900 MiB V8 old-space cap. CPU/wall here are
contended diagnostics, NOT the isolated speed experiment.
"""
import subprocess,json,os
from pathlib import Path
root=Path('bench/x178/receipts');rows=[]
for path in ['bench/holdout-x41/ps-real.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch','bench/holdout/code-ts.txt']:
 for mode in ['space','LF']:
  env=dict(os.environ,PINAKAS_MODE=mode);log=root/('paid-'+Path(path).name+'-'+mode+'.log')
  with log.open('w') as f:
   try:r=subprocess.run(['node','--max-old-space-size=900','bench/x178/trial.mjs',path],env=env,stdout=f,stderr=subprocess.STDOUT,timeout=120);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
   except subprocess.TimeoutExpired:status='TIMEOUT';code=None
  row=dict(path=path,mode=mode,status=status,exit=code,log=str(log),limitSeconds=120,oldSpaceMiB=900);rows.append(row)
  (root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(row,flush=True)
subprocess.run(['python3','bench/x178/independent.py'],check=True)
