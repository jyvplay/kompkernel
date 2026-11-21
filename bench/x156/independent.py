"""Independent Python interval inverse; inherited Python parent reader is separate.
No LLM behavior claimed. Tests use disk bytes, never encoder decoded field.
"""
import json,re,sys,importlib.util
from pathlib import Path
KEY='Decode body first. At line starts, @HEX+N or @N replaces an address range: start is HEX, or the previous @ record end; end=start+4096*N (N decimal). Write start-end in lowercase hex, each padded to at least 12 digits. Keep the rest verbatim. Print only.\n'
def undo(s):
 if len(s.encode('utf-16-le'))//2>50000:raise ValueError('cap')
 s.encode('utf8');previous=None;out=[]
 for line in s.split('\n'):
  if line.startswith('@'):
   m=re.match(r'@(?:([0-9a-f]{1,16})\+)?([1-9][0-9]{0,15})(?= )',line)
   if not m:raise ValueError('record')
   start=int(m[1],16) if m[1] is not None else previous
   if start is None:raise ValueError('initial')
   end=start+4096*int(m[2])
   if start%4096 or end>=2**64:raise ValueError('bounds')
   line=f'{start:012x}-{end:012x}'+line[m.end():];previous=end
  out.append(line)
 result='\n'.join(out)
 if len(result.encode('utf-16-le'))//2>50000:raise ValueError('output cap')
 return result
checks=0
for row in json.loads(Path('bench/x156/receipts/unit-fixtures.json').read_text()):
 assert undo(row['folded']).encode()==row['source'].encode();checks+=1
for bad in ['@1 rest','@0+0 rest','@0+01 rest','@1+1 rest','@fffffffffffff000+1 rest','@0+1x rest','@0+1\n','@0+10000000000000000 rest']:
 try:undo(bad)
 except ValueError:checks+=1
 else:raise AssertionError(bad)
spec=importlib.util.spec_from_file_location('parent','bench/x152/independent.py');parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent)
rows=[]
for arg in sys.argv[1:]:
 row=json.loads(Path(arg).read_text());wire=row['message'];assert wire.startswith(KEY)
 # Reuse the independently implemented X152 parent grammar reader.
 folded=parent.parent_read(wire[len(KEY):]);source=Path(row['path']).read_bytes();assert undo(folded).encode()==source
 rows.append({'path':row['path'],'bytes':len(source),'passed':True});checks+=1
Path('bench/x156/receipts/independent.json').write_text(json.dumps({'checks':checks,'fullMessages':rows,'native':False},indent=2));print(checks,rows)
