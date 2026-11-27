import json,subprocess,concurrent.futures,time
from pathlib import Path
root=Path('bench/x191');r=root/'receipts';screen=json.loads((r/'screen.json').read_text())['rows']
jobs=[]
for x in screen:
 if not x['plans']:continue
 # Two large historical heldouts are included; other historical heldouts screen only.
 if 'fixtures/' in x['path'] and not any(t in x['path'] for t in ['recover-corrupted','ch09-02']):continue
 for mode,p in [('selected',x['plans'][0])]:
  i=len(jobs);job=dict(path=x['path'],mode=mode,folded=p['folded'],edges=p['edges'],branched=p['branched'],output=str(r/f'paid-{i:02}.json'))
  f=root/f'job-{i:02}.json';f.write_text(json.dumps(job));jobs.append((i,f,job))
def run(item):
 i,f,job=item;t=time.monotonic()
 Path(job['output']).unlink(missing_ok=True) # A timed-out rerun must not inherit an old success.
 with (r/f'paid-{i:02}.log').open('w') as log:
  try:
   p=subprocess.run(['node','--max-old-space-size=1000',str(root/'worker.mjs'),str(f)],stdout=log,stderr=subprocess.STDOUT,timeout=180)
   status='complete' if p.returncode==0 else 'failed'
  except subprocess.TimeoutExpired:status='timeout'
 return dict(path=job['path'],mode=job['mode'],output=job['output'],status=status,wallSeconds=time.monotonic()-t,capSeconds=180)
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for result in pool.map(run,jobs):
  results.append(result);(r/'paid-processes.json').write_text(json.dumps(results,indent=2));print(result,flush=True)
