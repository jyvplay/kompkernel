"""Pay the two raw-winning APOUSIA ops plans, after the initial ten jobs.
May overlap canonical replay; timing is diagnostic, not isolated speed evidence.
"""
import subprocess,json
from pathlib import Path
root=Path('bench/x180/receipts');rows=json.loads((root/'paid-processes.json').read_text());assert len(rows)==10
for i,path in enumerate(['bench/holdout-x41/ls-l-real.txt','bench/holdout-x42/ps-ef.txt'],10):
 job=dict(kind='apousia',path=path,limitSeconds=90,file=str(root/f'paid-{i:02}.json'))
 assert not Path(job['file']).exists()
 with (root/f'paid-{i:02}.log').open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=1100','bench/x180/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
  except subprocess.TimeoutExpired:status='TIMEOUT';code=None
 rows.append(dict(job=job,status=status,exit=code,oldSpaceMiB=1100));(root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
