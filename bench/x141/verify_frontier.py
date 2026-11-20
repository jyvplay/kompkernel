import pathlib,json,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
rows=[];unsupported=[]
for name in ['frontier','heldout-baseline']:
 for line in (root/f'bench/x141/receipts/{name}.jsonl').read_text().splitlines():
  r=json.loads(line);m=r['message'];src=(root/r['path']).read_bytes()
  pre=next((p for p in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']if m.startswith(p+'§')),None)
  if pre is not None:out=legacy['undo'](legacy['cd'].decode(m[len(pre):]))
  elif m.encode()==src:out=m
  else:unsupported.append(r['path']);continue
  assert out.encode()==src,r['path'];rows.append({'receipt':name,'path':r['path'],'sourceExact':True})
print(json.dumps({'exact':len(rows),'rows':rows,'unsupported':unsupported,'nativeVerified':False},indent=2))
