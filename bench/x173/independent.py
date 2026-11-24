"""Independent bounded DFS over multiset edges, NOT Euler feasibility tests."""
import json,importlib.util
from pathlib import Path
class Budget(Exception):pass

def walk(g):
 assert isinstance(g,list) and len(g)==2 and isinstance(g[0],str) and isinstance(g[1],list)
 edges={};sources=set();units=len(g[0]);total=0
 def field(s):return isinstance(s,str) and ' ' not in s and '\n' not in s
 assert field(g[0]) and len(g[1])<=64
 for a,targets in g[1]:
  assert field(a) and a not in sources and targets;sources.add(a)
  for b,n in targets:
   assert field(b) and type(n)==int and 1<=n<=64 and (a,b) not in edges
   edges[a,b]=n;total+=n;units+=n*(1+len(b))
 assert 1<=total<=64 and units<=50000
 solutions=[];nodes=0
 def dfs(at,left,path):
  nonlocal nodes
  nodes+=1
  if nodes>200000:raise Budget('DFS node cap; unsupported, not success')
  if not left:solutions.append(' '.join(path));return
  for (a,b),n in list(edges.items()):
   if a==at and n:
    edges[a,b]-=1;dfs(b,left-1,path+[b]);edges[a,b]+=1
    if len(solutions)>1:return
 dfs(g[0],total,[g[0]]);assert len(solutions)==1;return solutions[0]
def undo(folded):
 assert len(folded.encode('utf-16-le'))//2<=50000
 out='\n'.join(walk(json.loads(line[1:])) if line.startswith('~') else line for line in folded.split('\n'))
 assert len(out.encode('utf-16-le'))//2<=50000;return out
checks=0;unsupported=[]
for i,r in enumerate(json.loads(Path('bench/x173/receipts/unit-pairs.json').read_text())):
 try:out=undo(r['folded'])
 except Budget:unsupported.append(dict(kind='unit',index=i));continue
 assert out.encode()==r['source'].encode();checks+=1
for r in json.loads(Path('bench/x173/receipts/screen.json').read_text())['rows']:
 for i,p in enumerate(r['plans']):
  try:out=undo(p['folded'])
  except Budget:unsupported.append(dict(kind='corpus',path=r['path'],index=i));continue
  assert out.encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
wires=0;errors=[]
for pair in json.loads(Path('bench/x173/receipts/encoding-pairs.json').read_text()):
 assert undo(pair['folded']).encode()==pair['source'].encode();checks+=1
for file in Path('bench/x173/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:
   folded=reader.parent_read(message);out=undo(folded) if kind=='candidate' else folded;assert out.encode()==source
  except Budget:unsupported.append(dict(kind=kind,path=r['path']));continue
  except (ValueError,AssertionError,KeyError) as e:errors.append(dict(path=r['path'],kind=kind,error=repr(e)));continue
  wires+=1;checks+=1
for g in [['a',[['a',[['b',1],['c',1]]],['b',[['a',1]]],['c',[['a',1]]]]],['a',[['a',[['b',1]]],['c',[['c',1]]]]]]:
 try:walk(g)
 except AssertionError:checks+=1
 else:raise AssertionError('attack accepted')
# Reuse the separate X172 ICHNOS inverse without executing its historical harness.
namespace={};exec(Path('bench/x172/independent.py').read_text().split('checks=0')[0],namespace)
anchorChecks=0
for r in json.loads(Path('bench/x173/receipts/anchor-search.json').read_text())['rows']:
 if 'folded' in r:assert namespace['undo'](r['folded']).encode()==Path(r['path']).read_bytes();anchorChecks+=1
out=dict(checks=checks,anchorChecks=anchorChecks,wireChecks=wires,errors=errors,unsupported=unsupported,native='NOT_RUN');Path('bench/x173/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out);assert not errors
