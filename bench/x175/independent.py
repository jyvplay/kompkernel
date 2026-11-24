"""Independent lexical rotation reader. Original bytes, not encoder labels."""
import json,re
from pathlib import Path
checks=0
def undo(s):
 def sub(m):
  n=int(m[1]);w=m[2]
  assert 0<n<len(w)<=48
  return w[-n:]+w[:-n]
 assert '~' not in re.sub(r'~[1-9][0-9]?:[A-Za-z]+','',s)
 return re.sub(r'~([1-9][0-9]?):([A-Za-z]+)',sub,s)
for r in json.loads(Path('bench/x175/receipts/unit-pairs.json').read_text()):
 if 'word' in r:
  w=r['word'];rep=r['representative'];n=r['shift']
  assert rep==min(w[i:]+w[:i] for i in range(len(w)))
  assert (rep[-n:]+rep[:-n] if n else rep)==w
 else:assert undo(r['folded'])==r['source']
 checks+=1
for r in json.loads(Path('bench/x175/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:
  assert undo(p['folded']).encode()==Path(r['path']).read_bytes()
  checks+=1
import importlib.util
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;unsupported=[]
for file in Path('bench/x175/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:body=reader.parent_read(message)
  except ValueError as e:unsupported.append(dict(path=r['path'],kind=kind,error=str(e)));continue
  assert (undo(body) if kind=='candidate' else body).encode()==source
  wires+=1;checks+=1
Path('bench/x175/receipts/independent.json').write_text(json.dumps({'checks':checks,'paidParentExact':wires,'unsupported':unsupported,'native':'NOT_RUN'},indent=2))
print(checks)
