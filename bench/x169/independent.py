"""Independent Python frozen-neighbor reconstruction; no encoder decoded fields."""
import json
from pathlib import Path

def undo(folded):
 header,body=folded.split('\n',1);rows=json.loads(header);rules={}
 assert 0<len(rows)<=64
 for left,right,middle in rows:
  assert all(isinstance(x,str) and ' ' not in x for x in (left,right,middle))
  assert (left,right) not in rules;rules[left,right]=middle
 fields=body.split(' ');result=fields[0]
 for left,right in zip(fields,fields[1:]):
  middle=rules.get((left,right))
  result+=(' '+middle if middle is not None else '')+' '+right
 assert len(result.encode('utf-16-le'))//2<=50000
 return result
checks=0
for r in json.loads(Path('bench/x169/receipts/unit-pairs.json').read_text()):
 assert undo(r['folded']).encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x169/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:
  assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'python-parent','exec'),prior)
unsupported=[];mismatches=[];wires=0
for file in Path('bench/x169/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:
   folded=prior['parent_read'](message);data=(undo(folded) if kind=='candidate' else folded).encode()
  except ValueError as e:
   if str(e)=='unsupported layout':unsupported.append(dict(path=r['path'],kind=kind));continue
   mismatches.append(dict(path=r['path'],kind=kind,error=str(e)));continue
  except (AssertionError,KeyError) as e:mismatches.append(dict(path=r['path'],kind=kind,error=type(e).__name__));continue
  if data!=source:mismatches.append(dict(path=r['path'],kind=kind,error='source bytes'));continue
  checks+=1;wires+=1
out=dict(checks=checks,wireChecks=wires,unsupported=unsupported,mismatches=mismatches,native='NOT_RUN');Path('bench/x169/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
