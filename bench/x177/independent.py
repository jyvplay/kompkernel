"""Independent Python histogram order + occurrence-count LF. Not model behavior."""
import json,collections,importlib.util
from pathlib import Path
checks=0
def inverse_group(last,order):
 counts=collections.Counter(last)
 alphabet=sorted(counts,key=lambda s:((1 if order=='increasing' else -1)*counts[s],s));rank={s:i for i,s in enumerate(alphabet)}
 first={};total=0
 for s in alphabet:first[s]=total;total+=counts[s]
 seen=collections.Counter();lf=[]
 for s in last:lf.append(first[s]+seen[s]);seen[s]+=1
 done=set();cycles=[]
 for start in range(len(last)):
  if start in done:continue
  c=[];i=start
  while i not in done:done.add(i);c.append(rank[last[i]]);i=lf[i]
  assert i==start
  c.reverse();cycles.append(min(c[i:]+c[:i] for i in range(len(c))))
 return [alphabet[r] for c in sorted(cycles,reverse=True) for r in c]
def undo(s,n,order):
 fields=s.split(' ');return ' '.join(v for i in range(0,len(fields),n) for v in inverse_group(fields[i:i+n],order))
for r in json.loads(Path('bench/x177/receipts/unit-pairs.json').read_text()):assert undo(r['folded'],r['n'],r['order'])==r['source'];checks+=1
for r in json.loads(Path('bench/x177/receipts/screen.json').read_text())['rows']:
 for p in r.get('plans',[]):assert undo(p['folded'],p['n'],p['order']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;unsupported=[]
for file in Path('bench/x177/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text())
 for c in r['candidates']:
  try:body=reader.parent_read(c['parent'])
  except ValueError as e:unsupported.append({'path':r['path'],'error':str(e)});continue
  assert undo(body,c['n'],c['order']).encode()==Path(r['path']).read_bytes();wires+=1;checks+=1
Path('bench/x177/receipts/independent.json').write_text(json.dumps(dict(checks=checks,paidExact=wires,unsupported=unsupported,native='NOT_RUN'),indent=2));print(checks,wires,unsupported)
