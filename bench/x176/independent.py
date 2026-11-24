"""Independent Python LF inverse using occurrence counts, not JS sorted indices."""
import json,collections,importlib.util
from pathlib import Path
checks=0
def block(last):
 counts=collections.Counter(last);first={};n=0
 for value,count in sorted(counts.items()):first[value]=n;n+=count
 seen=collections.Counter();lf=[]
 for v in last:lf.append(first[v]+seen[v]);seen[v]+=1
 done=set();cycles=[]
 for start in range(len(last)):
  if start in done:continue
  c=[];j=start
  while j not in done:done.add(j);c.append(last[j]);j=lf[j]
  assert j==start
  c=c[::-1];cycles.append(min(c[i:]+c[:i] for i in range(len(c))))
 return sum(sorted(cycles,reverse=True),[])
def undo(s,n):
 fields=s.split(' ');return ' '.join(v for i in range(0,len(fields),n) for v in block(fields[i:i+n]))
for r in json.loads(Path('bench/x176/receipts/unit-pairs.json').read_text()):assert undo(r['folded'],r['n'])==r['source'];checks+=1
for r in json.loads(Path('bench/x176/receipts/screen.json').read_text())['rows']:
 for p in r.get('plans',[]):assert undo(p['folded'],p['n']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;unsupported=[]
for file in Path('bench/x176/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for p in r['candidates']:
  try:body=reader.parent_read(p['parent'])
  except ValueError as e:unsupported.append(dict(path=r['path'],error=str(e)));continue
  assert undo(body,p['n']).encode()==source;checks+=1;wires+=1
import re
strofos=0
for r in json.loads(Path('bench/x176/receipts/strofos-tournament.json').read_text())['rows']:
 for p in r['candidates']:
  body=reader.parent_read(p['parent'])
  def rotate(m):
   n=int(m[1]);w=m[2];assert 0<n<len(w)<=48
   return w[-n:]+w[:-n]
  restored=re.sub(r'~([1-9][0-9]?):([A-Za-z]+)',rotate,body)
  assert restored.encode()==Path(r['path']).read_bytes();checks+=1;strofos+=1
Path('bench/x176/receipts/independent.json').write_text(json.dumps(dict(checks=checks,paidExact=wires,strofosTournamentExact=strofos,unsupported=unsupported,native='NOT_RUN'),indent=2));print(checks,wires,strofos,unsupported)
