import json
from pathlib import Path
KEY='Decode first. Replace each line consisting of ^ with the uppercase ASCII letters and digits from the next line, stopping before its first " [" if present. Preserve everything else; print only.\n'
def undo(text):
 lines=text.split('\n')
 for i,line in enumerate(lines):
  if line=='^':
   assert i+1<len(lines) and lines[i+1].startswith('    ')
   definition=lines[i+1].partition(' [')[0]
   value=''.join(c for c in definition if 65<=ord(c)<=90 or 48<=ord(c)<=57)
   assert 2<=len(value)<=16
   lines[i]=value
 result='\n'.join(lines);assert len(result.encode('utf-16-le'))//2<=50000
 return result.encode()
checks=0
for r in json.loads(Path('bench/x162/receipts/unit-pairs.json').read_text()):
 assert undo(r['folded'])==r['source'].encode();checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'bench/x159/independent.py','exec'),prior)
rows=[]
for arm in ['base','candidate']:
 r=json.loads(Path(f'bench/x162/receipts/cp2k-{arm}.json').read_text());m=r['message']
 if arm=='candidate':
  assert m.startswith(KEY);decoded=undo(prior['parent_read'](m[len(KEY):]))
 else:decoded=prior['parent_read'](m).encode()
 assert decoded==Path(r['path']).read_bytes();checks+=1;rows.append({'arm':arm,'sourceBytesEqual':True,'tokens':r['tokens']})
assert undo('^\n    Alpha Beta [ZZ99]')==b'AB\n    Alpha Beta [ZZ99]';checks+=1
Path('bench/x162/receipts/independent.json').write_text(json.dumps({'checks':checks,'rows':rows,'passed':True,'native':False,'method':'separate ordinal-character projection and reused independent Python CHIRON/AP reader'},indent=2));print(checks)
