"""Independent Newton-binomial evaluator: does NOT replay TS update loop."""
import json,re,math
from pathlib import Path
KEY='Decode first. Each !curve N S column;column line generates N rows. Each column lists a,d,...: print a, then add each next difference to its predecessor left to right after each row. S is s=space,t=tab,c=comma between columns; LF between rows. Replace that line only; preserve other text; print only.\n'
def undo(s):
 out=[]
 for line in s.split('\n'):
  if line.startswith('!curve'):
   m=re.fullmatch(r'!curve ([1-9][0-9]{0,3}) ([stc]) (.+)',line)
   if not m:raise ValueError('header')
   n=int(m[1]);assert 8<=n<=2000
   aa=[]
   for col in m[3].split(';'):
    assert all(re.fullmatch(r'-?(0|[1-9][0-9]*)',v) and v!='-0' for v in col.split(','))
    a=list(map(int,col.split(',')));assert 1<=len(a)<=5 and (len(a)==1 or a[-1]!=0);aa.append(a)
   assert 1<=len(aa)<=16 and any(len(a)>=3 for a in aa)
   sep={'s':' ','t':'\t','c':','}[m[2]]
   line='\n'.join(sep.join(str(sum(math.comb(r,k)*d for k,d in enumerate(a) if k<=r)) for a in aa) for r in range(n))
  out.append(line)
 result='\n'.join(out);assert len(result.encode('utf-16-le'))//2<=50000
 return result.encode()
checks=0
for r in json.loads(Path('bench/x161/receipts/unit-pairs.json').read_text()):
 assert undo(r['folded'])==r['source'].encode();checks+=1
rows=[]
# Reuse the existing independent AP/CHIRON reader definitions, not its test runner.
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0], 'bench/x159/independent.py', 'exec'),prior)
for seq in ['000290','000578','000217','000583']:
 r=json.loads(Path(f'bench/x161/receipts/{seq}-candidate.json').read_text());assert r['message'].startswith(KEY)
 source=Path(r['path']).read_bytes();assert undo(r['message'][len(KEY):])==source;checks+=1;rows.append(seq+' candidate')
 b=json.loads(Path(f'bench/x161/receipts/{seq}-base.json').read_text());assert prior['parent_read'](b['message']).encode()==source;checks+=1;rows.append(seq+' baseline')
# A patch-specific noncommutativity witness: right-to-left would emit 0,3,8,
# not the correct 0,1,4. Independent closed form detects it.
assert undo('!curve 8 s 0,1,2').splitlines()[:3]==[b'0',b'1',b'4'];checks+=1
Path('bench/x161/receipts/independent.json').write_text(json.dumps({'checks':checks,'passed':True,'completeMessages':rows,'method':'exact Newton binomial formula; independent of iterative implementation','native':False},indent=2));print(checks)
