"""Python FIFO interpreter, independent implementation; not native-chat evidence."""
import json
from collections import deque
from pathlib import Path

def undo(folded):
 first,default,rows=json.loads(folded)
 assert isinstance(first,str) and ' ' not in first and isinstance(rows,list)
 def q(raw):
  assert raw is None or isinstance(raw,str)
  return deque([] if raw is None else raw.split(' '))
 fallback=q(default);routes={}
 for key,raw in rows:
  assert isinstance(key,str) and ' ' not in key and key not in routes
  routes[key]=q(raw)
 remaining=len(fallback)+sum(map(len,routes.values()));assert remaining<=50000
 out=[first]
 for _ in range(remaining):
  queue=routes[out[-1]] if out[-1] in routes else fallback
  assert queue,'stranded transition'
  out.append(queue.popleft())
 assert not fallback and not any(routes.values())
 result=' '.join(out);assert len(result.encode('utf-16-le'))//2<=50000
 return result
checks=0
for r in json.loads(Path('bench/x168/receipts/unit-pairs.json').read_text()):
 assert undo(r['folded']).encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x168/receipts/screen.json').read_text())['rows']+json.loads(Path('bench/x168/receipts/heldout.json').read_text())['rows']:
 for p in r['plans']:
  assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'inherited-python-parent','exec'),prior)
unsupported=[];mismatches=[];wirechecks=0
for file in Path('bench/x168/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:folded=prior['parent_read'](message)
  except ValueError as e:
   if str(e)!='unsupported layout':raise
   unsupported.append(dict(path=r['path'],kind=kind,reason=str(e)));continue
  try:actual=(undo(folded) if kind=='candidate' else folded).encode()
  except (ValueError,AssertionError,KeyError) as e:
   mismatches.append(dict(path=r['path'],kind=kind,reason=type(e).__name__));continue
  if actual!=source:mismatches.append(dict(path=r['path'],kind=kind,reason='source byte mismatch'));continue
  checks+=1;wirechecks+=1
out=dict(checks=checks,wireChecks=wirechecks,unsupported=unsupported,mismatches=mismatches,native='NOT_RUN',scope='Python algorithm, not basic-chat behavioral evidence')
Path('bench/x168/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
