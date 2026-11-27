import json,subprocess,concurrent.futures,time
from pathlib import Path
root=Path('bench/x190');r=root/'receipts';screen=json.loads((r/'screen.json').read_text())['rows']
names=['email-thread.txt','kb-article.txt','llm-answer.md','ps-real.txt','ps-aux-real.txt','ls-l-real.txt','json-pkg.txt','unified-diff.patch'];jobs=[]
for name in names:
 rows=[x for x in screen if Path(x['path']).name==name and x['family']=='dipigi'];normal=next(x for x in rows if not x['force']);forced=next(x for x in rows if x['force'])
 for mode,x in [('selected',normal),('forced',forced)]:
  ps=x['plans'];p=(min(ps,key=lambda p:(-p['twoParents'],p['tokens'])) if mode=='forced' else ps[0]) if ps else None
  if not p:continue
  i=len(jobs);job=dict(path=x['path'],mode=mode,twoParents=p['twoParents'],folded=p['folded'],cap=p['cap'],order=p['order'],output=str(r/f'paid-{i:02}.json'))
  f=root/f'job-{i:02}.json';f.write_text(json.dumps(job));jobs.append((i,f,job))
def run(item):
 i,f,job=item;t=time.monotonic()
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
