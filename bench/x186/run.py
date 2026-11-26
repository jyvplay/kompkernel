"""Paid selected-plan trials. Concurrent with canonical replay; not speed evidence."""
import json,subprocess
from pathlib import Path
root=Path('bench/x186/receipts');jobs=[];rows=[]
paths=['bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-x41/ps-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout/json-pkg.txt','bench/holdout-work/unified-diff.patch','bench/holdout/code-ts.txt']
paths += ['bench/x181/fixtures/git_git-recover-corrupted-blob-object.adoc','bench/x179/fixtures/kubernetes_website-debug-service.md']
for path in paths:jobs.append(dict(path=path,family='desmi'))
for path in ['bench/holdout-x41/ps-aux-real.txt','bench/holdout-x42/findmnt.txt']:jobs.append(dict(path=path,family='desmi'))
for i,job in enumerate(jobs):
 job.update(limitSeconds=90,file=str(root/f'paid-{i:02}.json'))
 Path(job['file']).unlink(missing_ok=True) # Never reuse a stale receipt after timeout.
 with (root/f'paid-{i:02}.log').open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=1000','bench/x186/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
  except subprocess.TimeoutExpired:status='TIMEOUT';code=None
 rows.append(dict(job=job,status=status,exit=code));(root/'paid-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
