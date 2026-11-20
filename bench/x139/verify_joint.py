"""Reuse independent X138 overlap and X135 STELI readers on X139 emitted wires."""
import pathlib,json,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):reader=runpy.run_path(str(root/'bench/x138/coldread.py'))
rows=[]
for name in ['joint-overlap','joint-heldout']:
 for line in (root/f'bench/x139/receipts/{name}.jsonl').read_text().splitlines():
  r=json.loads(line)
  if 'message' not in r:continue
  m=r['message']
  result=reader['read'](m) if r['overlap'] else reader['legacy']['undo'](reader['cd'].decode(m[m.index('§'):]))
  exact=result.encode()==(root/r['path']).read_bytes();assert exact,(name,r['path'],r['k'])
  rows.append({'receipt':name,'path':r['path'],'k':r['k'],'overlap':r['overlap'],'sourceExact':exact})
print(json.dumps({'exact':len(rows),'rows':rows,'nativeVerified':False},indent=2))
