"""Independent emitted-wire reconstruction for interior/source-swap controls."""
import pathlib,json,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
def interior(message):
 header,payload=message.split('\n',1)
 assert header=='JSON [rules,body]: expand keys recursively. A rule value [g,start,length] selects that substring of expanded g, zero-based Unicode characters. Strings concatenate literals and keys. Print only.'
 rules,body=json.loads(payload);rules=dict(rules);memo={};active=set()
 def expand(k):
  if k in memo:return memo[k]
  assert k in rules and k not in active
  active.add(k);r=rules[k]
  if isinstance(r,list):
   g,start,n=r;v=expand(g);assert isinstance(start,int)and isinstance(n,int)and start>=0 and n>0 and start+n<=len(v)
   s=v[start:start+n]
  else:s=''.join(expand(c)if c in rules else c for c in r)
  assert len(s)<=20000;active.remove(k);memo[k]=s;return s
 for k in rules:expand(k)
 return legacy['undo'](''.join(expand(c)if c in rules else c for c in body))
rows=[]
for l in (root/'bench/x141/receipts/interior.jsonl').read_text().splitlines():
 r=json.loads(l);assert interior(r['message']).encode()==(root/r['path']).read_bytes();rows.append({'arm':'interior','path':r['path'],'sourceExact':True})
print(json.dumps({'exact':len(rows),'rows':rows,'nativeVerified':False},indent=2))
