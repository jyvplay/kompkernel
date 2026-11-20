"""Independent Python emitted-message interpreter. Not native LLM evaluation."""
import pathlib,json,re,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
KEY='¶ k=v; ~gU|/~gL| = ASCII uppercase/lowercase of expanded g; ~gab| = replace every a with b in expanded g. Expand recursively; print only.\n'
pat=re.compile(r'~(.)([UL]|[-_./ a-zA-Z]{2})\|')
def image(s,op):
 if op=='U':return ''.join(chr(ord(c)-32)if 'a'<=c<='z' else c for c in s)
 if op=='L':return ''.join(chr(ord(c)+32)if 'A'<=c<='Z' else c for c in s)
 if len(op)!=2 or op[0]==op[1]:raise ValueError('op')
 return ''.join(op[1]if c==op[0] else c for c in s)
def read(message,composed=True):
 if not message.startswith(KEY+'§')or len(message)>100000:raise ValueError('header/cap')
 tape,body=message[len(KEY)+1:].split('¶',1)
 lo=ord(tape[0])//256*256
 if lo not in (0x400,0x600):raise ValueError('reader supports observed scripts only')
 rules={};i=0
 while i<len(tape):
  g=tape[i];i+=1
  if g in rules or not lo<=ord(g)<lo+256:raise ValueError('head')
  rules[g]='';start=i
  while i<len(tape):
   if tape[i]=='~':
    m=pat.match(tape,i)
    if not m:raise ValueError('syntax')
    i=m.end();continue
   if lo<=ord(tape[i])<lo+256 and tape[i]not in rules:break
   i+=1
  rules[g]=tape[start:i]
 if len(rules)>128:raise ValueError('rules cap')
 memo={};active=set()
 def expand(g):
  if g in memo:return memo[g]
  if g in active or g not in rules:raise ValueError('cyclic/undeclared')
  active.add(g);raw=rules[g];out='';i=0
  while i<len(raw):
   if raw[i]=='~':
    m=pat.match(raw,i)
    if not m:raise ValueError('syntax')
    out+=image(expand(m[1]),m[2]);i=m.end()
   else:out+=expand(raw[i])if raw[i]in rules else raw[i];i+=1
   if len(out)>20000:raise ValueError('cap')
  active.remove(g);memo[g]=out;return out
 for g in rules:expand(g)
 if '~'in body:raise ValueError('body operator')
 out=''.join(expand(c)if c in rules else c for c in body)
 if len(out)>100000:raise ValueError('body cap')
 return legacy['undo'](out)if composed else out
if __name__=='__main__':
 mechanics=json.loads((root/'bench/x140/receipts/mechanics.json').read_text())
 for r in mechanics:assert read(r['message'],False)==r['expected']
 for wire in ['§а~бU|б~аL|¶','§а~бU|¶а','§аabc¶~аU|']:
  try:read(KEY+wire);raise AssertionError('accepted attack')
  except ValueError:pass
 rows=[];ordinary=0
 for name in ['probe','joint','heldout-probe','heldout-joint']:
  path=root/f'bench/x140/receipts/{name}.jsonl'
  if not path.exists():continue
  for line in path.read_text().splitlines():
   r=json.loads(line);m=r.get('imageMessage',r.get('message',''))
   if not m.startswith(KEY):continue
   assert read(m).encode()==(root/r['path']).read_bytes(),(name,r['path'])
   rows.append({'receipt':name,'path':r['path'],'sourceExact':True})
   if 'ordinaryMessage' in r:
    om=r['ordinaryMessage'];decoded=legacy['undo'](legacy['cd'].decode(om[om.index('§'):]))
    assert decoded.encode()==(root/r['path']).read_bytes(),('ordinary',name,r['path'])
    ordinary+=1
 print(json.dumps({'exact':len(rows),'ordinaryExact':ordinary,'mechanics':len(mechanics),'rows':rows,'nativeVerified':False},indent=2))
