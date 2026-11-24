"""Independent regex substitution inverse: no shared TS splitting/index code."""
import json,re,importlib.util
from pathlib import Path

def undo(folded):
 assert len(folded.encode('utf-16-le'))//2<=50000
 pattern=r'~([A-Za-z]+)';stripped=re.sub(pattern,' ',folded);assert '~' not in stripped
 anchors=set(re.findall('[A-Za-z]+',stripped))
 def resolve(m):
  assert len(m[1])<=100;hits=[w for w in anchors if m[1] in w];assert len(hits)==1;return hits[0]
 out=re.sub(pattern,resolve,folded);assert len(out.encode('utf-16-le'))//2<=50000;return out
checks=0
for r in json.loads(Path('bench/x172/receipts/unit-pairs.json').read_text()):assert undo(r['folded']).encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x172/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;errors=[]
for file in Path('bench/x172/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:
   folded=reader.parent_read(message);out=undo(folded) if kind=='candidate' else folded;assert out.encode()==source
  except (ValueError,AssertionError,KeyError) as e:errors.append(dict(path=r['path'],kind=kind,error=repr(e)));continue
  wires+=1;checks+=1
for f in ['alpha alphabet ~pha','~a ~b','ab~x cd x ~abcd','~','abc ~'+'a'*101]:
 try:undo(f)
 except (ValueError,AssertionError):checks+=1
 else:raise AssertionError('attack accepted')
out=dict(checks=checks,wireChecks=wires,errors=errors,native='NOT_RUN');Path('bench/x172/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)

assert not errors, 'independent parent reconstruction failed'
