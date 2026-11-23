"""Independent CPython suffix search and forward stable-sort BWT inverse.
Full messages are compared with original files; encoder decoded fields unused.
"""
import re,json
from pathlib import Path
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'inherited-parent-reader','exec'),prior)
def domain(s):assert len(s.encode('utf-16-le'))//2<=50000

def undo(s,k):
 domain(s);assert k in (4,8,16);out='';i=0
 while i<len(s):
  if s[i]=='~' and i+1<len(s) and s[i+1] in '0123456789':
   m=re.match(r'~([1-9][0-9]{0,3});',s[i:]);assert m
   n=int(m[1]);assert len(out)>=k and n<=4096
   at=out.rfind(out[-k:],0,len(out)-1);assert at>=0
   start=at+k;assert start+n<=len(out)
   out+=out[start:start+n];i+=len(m[0])
  else:out+=s[i];i+=1
  domain(out)
 return out
HEAD=re.compile(r'^Decode first\. Scan left to right: ~N; copies N Unicode (?:characters|code points) following the latest earlier occurrence of the preceding (4|8|16) output (?:characters|code points), entirely within existing output\. Preserve everything else; print only\.\n')
def read(m):
 h=HEAD.match(m)
 return undo(prior['parent_read'](m[h.end():]),int(h[1])) if h else prior['parent_read'](m)
def bwt(s,index):
 a=s.split(' ');nexts=sorted(range(len(a)),key=lambda i:(a[i],i));first=sorted(a);out=[]
 assert 0<=index<len(a)
 for _ in a:out.append(first[index]);index=nexts[index]
 return ' '.join(out)
checks=0
for r in json.loads(Path('bench/x165/receipts/unit-pairs.json').read_text()):assert undo(r['folded'],r['k']).encode()==r['source'].encode();checks+=1
for bad in ['~0;','~01;','~1;','abcd~12;','abcdXabcd~6;','abcdXabcd~4097;','abcdXabcd~1','abcdXabcd~1x;','abcdLONGPAYLOADabcdZabcd~10;']:
 try:undo(bad,4)
 except AssertionError:checks+=1
 else:raise AssertionError('malformed accepted')
rows=[]
for f in Path('bench/x165/receipts').glob('*-trial.json'):
 r=json.loads(f.read_text())
 if 'result' not in r:continue
 source=Path(r['path']).read_bytes();assert read(r['base']['message']).encode()==source;assert read(r['result']['message']).encode()==source;checks+=2
 for p in r['parents']:assert prior['parent_read'](p['message'])==p['folded'];checks+=1
 if 'bwt' in r:
  p=r['bwt'];assert bwt(prior['parent_read'](p['parent']),p['index']).encode()==source;checks+=1
 rows.append({'path':r['path'],'base':r['base']['tokens'],'selected':r['result']['tokens'],'saved':r['base']['tokens']-r['result']['tokens'],'sourceBytesEqual':True})
final=Path('bench/x165/receipts/final-contract.json')
if final.exists():
 for r in json.loads(final.read_text()):
  source=Path(r['path']).read_bytes();assert read(r['result']['message']).encode()==source;checks+=1
  for p in r['candidates']:assert read(p['message']).encode()==source;checks+=1
for f in Path('bench/x165/receipts').glob('bwt-*.json'):
 r=json.loads(f.read_text());assert bwt(prior['parent_read'](r['parent']),r['index']).encode()==Path(r['path']).read_bytes();checks+=1
oldhead=re.compile(r'^Decode first\. Scan left to right; ~N; copies N Unicode characters immediately after the latest earlier occurrence of the last (4|8|16) output characters\. Copy only already output text, without overlap\. Preserve everything else; print only\.\n')
for f in Path('bench/x165/receipts').glob('context-*.json'):
 r=json.loads(f.read_text())
 if not isinstance(r,dict) or 'message' not in r:continue
 h=oldhead.match(r['message']);assert h
 assert undo(prior['parent_read'](r['message'][h.end():]),int(h[1])).encode()==Path(r['path']).read_bytes();checks+=1
for r in json.loads(Path('bench/x165/receipts/portfolio.json').read_text())['rows']:
 p=r['blockSort'];assert bwt(p['folded'],p['index']).encode()==Path(r['path']).read_bytes();checks+=1
result={'checks':checks,'rows':rows,'native':'NOT_RUN','passed':True};Path('bench/x165/receipts/independent.json').write_text(json.dumps(result,indent=2));print(result)
