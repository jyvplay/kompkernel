"""Separate Python inverse, executed by the same agent; not native behavior."""
import json,re,importlib.util
from pathlib import Path
def units(s):return len(s.encode('utf-16-le'))//2
def undo(f):
 assert units(f)<=150000;v=json.loads(f);assert isinstance(v,list) and len(v)==2 and isinstance(v[0],list) and len(v[0])<=64 and isinstance(v[1],str) and units(v[1])<=150000
 words=[]
 for row in v[0]:
  if isinstance(row,str):w=row
  else:
   assert isinstance(row,list) and len(row)==5
   l,p,m,r,s=row;assert all(type(x)is int for x in [l,p,r,s]) and isinstance(m,str) and re.fullmatch('[A-Za-z0-9_./-]*',m)
   assert 1<=l<=len(words) and 1<=r<=len(words) and 0<=p<=len(words[l-1]) and 0<=s<=len(words[r-1]) and p+len(m)+s<=96
   w=words[l-1][:p]+m+(words[r-1][-s:] if s else '')
  assert re.fullmatch('[A-Za-z0-9_./-]{1,96}',w) and w not in words;words.append(w)
 out=[];last=0
 for m in re.finditer(r'~([1-9][0-9]?);',v[1]):
  literal=v[1][last:m.start()];assert '~' not in literal and int(m[1])<=len(words)
  out.extend([literal,words[int(m[1])-1]]);last=m.end()
 tail=v[1][last:];assert '~' not in tail;out.append(tail);source=''.join(out);assert units(source)<=50000;return source
r=Path('bench/x190/receipts');checks=0;attacks=0
for x in json.loads((r/'unit-pairs.json').read_text()):assert undo(x['folded']).encode()==x['source'].encode();checks+=1
for row in json.loads((r/'screen.json').read_text())['rows']:
 if row['family']!='dipigi':continue
 for p in row['plans']:assert undo(p['folded']).encode()==Path(row['path']).read_bytes();checks+=1
for f in json.loads((r/'attacks.json').read_text()):
 try:undo(f)
 except (AssertionError,ValueError,UnicodeError,TypeError):attacks+=1
 else:raise AssertionError('accepted attack')
spec=importlib.util.spec_from_file_location('parent','bench/x182/cue-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent);paid=[]
for f in sorted(r.glob('paid-[0-9][0-9].json')):
 x=json.loads(f.read_text())
 try:actual=undo(parent.parent_read(x['parent']))
 except (AssertionError,ValueError,UnicodeError,TypeError) as e:paid.append(dict(file=str(f),status='unsupported',error=str(e)));continue
 assert actual.encode()==Path(x['path']).read_bytes();checks+=1;paid.append(dict(file=str(f),status='exact'))
result=dict(checks=checks,attacks=attacks,paid=paid,native='NOT_RUN',independentPersonnel=False);(r/'independent.json').write_text(json.dumps(result,indent=2));print(result)
