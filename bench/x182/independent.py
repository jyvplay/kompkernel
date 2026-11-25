import json,importlib.util
from collections import deque
from pathlib import Path

def forward(a,k):
 q=deque();total=0
 for s in a:
  total+=len(s)-k
  if total>0:q.appendleft(s)
  else:q.append(s)
 return list(q)
def inverse(a,k):
 q=deque(a);total=sum(len(s)-k for s in a);out=[]
 while q:
  s=q.popleft() if total>0 else q.pop();out.append(s);total-=len(s)-k
 return out[::-1]
def restore(s,n,k):
 a=s.split(' ');return ' '.join(v for i in range(0,len(a),n) for v in inverse(a[i:i+n],k))
checks=0
for p in json.loads(Path('bench/x182/receipts/unit-pairs.json').read_text()):assert forward(p['a'],p['k'])==p['b'] and inverse(p['b'],p['k'])==p['a'];checks+=2
for r in json.loads(Path('bench/x182/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:assert restore(p['folded'],p['n'],p['k']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
paid=[]
for f in sorted(Path('bench/x182/receipts').glob('paid-??.json')):
 r=json.loads(f.read_text())
 try:s=reader.parent_read(r['parent'])
 except ValueError as e:paid.append(dict(file=str(f),status='unsupported',error=str(e)));continue
 assert restore(s,r['plan']['n'],r['plan']['k']).encode()==Path(r['path']).read_bytes();checks+=1;paid.append(dict(file=str(f),status='exact'))
out=dict(checks=checks,paid=paid,native='NOT_RUN');Path('bench/x182/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
