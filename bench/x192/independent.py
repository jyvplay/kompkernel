"""Separate Python implementation: no JS inverse import, strict literal witnesses."""
import json,re
from pathlib import Path
r=Path('bench/x192/receipts')
def units(s):return len(s.encode('utf-16-le'))//2
def undo(s):
 if units(s)>50000:raise ValueError('cap')
 parts=re.findall(r'\^[A-Za-z]+|[A-Za-z]+|[^A-Za-z]+',s)
 # regex nonletters can swallow ^ before a ref; use scanner instead
 parts=[];at=0
 for m in re.finditer(r'\^[A-Za-z]+|[A-Za-z]+',s):parts.extend([s[at:m.start()],m[0]]);at=m.end()
 parts.append(s[at:]);words=set();events=0
 for p in parts:
  if re.fullmatch('[A-Za-z]+',p):
   if len(p)>96:raise ValueError('word cap')
   words.add(p);events+=1
  elif p.startswith('^') and re.fullmatch(r'\^[A-Za-z]{1,4}',p):events+=1
  elif '^' in p:raise ValueError('marker')
 if events>10000:raise ValueError('events')
 out=[]
 for p in parts:
  if p.startswith('^'):
   matches=[w for w in words if p[1:] in w]
   if len(matches)!=1:raise ValueError('witness')
   p=matches[0]
  out.append(p)
 result=''.join(out)
 if units(result)>50000:raise ValueError('expansion')
 return result
checks=0
for p in json.loads((r/'unit-pairs.json').read_text()):assert undo(p['folded']).encode()==p['source'].encode();checks+=1
attacks=json.loads((r/'attacks.json').read_text())
for x in attacks:
 try:undo(x)
 except (ValueError,UnicodeError):checks+=1
 else:raise AssertionError('accepted attack')
(r/'independent.json').write_text(json.dumps(dict(checks=checks,malformedRejected=len(attacks),scope='MARTYS only; parent inverse separately in worker'),indent=2));print(checks)
