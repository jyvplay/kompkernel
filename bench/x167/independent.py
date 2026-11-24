"""Independent Python posting expansion. Never consumes encoder decoded fields."""
import json,re
from pathlib import Path

def undo(folded):
 head,body=folded.split('\n',1); rows=json.loads(head); holes=body.count('^'); positions={}
 assert 0<holes<=50000 and 0<len(rows)<=4096
 for word,postings in rows:
  assert re.fullmatch('[A-Za-z]+',word)
  for item in postings.split(','):
   assert re.fullmatch(r'[1-9][0-9]{0,4}(?:/[1-9][0-9]{0,4}/[1-9][0-9]{0,4})?',item)
   values=list(map(int,item.split('/')));places=[values[0]] if len(values)==1 else range(values[0],values[0]+values[1]*values[2],values[1])
   for place in places:
    assert 1<=place<=holes and place not in positions;positions[place]=word
 assert len(positions)==holes
 pieces=body.split('^'); result=pieces[0]+''.join(positions[i]+p for i,p in enumerate(pieces[1:],1))
 assert len(result.encode('utf-16-le'))//2<=50000
 return result
checks=0
for r in json.loads(Path('bench/x167/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:
  assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
prior={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'inherited-python-parent','exec'),prior)
unsupported=[];mismatches=[];wirechecks=0
for file in Path('bench/x167/receipts').glob('trial-*.json'):
 r=json.loads(file.read_text());source=Path(r['path']).read_bytes()
 for kind,message in [('base',r['base']['message'])]+[('candidate',c['parent']) for c in r['candidates']]:
  try:folded=prior['parent_read'](message)
  except ValueError as e:
   if str(e)!='unsupported layout':raise
   unsupported.append(dict(path=r['path'],kind=kind,reason=str(e)));continue
  try:actual=(undo(folded) if kind=='candidate' else folded).encode()
  except (ValueError,AssertionError,KeyError) as e:
   mismatches.append(dict(path=r['path'],kind=kind,reason=type(e).__name__));continue
  if actual!=source:mismatches.append(dict(path=r['path'],kind=kind,reason='source byte mismatch'));continue
  checks+=1;wirechecks+=1
out=dict(checks=checks,wireChecks=wirechecks,unsupported=unsupported,mismatches=mismatches,native='NOT_RUN',scope='Python algorithm, not basic-chat behavioral evidence')
Path('bench/x167/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
