"""Separate Python interpreter; reused independent LF and bounded parent readers."""
import json,collections,ast,importlib.util
from pathlib import Path

def omission_undo(folded,k):
 n,rows,residual=json.loads(folded);rules={tuple(c):v for c,v in rows};queue=iter(residual.split(' '));out=[]
 for i in range(n):
  context=tuple(out[-k:]) if i>=k else None
  out.append(rules[context] if context in rules else next(queue))
 assert next(queue,None) is None
 return ' '.join(out)
checks=0
for r in json.loads(Path('bench/x180/receipts/unit-pairs.json').read_text()):assert omission_undo(r['folded'],r['k'])==r['source'];checks+=1
for r in json.loads(Path('bench/x180/receipts/screen.json').read_text())['rows']:
 for p in r.get('plans',[]):assert omission_undo(p['folded'],p['k']).encode()==Path(r['path']).read_bytes();checks+=1
ast_tree=ast.parse(Path('bench/x177/independent.py').read_text());ns={'collections':collections};exec(compile(ast.Module(body=[x for x in ast_tree.body if isinstance(x,ast.FunctionDef) and x.name in ['inverse_group','undo']],type_ignores=[]),'reused-LF-reader','exec'),ns)
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
paid=[]
for file in sorted(Path('bench/x180/receipts').glob('paid-[0-9][0-9].json')):
 r=json.loads(file.read_text())
 if r['status']!='exact':continue
 try:body=reader.parent_read(r['parent'])
 except ValueError as e:paid.append(dict(file=str(file),status='unsupported',error=str(e)));continue
 if r['kind']=='frequency':body=ns['undo'](body,r['plan']['n'],r['plan']['order'])
 elif r['kind']=='apousia':body=omission_undo(body,r['plan']['k'])
 assert body.encode()==Path(r['path']).read_bytes();checks+=1;paid.append(dict(file=str(file),status='exact'))
out=dict(checks=checks,paid=paid,native='NOT_RUN');Path('bench/x180/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
