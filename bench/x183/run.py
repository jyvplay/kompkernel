"""Serial paid trials, explicitly overlapping replay, not speed evidence."""
import json,subprocess
from pathlib import Path
root=Path('bench/x183/receipts');jobs=[];rows=[]
for path in ['bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-x41/ps-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch','bench/holdout/code-ts.txt','bench/holdout-x41/ls-l-real.txt','bench/holdout-x40/metrics.tsv']:jobs.append(dict(path=path,mode='best'))
for path in ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout/code-ts.txt']:jobs.append(dict(path=path,mode='edge'))
for path in ['bench/holdout-x41/ps-real.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch']:jobs.append(dict(path=path,mode='flat'))
for i,job in enumerate(jobs):
 job.update(kind='geiton',limitSeconds=90,file=str(root/f'paid-{i:02}.json'))
 with (root/f'paid-{i:02}.log').open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=1000','bench/x183/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
  except subprocess.TimeoutExpired:status='TIMEOUT';code=None
 rows.append(dict(job=job,status=status,exit=code));(root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
