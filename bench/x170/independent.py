"""Separate cyclic-event reader. Original files, not encoder self-reports."""
import json,re
from pathlib import Path

def undo(folded):
 header,body=folded.split('\n',1);rows=json.loads(header);rules={};indices={}
 assert 0<len(rows)<=8
 for marker,cycle in rows:
  assert isinstance(marker,str) and re.fullmatch('[A-Za-z]+',marker) and marker not in rules
  assert 2<=len(cycle)<=4 and all(isinstance(w,str) and re.fullmatch('[A-Za-z]+',w) for w in cycle)
  rules[marker]=cycle;indices[marker]=0
 out=[];pos=0
 for m in re.finditer('[A-Za-z]+',body):
  out.append(body[pos:m.start()]);w=m[0]
  if w in rules:
   cycle=rules[w];out.append(cycle[indices[w]%len(cycle)]);indices[w]+=1
  else:out.append(w)
  pos=m.end()
 out.append(body[pos:]);result=''.join(out);assert len(result.encode('utf-16-le'))//2<=50000
 return result
checks=0
for r in json.loads(Path('bench/x170/receipts/unit-pairs.json').read_text()):assert undo(r['folded']).encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x170/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
ns={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'parent','exec'),ns)
wires=0;errors=[]
for file in Path('bench/x170/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:
   folded=ns['parent_read'](message);out=undo(folded) if kind=='candidate' else folded
   assert out.encode()==source
  except (ValueError,AssertionError,KeyError) as e:errors.append(dict(path=r['path'],kind=kind,error=repr(e)));continue
  wires+=1;checks+=1
out=dict(checks=checks,wireChecks=wires,errors=errors,native='NOT_RUN');Path('bench/x170/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
