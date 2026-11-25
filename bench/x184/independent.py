"""Independent Python wire reader, not native chat or an external reviewer."""
import json,re,sys,importlib.util
from pathlib import Path
sys.setrecursionlimit(3000)
KEY='Decode payload first. JSON array of [shape,fields] blocks. Split fields on ASCII spaces retaining empties. Each shape digit describes one node in preorder: 0=no children, 1=left only, 2=right only, 3=both. Assign fields to nodes in preorder. Read each tree inorder (left,node,right); join all resulting fields with ASCII spaces. Preserve every other character; print only.\n'
def units(s):return len(s.encode('utf-16-le'))//2
def undo(folded):
 assert units(folded)<=220000;folded.encode('utf8');rows=json.loads(folded);assert isinstance(rows,list) and 1<=len(rows)<=1563
 out=[];size=0
 for row in rows:
  assert isinstance(row,list) and len(row)==2
  shape,text=row;assert isinstance(shape,str) and re.fullmatch('[0-3]{1,512}',shape) and isinstance(text,str)
  words=text.split(' ');assert len(words)==len(shape);size+=units(text)+(1 if out else 0);assert size<=50000
  pos=0
  def tree():
   nonlocal pos
   assert pos<len(words);i=pos;pos+=1;flags=int(shape[i]);left=tree() if flags&1 else [];right=tree() if flags&2 else [];return left+[words[i]]+right
  out.extend(tree());assert pos==len(words)
 s=' '.join(out);assert units(s)<=50000;s.encode('utf8');return s
def read(message,parent):
 assert units(message)<=222000 and message.startswith(KEY);message.encode('utf8')
 return undo(parent(message[len(KEY):]))
if __name__=='__main__':
 root=Path('bench/x184/receipts');checks=0
 for r in json.loads((root/'unit-pairs.json').read_text()):
  assert undo(r['folded'])==r['source'];checks+=1
  def oracle(words):
   if not words:return '',[]
   at=min(range(len(words)),key=lambda i:len(words[i]) if r['metric']=='length' else words[i])
   ls,lv=oracle(words[:at]);rs,rv=oracle(words[at+1:]);return str((1 if at else 0)+(2 if at+1<len(words) else 0))+ls+rs,[words[at]]+lv+rv
  shape,words=oracle(r['source'].split(' '));assert json.loads(r['folded'])==[[shape,' '.join(words)]];checks+=1
 for r in json.loads((root/'screen.json').read_text())['rows']:
  if r['family']=='kartes':
   for p in r['plans']:assert undo(p['folded']).encode()==Path(r['path']).read_bytes();checks+=1
 attacks=0
 for bad in json.loads((root/'attacks.json').read_text()):
  try:undo(json.dumps(bad))
  except (ValueError,AssertionError,UnicodeError):attacks+=1
  else:raise AssertionError(bad)
 # Additional independent attack: astral output exceeds UTF-16 bound despite Python len<cap.
 try:undo(json.dumps([['0','🙂'*25001]]))
 except (ValueError,AssertionError,UnicodeError):attacks+=1
 else:raise AssertionError('astral cap')
 spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader);paid=[]
 for f in sorted(root.glob('paid-[0-9][0-9].json')):
  r=json.loads(f.read_text())
  if r['family']!='kartes' or r['status']=='ineligible':continue
  assert r['message'].startswith(KEY) and r['message']==KEY+r['parent']
  try:s=read(r['message'],reader.parent_read)
  except (AssertionError,ValueError) as e:paid.append(dict(file=str(f),status='unsupported',error=str(e)));continue
  assert s.encode()==Path(r['path']).read_bytes();paid.append(dict(file=str(f),status='exact'));checks+=1
 for wire in ['wrong header'+json.dumps([['0','a']]),KEY+'x'*222001]:
  try:read(wire,lambda x:x)
  except (ValueError,AssertionError,UnicodeError):attacks+=1
  else:raise AssertionError('wire guard')
 result=dict(checks=checks,attacks=attacks,paid=paid,native='NOT_RUN');(root/'independent.json').write_text(json.dumps(result,indent=2));print(result)
