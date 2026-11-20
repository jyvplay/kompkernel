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
for l in (root/'bench/x140/receipts/interior.jsonl').read_text().splitlines():
 r=json.loads(l);assert interior(r['message']).encode()==(root/r['path']).read_bytes();rows.append({'arm':'interior','path':r['path'],'sourceExact':True})
for name in ['precondition','heldout-precondition']:
 for l in (root/f'bench/x140/receipts/{name}.jsonl').read_text().splitlines():
  r=json.loads(l);header,parent=r['message'].split('\n',1)
  # Parameters come from the wire, not the encoder metadata field.
  prefix='Decode the following payload completely, then simultaneously swap every '
  assert header.startswith(prefix)and header.endswith('. Print only.')
  params=header[len(prefix):-len('. Print only.')];a,b=[json.loads(x)for x in params.split(' and ')];assert len(a)==len(b)==1
  p=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']
  pre=next((x for x in p if parent.startswith(x+'§')),None)
  if pre is None:raise ValueError('independent reader does not support this parent contract')
  text=legacy['undo'](legacy['cd'].decode(parent[len(pre):]))
  restored=''.join(b if c==a else a if c==b else c for c in text)
  assert restored.encode()==(root/r['path']).read_bytes(),r['path'];rows.append({'arm':'source-swap','path':r['path'],'sourceExact':True})
print(json.dumps({'rows':rows,'exact':len(rows),'nativeVerified':False},indent=2))
