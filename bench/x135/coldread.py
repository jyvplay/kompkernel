"""Message-only X135 inverse, reusing the independent CPython CHIRON reader.
No encoder decoded field, cut offset, or marker metadata is consulted.
"""
import json,pathlib,importlib.util
root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('cd',root/'bench/chiron_decode.py');cd=importlib.util.module_from_spec(spec);spec.loader.exec_module(cd)
linekey='Decode; move final line (including newline) to front.\n'
def parent(m):
 for p in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']:
  if m.startswith(p+'§'):return cd.decode(m[len(p):])
 return m

def decode(m):
 if m.startswith(linekey):
  s=parent(m[len(linekey):])
  if not s.endswith('\n'):raise ValueError('incomplete line')
  cut=s.rfind('\n',0,len(s)-1)+1
  return s[cut:]+s[:cut]
 for marker in ['↶','⤴','◊','⟲']:
  key=f'After decoding, swap the parts at {marker}; omit {marker}.\n'
  if m.startswith(key):
   parts=parent(m[len(key):]).split(marker)
   if len(parts)!=2:raise ValueError('marker multiplicity')
   return parts[1]+parts[0]
 raise ValueError('undeclared inverse')
rows=[]
for line in (root/'bench/x135/receipts/rotation.jsonl').read_text().splitlines():
 a=json.loads(line)
 try:exact=decode(a['message']).encode('utf-8')==(root/a['path']).read_bytes()
 except Exception:exact=False
 rows.append({'path':a['path'],'cut':a['cut'],'delta':a['delta'],'exact':exact,'agreesWithTS':exact==a['exact']})
# Historical TS receipts used CHIRON only; later trials also undo STELI.
# Coverage differences are reported, not treated as corruption. See steli_audit.py.
print(json.dumps({'trials':len(rows),'exact':sum(r['exact'] for r in rows),'accepted':[r for r in rows if r['exact'] and r['delta']<0],'rows':rows},indent=2))
