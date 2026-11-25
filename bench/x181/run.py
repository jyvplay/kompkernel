"""Serial bounded FOTIA parent prices; runs concurrently with profiled replay.
CPU/wall numbers are diagnostic, not isolated speed evidence.
"""
import json,subprocess
from pathlib import Path
root=Path('bench/x181/receipts');rows=[]
paths=['bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-x41/ps-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch','bench/holdout/code-ts.txt']
assert all(Path(p).exists() for p in paths)
for i,path in enumerate(paths):
 job=dict(kind='fotia',path=path,rank=0,limitSeconds=90,file=str(root/f'paid-{i:02}.json'))
 with (root/f'paid-{i:02}.log').open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=1000','bench/x181/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
  except subprocess.TimeoutExpired:status='TIMEOUT';code=None
 rows.append(dict(job=job,status=status,exit=code,oldSpaceMiB=1000));(root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
