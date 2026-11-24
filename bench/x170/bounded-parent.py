"""Independent extension for the exact existing fused OURA decimal envelope.
Unknown instruction envelopes fail closed, not identity-decoded. This remains
bounded: no new support for column generators, mask deltas or chmod wrappers.
"""
import re
from pathlib import Path
ns={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'inherited-reader','exec'),ns)
DEC=re.compile(r'^¶k=v expand repeatedly After ~, a number has \. before its last ([1-6]) digits\. print only\.\n')
def parent_read(message):
 m=DEC.match(message)
 if m:
  n=int(m[1]);body=ns['parent_read']('Before ¶ k=v. expand repeatedly; print only.\n'+message[m.end():])
  def restore(hit):
   d=hit[1]
   if len(d)<=n:raise ValueError('short decimal marker outside supported envelope')
   return d[:-n]+'.'+d[-n:]
  if re.search(r'~(?![0-9])',body):raise ValueError('bare decimal marker')
  return re.sub(r'~([0-9]+)',restore,body)
 result=ns['parent_read'](message)
 if result==message and message.startswith(('¶','Body first.','spec:','Decode','Before ')):
  raise ValueError('unsupported instruction envelope')
 return result
