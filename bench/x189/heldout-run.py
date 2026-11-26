import subprocess,json,time,importlib.util
from pathlib import Path
r=Path('bench/x189/receipts');root=r.parent;parents=[];jobs=[]
for i,lane in enumerate((root/'heldout.txt').read_text().splitlines()):
 manifest=root/f'heldout-{i}.txt';manifest.write_text(lane+'\n');out=r/f'heldout-{i}.jsonl';t=time.monotonic()
 with (r/f'heldout-{i}.log').open('w') as log:
  try:
   p=subprocess.run(['node','--max-old-space-size=1400',str(root/'frontier.mjs'),str(manifest),str(out)],stdout=log,stderr=subprocess.STDOUT,timeout=180)
   status='complete' if p.returncode==0 else 'failed'
  except subprocess.TimeoutExpired:status='timeout'
 jobs.append(dict(path=lane,status=status,wallSeconds=time.monotonic()-t,capSeconds=180))
 if status=='complete':parents.extend(json.loads(s) for s in out.read_text().splitlines())
 (r/'heldout-processes.json').write_text(json.dumps(jobs,indent=2))
(r/'heldout-frontier.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in parents))
if parents:
 with (r/'heldout-trials.jsonl').open('w') as log:subprocess.run(['node','--max-old-space-size=1400',str(root/'trials.mjs'),str(r/'heldout-frontier.jsonl')],stdout=log,check=True,timeout=180)
 rows=[json.loads(s) for s in (r/'heldout-trials.jsonl').read_text().splitlines()]
else:rows=[]
spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
checks=0;unsupported=[]
for x in rows:
 if x['status']!='exact':continue
 try:decoded=reader.parent_read(x['message'])
 except ValueError as e:unsupported.append(dict(path=x['path'],error=str(e)));continue
 assert decoded.encode()==Path(x['path']).read_bytes();checks+=1
result=dict(jobs=jobs,cells=len(rows),byteExact=checks,unsupported=unsupported,wins=[{k:x.get(k) for k in ['path','family','parentTokens','tokens','winner']} for x in rows if x.get('tokens',x['parentTokens'])<x['parentTokens']],native='NOT_RUN')
(r/'heldout-summary.json').write_text(json.dumps(result,indent=2));print(result)
