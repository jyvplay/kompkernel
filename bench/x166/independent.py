"""Independent Python decode: immutable skeleton tuples, positional reconstruction.
No TypeScript decoder or encoder decoded fields are consumed.
"""
import json,re
from pathlib import Path

def undo(folded,k):
 assert k in (1,4,12)
 head,body=folded.split('\n',1)
 assert re.fullmatch(r'[0-9]+(?: [0-9]+)*',head)
 values=head.split(' ');holes=[i for i,c in enumerate(body) if c=='~']
 assert len(holes)==len(values)
 ranked=sorted(holes,key=lambda i:(tuple(map(ord,body[max(0,i-k):i])),tuple(map(ord,body[i+1:i+1+k])),i))
 table=dict(zip(ranked,values))
 result=''.join(table.get(i,c) for i,c in enumerate(body))
 assert len(result.encode('utf-16-le'))//2<=50000
 return result
checks=0
for r in json.loads(Path('bench/x166/receipts/unit-pairs.json').read_text()):
 assert undo(r['folded'],r['k']).encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x166/receipts/screen.json').read_text()):
 for p in r['symfraz']:
  assert undo(p['folded'],p['k']).encode()==Path(r['path']).read_bytes();checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'inherited-python-parent','exec'),prior)
unsupported=[];wire_checks=0
for file in Path('bench/x166/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 messages=[('base',r['base']['message'],None)]
 messages += [('candidate',c['parent'],c['k']) for c in r['candidates']]
 if not r['result']['applied']:messages.append(('selected',r['result']['message'],None))
 else:
  c=next(c for c in r['candidates'] if c['message']==r['result']['message']);messages.append(('selected',c['parent'],c['k']))
 for kind,message,k in messages:
  try:folded=prior['parent_read'](message)
  except ValueError as e:
   if str(e)!='unsupported layout':raise
   unsupported.append({'path':r['path'],'kind':kind,'reason':str(e)});continue
  assert (undo(folded,k) if k else folded).encode()==source;checks+=1;wire_checks+=1
out=dict(checks=checks,wireChecks=wire_checks,unsupported=unsupported,supportedChecksPassed=True,native='NOT_RUN')
Path('bench/x166/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
