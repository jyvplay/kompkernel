"""Separate Python enumeration inverse; same author, not independent personnel."""
import json,re,importlib.util
from pathlib import Path
R=Path('bench/x191/receipts')
def units(s):return len(s.encode('utf-16-le'))//2
def field(s):return isinstance(s,str) and units(s)<=96 and ' ' not in s and '~' not in s

def undo(folded):
 assert units(folded)<=200000
 v=json.loads(folded);assert isinstance(v,list) and len(v)==2 and isinstance(v[0],list) and len(v[0])<=256 and isinstance(v[1],str)
 g={};edges=0
 for row in v[0]:
  assert isinstance(row,list) and len(row)==2 and field(row[0]) and isinstance(row[1],str) and row[0] not in g
  bs=row[1].split(' ');assert all(map(field,bs)) and len(set(bs))==len(bs);edges+=len(bs);assert edges<=512;g[row[0]]=bs
 tape=v[1].split(' ');out=[];holes=0
 for i,t in enumerate(tape):
  if '~' not in t:out.append(t);continue
  assert re.fullmatch('~[1-8];',t) and 0<i<len(tape)-1 and '~' not in tape[i-1]+tape[i+1];holes+=1;assert holes<=1024
  # Independent memoized suffix enumeration, retaining at most two witnesses.
  memo={}
  def paths(a,remaining):
   key=(a,remaining)
   if key in memo:return memo[key]
   if remaining==0:return [()] if a==tape[i+1] else []
   found=[]
   for b in g.get(a,[]):
    for suffix in paths(b,remaining-1):
     found.append((b,)+suffix)
     if len(found)==2:memo[key]=found;return found
   memo[key]=found;return found
  matches=paths(tape[i-1],int(t[1])+1);assert len(matches)==1;out.extend(matches[0][:-1])
 source=' '.join(out);assert units(source)<=50000;return source
checks=0
for p in json.loads((R/'unit-pairs.json').read_text()):assert undo(p['folded']).encode()==p['source'].encode();checks+=1
attacks=0
for x in json.loads((R/'attacks.json').read_text()):
 try:undo(x)
 except (AssertionError,ValueError,TypeError,UnicodeError):attacks+=1
 else:raise AssertionError('accepted malformed frame')
spec=importlib.util.spec_from_file_location('parent','bench/x182/cue-reader.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent);paid=[]
for f in sorted(R.glob('paid-[0-9][0-9].json')):
 x=json.loads(f.read_text())
 try:source=undo(parent.parent_read(x['parent']))
 except (AssertionError,ValueError,TypeError,UnicodeError) as e:paid.append(dict(file=str(f),status='unsupported',error=str(e)));continue
 assert source.encode()==Path(x['path']).read_bytes();checks+=1;paid.append(dict(file=str(f),status='exact'))
canonical=[]
for x in map(json.loads,(R/'frontier.jsonl').read_text().splitlines()):
 try:actual=parent.parent_read(x['message'])
 except (AssertionError,ValueError,TypeError,UnicodeError) as e:canonical.append(dict(path=x['path'],status='unsupported',error=str(e)));continue
 assert actual.encode()==Path(x['path']).read_bytes();canonical.append(dict(path=x['path'],status='exact'))
result=dict(checks=checks,attacks=attacks,paid=paid,canonical=canonical,native='NOT_RUN',independentPersonnel=False);(R/'independent.json').write_text(json.dumps(result,indent=2));print(result)
