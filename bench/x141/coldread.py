"""Independent recency reader: chronological word list, not the encoder's trie/map.
Native model behavior is not evaluated. Source bytes used only after decoding.
"""
import json,pathlib,re,runpy,contextlib,io
root=pathlib.Path(__file__).resolve().parents[2]
KEY='Words=[A-Za-z]+; ^p copies latest decoded word starting p, case-sensitive. Scan left to right; preserve all other characters; print only.\n'
COMPOSE='First decode the following payload completely. Then: '+KEY
with contextlib.redirect_stdout(io.StringIO()):legacy=runpy.run_path(str(root/'bench/x135/steli_audit.py'))
def undo(body):
 if len(body.encode('utf-16-le'))//2>50000:raise ValueError('input cap')
 history=[];out=[];i=0
 for m in re.finditer(r'\^?[A-Za-z]+|[^A-Za-z^]+',body):
  if m.start()!=i:raise ValueError('malformed marker')
  raw=m[0];i=m.end()
  if raw.startswith('^'):
   prefix=raw[1:]
   if len(prefix)>12 or m.start()>0 and re.match(r'[A-Za-z^]',body[m.start()-1]) or body[i:i+1]=='^':raise ValueError('boundary')
   word=next((w for w in reversed(history)if w.startswith(prefix)),None)
   if word is None:raise ValueError('missing history')
   history.append(word);out.append(word)
  elif re.fullmatch('[A-Za-z]+',raw):history.append(raw);out.append(raw)
  else:out.append(raw)
  if len(history)>10000:raise ValueError('word cap')
 if i!=len(body):raise ValueError('trailing marker')
 result=''.join(out)
 if len(result.encode('utf-16-le'))//2>50000:raise ValueError('output cap')
 return result
def parent(m):
 for p in ['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']:
  if m.startswith(p+'§'):return legacy['undo'](legacy['cd'].decode(m[len(p):]))
 raise ValueError('unsupported parent')
def read(m):
 if m.startswith(KEY):return undo(m[len(KEY):])
 if m.startswith(COMPOSE):return undo(parent(m[len(COMPOSE):]))
 raise ValueError('unknown contract')
if __name__=='__main__':
 mech=json.loads((root/'bench/x141/receipts/mechanics.json').read_text())
 for r in mech:assert read(r['message'])==r['expected']
 for s in ['^author','alpha^a','alpha ^a^a','alpha ^','alpha ^A']:
  try:undo(s);raise AssertionError('accepted attack')
  except ValueError:pass
 rows=[];unsupported=[]
 for name in ['probe','parent','heldout-probe','heldout-parent']:
  p=root/f'bench/x141/receipts/{name}.jsonl'
  if not p.exists():continue
  for l in p.read_text().splitlines():
   r=json.loads(l)
   if 'message'not in r:continue
   try:out=read(r['message'])
   except ValueError as e:
    if str(e)=='unsupported parent':unsupported.append({'receipt':name,'path':r['path']});continue
    raise
   assert out.encode()==(root/r['path']).read_bytes(),(name,r['path'])
   rows.append({'receipt':name,'path':r['path'],'threshold':r.get('threshold'),'sourceExact':True})
 print(json.dumps({'exact':len(rows),'mechanics':len(mech),'rows':rows,'unsupported':unsupported,'nativeVerified':False},indent=2))
