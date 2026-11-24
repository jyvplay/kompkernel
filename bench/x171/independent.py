"""Separate dynamic-programming inverse, not the TS bitmask enumeration."""
import json,re,importlib.util
from pathlib import Path

def undo(folded):
 header,body=folded.split('\n',1);rows=json.loads(header);rules={}
 assert 0<len(rows)<=4
 for marker,a,b in rows:
  assert all(isinstance(w,str) and re.fullmatch('[A-Za-z]{1,100}',w) for w in [marker,a,b]);assert marker not in rules and len(a)!=len(b);rules[marker]=[a,b]
 out=[]
 for line in body.split('\n'):
  if not line.startswith('~'):out.append(line);continue
  m=re.match(r'~(0|[1-9][0-9]{0,3}):',line);assert m;target=int(m[1]);text=line[m.end():];hits=[m for m in re.finditer('[A-Za-z]+',text) if m[0] in rules];assert 1<=len(hits)<=8
  dp={0:(1,[])}
  for hit in hits:
   nxt={}
   for total,(count,choice) in dp.items():
    for word in rules[hit[0]]:
     n=total+len(word);old=nxt.get(n,(0,[]));nxt[n]=(min(2,old[0]+count),choice+[word])
   dp=nxt
  assert target in dp and dp[target][0]==1
  values=iter(dp[target][1]);parts=[];pos=0
  for hit in hits:parts.extend([text[pos:hit.start()],next(values)]);pos=hit.end()
  parts.append(text[pos:]);out.append(''.join(parts))
 result='\n'.join(out);assert len(result.encode('utf-16-le'))//2<=50000;return result
checks=0
for r in json.loads(Path('bench/x171/receipts/unit-pairs.json').read_text()):assert undo(r['folded']).encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x171/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;errors=[]
for file in Path('bench/x171/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:
   folded=reader.parent_read(message);out=undo(folded) if kind=='candidate' else folded;assert out.encode()==source
  except (ValueError,AssertionError,KeyError) as e:errors.append(dict(path=r['path'],kind=kind,error=repr(e)));continue
  wires+=1;checks+=1
for f in ['[["Q","a","bb"]]\n~3:Q Q','[["Q","a","bb"]]\n~1:Q Q','[["Q","a","b"]]\n~1:Q']:
 try:undo(f)
 except (ValueError,AssertionError):checks+=1
 else:raise AssertionError('constraint attack accepted')
out=dict(checks=checks,wireChecks=wires,errors=errors,native='NOT_RUN');Path('bench/x171/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
