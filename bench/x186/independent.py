"""Independent Python interval reader; not an external person or native model."""
import json,re,importlib.util
from pathlib import Path
KEY='Decode payload first. JSON [pool,ranges,body]. Each [start,length] range names a substring of the ASCII pool, using zero-based character positions; ranges are numbered from 1. Replace each ~N; in body once with range N, without rescanning. Preserve everything else; print only.\n'
def units(s):return len(s.encode('utf-16-le'))//2
def undo(w):
 assert units(w)<=220000;x=json.loads(w);assert isinstance(x,list) and len(x)==3;pool,ranges,body=x
 assert isinstance(pool,str) and len(pool)<=12288 and all(32<=ord(c)<=126 for c in pool)
 assert isinstance(ranges,list) and len(ranges)<=96 and isinstance(body,str) and units(body)<=50000
 d=[]
 for r in ranges:
  assert isinstance(r,list) and len(r)==2 and all(type(n)==int for n in r);p,n=r;assert p>=0 and 1<=n<=128 and p+n<=len(pool);d.append(pool[p:p+n])
 out=[];at=0;size=0
 for m in re.finditer(r'~([1-9][0-9]?);',body):
  s=body[at:m.start()];assert '~' not in s and int(m[1])<=len(d);s+=d[int(m[1])-1];size+=units(s);assert size<=50000;out.append(s);at=m.end()
 tail=body[at:];assert '~' not in tail;out.append(tail);result=''.join(out);assert units(result)<=50000;result.encode('utf8');return result
root=Path('bench/x186/receipts');checks=0
for r in json.loads((root/'unit-pairs.json').read_text()):assert undo(r['folded'])==r['source'];checks+=1
for r in json.loads((root/'screen.json').read_text())['rows']:
 if r['family']=='desmi':
  for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
for r in json.loads((root/'post-frontier.json').read_text()):
 baseline=next(json.loads(s) for s in Path('bench/x185/receipts/frontier.jsonl').read_text().splitlines() if json.loads(s)['path']==r['path'])
 for p in r['plans']:assert undo(p['folded'])==baseline['message'];checks+=1
attacks=0
for w in json.loads((root/'attacks.json').read_text()):
 try:undo(w)
 except (AssertionError,ValueError,UnicodeError,TypeError):attacks+=1
 else:raise AssertionError('accepted attack')
spec=importlib.util.spec_from_file_location('parent','bench/x182/cue-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent);paid=[]
for p in sorted(root.glob('paid-[0-9][0-9].json')):
 r=json.loads(p.read_text())
 if r['status']=='ineligible':continue
 assert r['message']==KEY+r['parent']
 try:s=undo(parent.parent_read(r['parent']))
 except (ValueError,AssertionError) as e:paid.append(dict(file=str(p),status='unsupported',error=str(e)));continue
 assert s.encode()==Path(r['path']).read_bytes();checks+=1;paid.append(dict(file=str(p),status='exact'))
result=dict(checks=checks,attacks=attacks,paid=paid,native='NOT_RUN');(root/'independent.json').write_text(json.dumps(result,indent=2));print(result)
