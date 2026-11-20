"""Independent overlap operation; reads emitted contract and wire, not encoder target."""
import pathlib,json,importlib.util,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('cd',root/'bench/chiron_decode.py');cd=importlib.util.module_from_spec(spec);spec.loader.exec_module(cd)
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
KEY='¶ k=v; expand rule definitions recursively. Scan body left to right: append literals; for each rule append its expansion minus its longest prefix equal to a suffix of output so far. Print only.\n'
def read(m):
 if not m.startswith(KEY):raise ValueError('contract')
 wire=m[len(KEY):];cut=wire.index('¶');tape=wire[:cut+1];body=wire[cut+1:]
 # CHIRON grammar uses first unseen script glyph as each definition boundary.
 first=tape[1]
 if 0x400<=ord(first)<0x500:lo,hi=0x400,0x500
 elif 0x600<=ord(first)<0x700:lo,hi=0x600,0x700
 else:raise ValueError('independent reader supports only observed Cyrillic/Arabic tapes')
 glyphs={c for c in tape[1:-1] if lo<=ord(c)<hi};values={g:cd.decode(tape+g) for g in glyphs}
 out=''
 for c in body:
  if c not in values:out+=c;continue
  value=values[c];k=0
  for n in range(1,min(len(out),len(value))+1):
   if out[-n:]==value[:n]:k=n
  out+=value[k:]
 return legacy['undo'](out)
rows=[]
for name in ['probe-repaired','repriced-heldout']:
 p=root/f'bench/x138/receipts/{name}.jsonl'
 if not p.exists():continue
 for line in p.read_text().splitlines():
  r=json.loads(line)
  if not r.get('message','').startswith(KEY):continue
  exact=read(r['message']).encode()==(root/r['path']).read_bytes();assert exact,(name,r['path'])
  rows.append({'receipt':name,'path':r['path'],'sourceExact':exact})
layout=runpy.run_path(str(root/'bench/x137/coldread.py'));layout_rows=[]
for name in ['heldout','repriced-heldout']:
 for line in (root/f'bench/x138/receipts/{name}.jsonl').read_text().splitlines():
  r=json.loads(line)
  if r.get('kind') not in ['KREMA','KREMA-fast-existing'] or 'message' not in r:continue
  exact=layout['read'](r['message']).encode()==(root/r['path']).read_bytes();assert exact
  layout_rows.append({'receipt':name,'path':r['path'],'sourceExact':exact})
print(json.dumps({'exact':len(rows),'rows':rows,'existingLayoutExact':len(layout_rows),'layoutRows':layout_rows,'nativeVerified':False},indent=2))
