"""Independent message-only prefix/suffix view reader; original bytes only for scoring."""
import json,pathlib,re,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
KEY='¶ k=v; ~gN| in definitions means first N characters of expanded g (negative N: last -N). Expand recursively; print only.\n'
def read(message):
 if not message.startswith(KEY):raise ValueError('header')
 wire=message[len(KEY):]
 if not wire.startswith('§') or len(wire)>100000:raise ValueError('frame')
 tape,body=wire[1:].split('¶',1)
 lo=ord(tape[0])//256*256
 if lo not in (0x400,0x600):raise ValueError('independent reader limited to observed scripts')
 rules={};i=0
 while i<len(tape):
  g=tape[i];i+=1
  if g in rules or not lo<=ord(g)<lo+256:raise ValueError('definition')
  rules[g]='';start=i
  while i<len(tape):
   if tape[i]=='~':
    m=re.match(r'~(.)\-?[1-9][0-9]{0,4}\|',tape[i:])
    if not m:raise ValueError('slice syntax')
    i+=len(m[0]);continue
   if lo<=ord(tape[i])<lo+256 and tape[i] not in rules:break
   i+=1
  rules[g]=tape[start:i]
 cache={};active=set()
 def expand(g):
  if g in cache:return cache[g]
  if g in active or g not in rules:raise ValueError('cycle/undefined')
  active.add(g);raw=rules[g];out='';i=0
  while i<len(raw):
   if raw[i]=='~':
    m=re.match(r'~(.)(-?[1-9][0-9]{0,4})\|',raw[i:])
    if not m:raise ValueError('slice')
    value=expand(m[1]);n=int(m[2])
    if abs(n)>len(value):raise ValueError('bounds')
    out+=value[:n] if n>0 else value[n:];i+=len(m[0])
   else:out+=expand(raw[i]) if raw[i] in rules else raw[i];i+=1
   if len(out)>20000:raise ValueError('cap')
  active.remove(g);cache[g]=out;return out
 for g in rules:expand(g)
 return legacy['undo'](''.join(expand(c) if c in rules else c for c in body))
assert read(KEY+'§а~б3|бabcdef¶аб')=='abcabcdef'
assert read(KEY+'§а~б-3|бabcdef¶а')=='def'
try:read(KEY+'§а~б1|б~а1|¶');raise AssertionError('accepted hidden cycle')
except ValueError:pass
rows=[]
for name in ['probe','heldout-apotome-repaired']:
 p=root/f'bench/x139/receipts/{name}.jsonl'
 if not p.exists():continue
 for line in p.read_text().splitlines():
  r=json.loads(line)
  if not r.get('message','').startswith(KEY):continue
  exact=read(r['message']).encode()==(root/r['path']).read_bytes();assert exact,r['path']
  rows.append({'path':r['path'],'sourceExact':exact})
print(json.dumps({'reader':'independent Python APOTOME plus reused STELI','rows':rows,'exact':len(rows),'nativeVerified':False},indent=2))
