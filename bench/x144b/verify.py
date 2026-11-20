"""Independent Python COLEX message reader; program replay, not native LLM."""
import json,re,pathlib,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
def key(sep):return f'After decoding the payload, reverse the order of {json.dumps(sep)}-separated components, including empty ones, within every maximal [A-Za-z0-9_./+-]+ run. Preserve all other characters; print only.\n'
def undo(s,sep):return re.sub(r'[A-Za-z0-9_./+-]+',lambda m:sep.join(reversed(m[0].split(sep))),s)
def parent(s):
 for h in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand; print only.\n']:
  if s.startswith(h+'§'):return legacy['undo'](legacy['cd'].decode(s[len(h):]))
 raise ValueError('unsupported parent')
exact=[];unsupported=[]
for name in ['probe','parent','heldout-probe','heldout-parent']:
 for l in (root/f'bench/x144b/receipts/{name}.jsonl').read_text().splitlines():
  a=json.loads(l)
  if 'B' not in a:continue
  m=a['message'];m.encode('utf8');sep=next(s for s in '/-_.'if m.startswith(key(s)));payload=m[len(key(sep)):]
  if name.endswith('parent'):
   try:payload=parent(payload)
   except ValueError as e:
    if str(e)=='unsupported parent':unsupported.append(a['path']);continue
    raise
  assert undo(payload,sep).encode()==(root/a['path']).read_bytes()
  exact.append({'receipt':name,'path':a['path']})
print(json.dumps({'exact':len(exact),'rows':exact,'unsupported':unsupported,'native':'NOT_RUN'},indent=2))
