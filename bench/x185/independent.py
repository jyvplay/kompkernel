"""Independent Python PERAS reader. No encoder import; not native chat."""
import json,re,importlib.util
from pathlib import Path
KEY="Decode payload first. Split on ASCII spaces retaining empty fields. Scan fields left to right, numbering input fields from 1. ~i,n; emits a copy of the n output fields ending at the end of input field i's expansion; i must be earlier. Other fields emit literally. Join output fields with ASCII spaces, preserving everything else. Print only.\n"
def units(s):return len(s.encode('utf-16-le'))//2
def undo(s):
 assert units(s)<=50000;s.encode('utf8');fields=s.split(' ');assert len(fields)<=8192
 out=[];ends=[];size=0
 for w in fields:
  if '~' in w:
   m=re.fullmatch(r'~([1-9][0-9]{0,3}),([1-9][0-9]?);',w);assert m
   i,n=map(int,m.groups());assert 1<=i<=len(ends) and 1<=n<=64 and ends[i-1]>=n;words=out[ends[i-1]-n:ends[i-1]]
  else:words=[w]
  for x in words:
   size+=units(x)+(1 if out else 0);assert size<=50000 and len(out)<8192;out.append(x)
  ends.append(len(out))
 return ' '.join(out)
if __name__=='__main__':
 root=Path('bench/x185/receipts');checks=0
 for r in json.loads((root/'unit-pairs.json').read_text()):assert undo(r['folded'])==r['source'];checks+=1
 for r in json.loads((root/'screen.json').read_text())['rows']:
  if r['family']=='peras':
   for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
 attacks=0
 for s in json.loads((root/'attacks.json').read_text())+['🙂'*25001]:
  try:undo(s)
  except (AssertionError,ValueError,UnicodeError):attacks+=1
  else:raise AssertionError('accepted attack')
 spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader);paid=[]
 for p in sorted(root.glob('paid-[0-9][0-9].json')):
  r=json.loads(p.read_text())
  if r['status']=='ineligible':continue
  assert r['message']==KEY+r['parent']
  try:s=undo(reader.parent_read(r['message'][len(KEY):]))
  except (ValueError,AssertionError) as e:paid.append(dict(file=str(p),status='unsupported',error=str(e)));continue
  assert s.encode()==Path(r['path']).read_bytes();paid.append(dict(file=str(p),status='exact'));checks+=1
 result=dict(checks=checks,attacks=attacks,paid=paid,native='NOT_RUN');(root/'independent.json').write_text(json.dumps(result,indent=2));print(result)
