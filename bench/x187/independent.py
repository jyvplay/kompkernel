"""Independent Python routing reader; code verification, not native chat."""
import json,importlib.util
from pathlib import Path
KEY='Decode payload first. JSON blocks [counts,A,B]. For each block, consume counts of Unicode code points (not grapheme clusters) alternately from A then B, starting with A; zero first count is allowed. Concatenate the consumed pieces and then the blocks, without separators. Both streams must be exhausted exactly. Preserve all characters; print only.\n'
def units(s):return len(s.encode('utf-16-le'))//2
def undo(w):
 assert units(w)<=400000;rows=json.loads(w);assert isinstance(rows,list) and 1<=len(rows)<=196;out=[];size=0;total=0
 for row in rows:
  assert isinstance(row,list) and len(row)==3;counts,a,b=row;assert isinstance(counts,list) and 1<=len(counts)<=50001 and isinstance(a,str) and isinstance(b,str)
  size+=units(a)+units(b);total+=len(counts);assert size<=50000 and total<=50200;streams=[a,b];at=[0,0]
  for i,n in enumerate(counts):
   assert type(n)==int and (1 if i else 0)<=n<=50000;k=i%2;end=at[k]+n;assert end<=len(streams[k]);out.append(streams[k][at[k]:end]);at[k]=end
  assert all(at[k]==len(streams[k]) for k in [0,1])
 result=''.join(out);assert units(result)<=50000;result.encode('utf8');return result
root=Path('bench/x187/receipts');checks=0
for r in json.loads((root/'unit-pairs.json').read_text()):assert undo(r['folded'])==r['source'];checks+=1
for r in json.loads((root/'screen.json').read_text())['rows']:
 if r['family']=='diameris':
  for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
base={r['path']:r for r in map(json.loads,Path('bench/x186/receipts/frontier.jsonl').read_text().splitlines())}
for r in json.loads((root/'post-frontier.json').read_text()):
 for p in r['plans']:assert undo(p['folded'])==base[r['path']]['message'];checks+=1
attacks=0
for w in json.loads((root/'attacks.json').read_text()):
 try:undo(w)
 except (AssertionError,ValueError,UnicodeError,TypeError):attacks+=1
 else:raise AssertionError('accepted attack')
spec=importlib.util.spec_from_file_location('parent','bench/x182/cue-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent);paid=[]
for p in sorted([*root.glob('paid-[0-9][0-9].json'),*root.glob('forced-[0-9][0-9].json')]):
 r=json.loads(p.read_text())
 if r['status']=='ineligible':continue
 assert r['message']==KEY+r['parent']
 try:s=undo(parent.parent_read(r['parent']))
 except (ValueError,AssertionError) as e:paid.append(dict(file=str(p),status='unsupported',error=str(e)));continue
 assert s.encode()==Path(r['path']).read_bytes();checks+=1;paid.append(dict(file=str(p),status='exact'))
result=dict(checks=checks,attacks=attacks,paid=paid,native='NOT_RUN');(root/'independent.json').write_text(json.dumps(result,indent=2));print(result)
