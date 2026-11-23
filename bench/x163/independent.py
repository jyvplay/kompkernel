"""Independent ordinal-character slug inverse and reused independent parent reader."""
import json,re
from pathlib import Path
KEY='Decode first. In [label](^) links, replace ^ with # followed by label lowercased, deleting all characters except a-z, 0-9, spaces, _ and -, then replacing each space with -. Preserve everything else; print only.\n'
def undo(text):
 def replace(m):
  label=m[1];assert all(32<=ord(c)<=126 for c in label)
  slug=''
  for c in label:
   if 65<=ord(c)<=90:c=chr(ord(c)+32)
   if c==' ':slug+='-'
   elif 'a'<=c<='z' or '0'<=c<='9' or c in '_-':slug+=c
  assert slug
  return '['+label+'](#'+slug+')'
 result=re.sub(r'\[([^\[\]\r\n]{1,500})\]\(\^\)',replace,text);assert len(result.encode('utf-16-le'))//2<=50000
 return result.encode()
checks=0
for r in json.loads(Path('bench/x163/receipts/unit-pairs.json').read_text()):assert undo(r['folded'])==r['source'].encode();checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'bench/x159/independent.py','exec'),prior)
rows=[]
for name in ['pure-sh','ohmyzsh']:
 for arm in ['base','candidate']:
  path=Path(f'bench/x163/receipts/{name}-{arm}.json')
  if not path.exists():continue
  r=json.loads(path.read_text());m=r['message'];decoded=undo(prior['parent_read'](m[len(KEY):])) if m.startswith(KEY) else prior['parent_read'](m).encode()
  assert decoded==Path(r['path']).read_bytes();checks+=1;rows.append({'name':name,'arm':arm,'sourceBytesEqual':True,'tokens':r['tokens']})
Path('bench/x163/receipts/independent.json').write_text(json.dumps({'checks':checks,'rows':rows,'passed':True,'native':False,'method':'ordinal-character inverse; reused independent Python CHIRON/AP reader'},indent=2));print(checks,rows)
