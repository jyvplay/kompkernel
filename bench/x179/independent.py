"""Separate Python move-to-root inverse; reused independent LF/parent readers."""
import json,re,collections,ast,importlib.util
from pathlib import Path

def klados_undo(wire):
 root=None;left={};right={};up={};out=[]
 def promote(x):
  nonlocal root
  while up[x] is not None:
   p=up[x];g=up[p]
   if left[p]==x:
    left[p]=right[x]
    if right[x] is not None:up[right[x]]=p
    right[x]=p
   else:
    right[p]=left[x]
    if left[x] is not None:up[left[x]]=p
    left[x]=p
   up[p]=x;up[x]=g
   if g is None:root=x
   elif left[g]==p:left[g]=x
   else:right[g]=x
 for m in re.finditer(r'\^[01]*;|\^|[A-Za-z]+|[^A-Za-z^]+',wire):
  token=m[0]
  if token.startswith('^'):
   assert token.endswith(';');x=root
   for digit in token[1:-1]:x=(left if digit=='0' else right)[x]
   assert x is not None;out.append(x);promote(x)
  elif re.match('[A-Za-z]',token):
   if token not in up:
    left[token]=right[token]=None;up[token]=None
    if root is None:root=token
    else:
     p=root
     while True:
      branch=left if token<p else right
      if branch[p] is None:branch[p]=token;up[token]=p;break
      p=branch[p]
   out.append(token);promote(token)
  else:out.append(token)
 return ''.join(out)
checks=0
for r in json.loads(Path('bench/x179/receipts/unit-pairs.json').read_text()):assert klados_undo(r['folded'])==r['source'];checks+=1
for r in json.loads(Path('bench/x179/receipts/screen.json').read_text())['rows']:
 for p in r.get('plans',[]):assert klados_undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
# Reuse only function definitions, not the earlier script's top-level executions.
tree=ast.parse(Path('bench/x177/independent.py').read_text());ns={'collections':collections};exec(compile(ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name in ['inverse_group','undo']],type_ignores=[]),'reused-LF-reader','exec'),ns)
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
paid=[]
for file in sorted(Path('bench/x179/receipts').glob('paid-[0-9][0-9].json')):
 r=json.loads(file.read_text())
 if r['status']!='exact':continue
 try:body=reader.parent_read(r['parent'])
 except ValueError as e:paid.append(dict(file=str(file),status='unsupported',error=str(e)));continue
 if r['kind']=='frequency':body=ns['undo'](body,r['n'],r['order'])
 elif r['kind']=='klados':body=klados_undo(body)
 assert body.encode()==Path(r['path']).read_bytes();checks+=1;paid.append(dict(file=str(file),status='exact'))
out=dict(checks=checks,paid=paid,native='NOT_RUN');Path('bench/x179/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
