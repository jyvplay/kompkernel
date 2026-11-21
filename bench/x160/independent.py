"""Independent Python record parser; checks source bytes, not encoder flags."""
import json,re
from pathlib import Path
record=re.compile(r'!diff ([A-Za-z0-9_./@+,-]+) ([0-9a-f]{4,64}\.\.[0-9a-f]{4,64}) ([0-7]{6})',re.ASCII)
def undo(s):
 out=[]
 for line in s.split('\n'):
  if line.startswith('!diff'):
   m=record.fullmatch(line)
   if not m:raise ValueError('record')
   p,h,mode=m.groups();line=f'diff --git a/{p} b/{p}\nindex {h} {mode}\n--- a/{p}\n+++ b/{p}'
  out.append(line)
 result='\n'.join(out)
 if len(result.encode('utf-16-le'))//2>50000:raise ValueError('cap')
 return result.encode()
checks=0
for r in json.loads(Path('bench/x160/receipts/unit-pairs.json').read_text()):
 assert undo(r['folded'])==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x160/receipts/screen.json').read_text()):
 if r.get('folded'):
  assert undo(r['folded'])==Path(r['path']).read_bytes();checks+=1
for bad in ['!diff','!diff x abcd..0123 100648','!diff x abcd..0123 100644 extra','!different']:
 try:undo(bad)
 except ValueError:checks+=1
 else:raise AssertionError(bad)
Path('bench/x160/receipts/independent.json').write_text(json.dumps({'checks':checks,'passed':True,'scope':'raw folded records; not native behavior or unsupported parent grammars'},indent=2))
print(checks)
