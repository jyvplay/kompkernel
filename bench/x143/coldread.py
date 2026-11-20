import pathlib,json,re,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
headers={m:'After decoding the payload, '+s+', skip spaces, tabs, CR and LF; uppercase the next character if it is a-z. A ~ there instead removes itself and keeps the following lowercase letter. Preserve everything else; print only.' for m,s in [('sentence','at its start and after each . ! ? followed by whitespace'),('line','at the start of each LF-separated line')]}
def parent(s):
 for h in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']:
  if s.startswith(h+'§'):return legacy['undo'](legacy['cd'].decode(s[len(h):]))
 raise ValueError('unsupported parent')
def read(s,composed=False):
 h,body=s.split('\n',1);mode=next(m for m,v in headers.items()if v==h)
 if composed:body=parent(body)
 assert len(body.encode('utf-16-le',errors='surrogatepass'))//2<=50000
 pattern=r'(^[ \t\r\n]*|[.!?][ \t\r\n]+)(~?[a-z])'if mode=='sentence'else r'(^[ \t\r]*)(~?[a-z])'
 def replace(m):
  c=m[2];return m[1]+(c[1:]if c.startswith('~')else c.upper())
 out=re.sub(pattern,replace,body,flags=re.MULTILINE if mode=='line'else 0)
 if '~'in out:raise ValueError('marker')
 return out
if __name__=='__main__':
 fixtures=json.loads((root/'bench/x143/receipts/mechanics.json').read_text())
 for a in fixtures:assert read(a['message'])==a['expected'],a
 exact=[];unsupported=[]
 for name in ['probe','parent','heldout-probe','heldout-parent']:
  p=root/f'bench/x143/receipts/{name}.jsonl'
  if not p.exists():continue
  for l in p.read_text().splitlines():
   a=json.loads(l)
   if 'B'not in a:continue
   try:o=read(a['message'],name.endswith('parent'))
   except ValueError as e:
    if str(e)=='unsupported parent':unsupported.append({'receipt':name,'path':a['path']});continue
    raise
   assert o.encode()==(root/a['path']).read_bytes();exact.append({'receipt':name,'path':a['path']})
 print(json.dumps({'exact':len(exact),'fixtures':len(fixtures),'unsupported':unsupported,'rows':exact,'nativeVerified':False},indent=2))
