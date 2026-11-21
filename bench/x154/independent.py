"""Independent Python prefix-cardinality reader; X152 parent reader reused.
No TypeScript codec imports. Native basic-chat decoding is NOT_RUN.
"""
import importlib.util,json,re,sys,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('x152reader',Path(__file__).resolve().parents[1]/'x152'/'independent.py')
previous=importlib.util.module_from_spec(spec);spec.loader.exec_module(previous)
HEAD=r'^After decoding, read prefix JSON: \{N has N key:value pairs, \[N has N values; spaces separate items, counts replace closing brackets and commas\. Format JSON with ([124])-space indentation and final LF; preserve lexical tokens and key order\. Print only\.\n'
TOKEN=re.compile(r'[\[{](?:0|[1-9][0-9]*)|"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|:')
def undo(s,width):
 if len(s)>50000:raise ValueError('cap')
 tokens=[];pos=0
 while pos<len(s):
  if s[pos] in ' \r\n\t':pos+=1;continue
  m=TOKEN.match(s,pos)
  if not m:raise ValueError('lexeme')
  tokens.append(m[0]);pos=m.end()
 cursor=0
 def take():
  nonlocal cursor
  if cursor==len(tokens):raise ValueError('truncated')
  t=tokens[cursor];cursor+=1;return t
 def node(depth):
  if depth>128:raise ValueError('depth')
  t=take()
  if t[0] not in '{[':
   if t==':':raise ValueError('unexpected colon')
   return t
  count=int(t[1:]);obj=t[0]=='{';end='}' if obj else ']'
  if count>10000:raise ValueError('count')
  if not count:return t[0]+end
  entries=[]
  for _ in range(count):
   key=''
   if obj:
    key=take()
    if not key.startswith('"') or take()!=':':raise ValueError('key')
    key+=': '
   entries.append(' '*(width*(depth+1))+key+node(depth+1))
  return t[0]+'\n'+',\n'.join(entries)+'\n'+' '*(width*depth)+end
 out=node(0)+'\n'
 if cursor!=len(tokens) or len(out)>50000:raise ValueError('trailing/cap')
 json.loads(out);return out.encode('utf-8')
def read(message):
 m=re.match(HEAD,message)
 if not m:raise ValueError('envelope')
 return undo(previous.parent_read(message[m.end():]),int(m[1]))
if __name__=='__main__':
 rows=[]
 for path in sys.argv[1:]:
  for line in Path(path).read_text().splitlines():
   r=json.loads(line)
   if not r.get('message') or r.get('stage')=='incumbent':continue
   got=read(r['message']);source=Path(r['path']).read_bytes();assert got==source,r['path']
   rows.append({'path':r['path'],'exact':True,'sourceBytes':len(source),'sourceSha256':hashlib.sha256(source).hexdigest()})
 print(json.dumps({'checks':len(rows),'rows':rows,'nativeSingleChat':'NOT_RUN'},indent=2))
