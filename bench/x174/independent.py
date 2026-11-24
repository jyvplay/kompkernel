"""Independent Python recursive inverse: not a native model decoder."""
import json,re,importlib.util
from pathlib import Path

def inv(v,levels):
 if len(v)<=1 or levels==0:return v[:]
 m=(len(v)+1)//2;low=inv(v[:m],levels-1);out=[]
 for s,d in zip(low,v[m:]):
  a=s-d//2;out.extend([a,a+d])
 if len(v)%2:out.append(low[-1])
 return out

def undo(folded,levels,inline=False,stride=1):
 if inline:
  pat=r'(?:~\[([1-9][0-9]*)\])?(~?)([0-9]+)'
  matches=list(re.finditer(pat,folded));encoded=[int(('-' if m[2] else '')+m[3]) for m in matches];values=encoded[:]
  for j in range(stride):values[j::stride]=inv(encoded[j::stride],levels)
  out=[];last=0
  for m,v in zip(matches,values):
   assert v>=0;out.extend([folded[last:m.start()],str(v).zfill(int(m[1] or 0))]);last=m.end()
  return ''.join(out)+folded[last:]
 tape,skeleton=folded.split('\n',1);values=iter(inv(list(map(int,tape.split(' '))),levels))
 def field(m):
  n=next(values);assert n>=0;return str(n).zfill(int(m[1] or 0))
 out=re.sub(r'~(?:\[([1-9][0-9]*)\])?',field,skeleton);assert next(values,None) is None;return out
checks=0
for r in json.loads(Path('bench/x174/receipts/unit-pairs.json').read_text()):
 if 'values' in r:assert inv(list(map(int,r['lifted'])),r['levels'])==list(map(int,r['values']))
 else:assert undo(r['folded'],r['levels'],r['inline']).encode()==r['source'].encode()
 checks+=1
for r in json.loads(Path('bench/x174/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:
  assert undo(p['folded'],p['levels'],p['inline']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;errors=[];unsupported=[]
for file in Path('bench/x174/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message,p in [('base',r['base']['message'],None)]+[('candidate',c['parent'],c) for c in r['candidates']]:
  try:
   body=reader.parent_read(message);out=undo(body,p['levels'],p['inline']) if p else body
   assert out.encode()==source
  except ValueError as e:unsupported.append(dict(path=r['path'],kind=kind,error=str(e)));continue
  except Exception as e:errors.append(dict(path=r['path'],kind=kind,error=repr(e)));continue
  wires+=1;checks+=1
strideChecks=0
for r in json.loads(Path('bench/x174/receipts/stride.json').read_text())['rows']:
 for p in r['plans']:
  assert undo(p['folded'],p['levels'],True,p['stride']).encode()==Path(r['path']).read_bytes();checks+=1;strideChecks+=1
tournamentChecks=0
file=Path('bench/x174/receipts/parent-tournament.json')
if file.exists():
 for r in json.loads(file.read_text())['rows']:
  for p in r['candidates']:
   try:body=reader.parent_read(p['parent']);assert undo(body,p['levels'],p['inline']).encode()==Path(r['path']).read_bytes()
   except ValueError as e:unsupported.append(dict(path=r['path'],kind='tournament',error=str(e)));continue
   except Exception as e:errors.append(dict(path=r['path'],kind='tournament',error=repr(e)));continue
   checks+=1;tournamentChecks+=1
out=dict(checks=checks,wireChecks=wires,strideChecks=strideChecks,tournamentChecks=tournamentChecks,errors=errors,unsupported=unsupported,native='NOT_RUN');Path('bench/x174/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out);assert not errors
