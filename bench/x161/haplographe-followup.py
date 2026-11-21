import json,re
from pathlib import Path
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'bench/x159/independent.py','exec'),prior)
key='Decode first. Expand !diff P H M lines to:\ndiff --git a/P b/P\nindex H M\n--- a/P\n+++ b/P\nSubstitute literally; otherwise preserve; print only.\n'
b=json.loads(Path('bench/x161/receipts/haplographe-base.json').read_text());c=json.loads(Path('bench/x161/receipts/haplographe-candidate.json').read_text());source=Path(c['path']).read_bytes();assert prior['parent_read'](b['message']).encode()==source
assert c['message'].startswith(key);folded=prior['parent_read'](c['message'][len(key):]);lines=[]
for line in folded.split('\n'):
 if line.startswith('!diff'):
  m=re.fullmatch(r'!diff ([A-Za-z0-9_./@+,-]+) ([0-9a-f]{4,64}\.\.[0-9a-f]{4,64}) ([0-7]{6})',line);assert m
  p,h,mode=m.groups();line=f'diff --git a/{p} b/{p}\nindex {h} {mode}\n--- a/{p}\n+++ b/{p}'
 lines.append(line)
assert '\n'.join(lines).encode()==source
Path('bench/x161/receipts/haplographe-independent.json').write_text(json.dumps({'completeMessages':2,'sourceExact':True,'base':b['tokens'],'candidate':c['tokens'],'saving':b['tokens']-c['tokens'],'significant':False,'native':False},indent=2))
