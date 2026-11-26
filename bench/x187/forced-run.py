"""Additional nondegenerate-plan trials; real encodes, not timing evidence."""
import json,subprocess
from pathlib import Path
root=Path('bench/x187/receipts');screen=json.loads((root/'screen.json').read_text())['rows'];rows=[]
paths=['bench/holdout-work/email-thread.txt','bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-x41/ps-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-x42/findmnt.txt']
for i,path in enumerate(paths):
 plans=next(r['plans'] for r in screen if r['family']=='diameris' and r['path']==path);rank=next((j for j,p in enumerate(plans) if any(a and b for _,a,b in json.loads(p['folded']))),None)
 if rank is None:rows.append(dict(path=path,status='no-nondegenerate-plan'));continue
 job=dict(path=path,family='diameris',rank=rank,file=str(root/f'forced-{i:02}.json'));Path(job['file']).unlink(missing_ok=True)
 with (root/f'forced-{i:02}.log').open('w') as f:
  try:p=subprocess.run(['node','--max-old-space-size=1000','bench/x187/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if p.returncode==0 else 'failed'
  except subprocess.TimeoutExpired:status='TIMEOUT'
 rows.append(dict(job=job,status=status));(root/'forced-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
