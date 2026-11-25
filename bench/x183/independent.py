"""Separate Python implementation; no encoder imports. Software, not native chat."""
import json,re
from pathlib import Path
def units(s):return len(s.encode('utf-16-le'))//2
def undo(s):
 assert units(s)<=100000
 rows,body=json.loads(s);assert isinstance(rows,list) and len(rows)<=64 and isinstance(body,str)
 words=[]
 for r in rows:
  if isinstance(r,str):w=r
  else:
   assert isinstance(r,list) and len(r)==4
   i,p,t,m=r;assert all(type(x)==int for x in (i,p,t)) and 1<=i<=len(words) and p>=0 and t>=0 and isinstance(m,str) and re.fullmatch(r'[A-Za-z0-9_./-]*',m)
   parent=words[i-1];assert p+t<=len(parent);w=parent[:p]+m+(parent[-t:] if t else '')
  assert re.fullmatch(r'[A-Za-z0-9_./-]{1,96}',w) and w not in words;words.append(w)
 def sub(m):
  i=int(m[1]);assert 1<=i<=len(words);return words[i-1]
 out=re.sub(r'~([1-9][0-9]*);',sub,body);assert '~' not in out and units(out)<=50000;out.encode('utf8');return out
if __name__=='__main__':
 count=0
 for r in json.loads(Path('bench/x183/receipts/unit-pairs.json').read_text()):assert undo(r['folded'])==r['source'];count+=1
 for r in json.loads(Path('bench/x183/receipts/screen.json').read_text())['rows']:
  for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();count+=1
 bad=[[[[1,0,0,'a']],'~1;'],[['abc',[1,2,2,'d']],'~2;'],[['abc','abc'],'~1;'],[['abc'],'~0;'],[['abc'],'~01;'],[['abc'],'~2;'],[['abc'],'~1'],[['abc',[1,0,0,'']],'~2;'],[['abc',[1,0,0,'~1;']],'~2;'],[['a'*97],'~1;'],[['x'*96],'~1;'*1000]]
 for v in bad:
  try:undo(json.dumps(v))
  except (AssertionError,ValueError,UnicodeError):pass
  else:raise AssertionError(v)
 result=dict(exact=count,attacks=len(bad),native='NOT_RUN',paidParent='not independently decoded here');Path('bench/x183/receipts/independent.json').write_text(json.dumps(result,indent=2));print(result)
