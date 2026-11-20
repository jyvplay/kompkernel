"""Independent Python reconstruction from emitted PSIFIDA contract/payload.
Parent decoder is inherited independent Python reader; unsupported != pass.
"""
import json,pathlib,runpy,contextlib,io,re
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
key='After decoding the payload: its first line contains equal-length digit columns separated by spaces. Transpose these columns into rows; replace successive ~ in the remaining text with successive rows. Preserve everything else; print only.\n'
def parent(s):
 for h in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']:
  if s.startswith(h+'§'):return legacy['undo'](legacy['cd'].decode(s[len(h):]))
 if re.match(r'^[0-9]+(?: [0-9]+)+\n',s):return s
 raise ValueError('unsupported parent')
def undo(s):
 head,body=s.split('\n',1);cols=head.split(' ')
 assert 2<=len(cols)<=12 and len(set(map(len,cols)))==1 and all(c.isascii() and c.isdigit() for c in cols)
 rows=[''.join(t) for t in zip(*cols)];pieces=body.split('~');assert len(pieces)==len(rows)+1
 return ''.join(p+(rows[i]if i<len(rows)else '')for i,p in enumerate(pieces))
rows=[];unsupported=[]
for name in ['probe','parent','heldout-probe','heldout-parent']:
 for line in (root/f'bench/x144/receipts/{name}.jsonl').read_text().splitlines():
  a=json.loads(line)
  if 'B' not in a:continue
  assert a['message'].startswith(key);payload=a['message'][len(key):]
  if name.endswith('parent'):
   try:payload=parent(payload)
   except ValueError as e:
    if str(e)=='unsupported parent':unsupported.append({'receipt':name,'path':a['path']});continue
    raise
  assert undo(payload).encode()==(root/a['path']).read_bytes()
  rows.append({'receipt':name,'path':a['path']})
print(json.dumps({'exact':len(rows),'rows':rows,'unsupported':unsupported,'nativeVerified':False},indent=2))
