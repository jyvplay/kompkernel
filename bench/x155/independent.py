"""Independent Python FIFO decoder; native-chat gate is NOT_RUN."""
import importlib.util,json,re,sys,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('x152reader',Path(__file__).resolve().parents[1]/'x152'/'independent.py');prev=importlib.util.module_from_spec(spec);spec.loader.exec_module(prev)
KEY='Decode first. Lines are JSON tree nodes in breadth-first order. A { line lists quoted object keys; [N means an N-element array; other lines are literal values. Assign subsequent nodes to child slots FIFO. Format JSON with {width}-space indentation and final LF, preserving lexical tokens and key order. Print only.\n'
def header(width,compact=False):
 s=KEY.replace('{width}',str(width))
 return s.replace('lists quoted object keys;','lists object keys (quote bare keys);').replace('other lines are literal values.','=text is a JSON string with outer quotes removed; other lines are literal values.') if compact else s
STR=re.compile(r'"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"')
BARE=re.compile(r'[A-Za-z_$][A-Za-z0-9_$./@%*-]*')
SCALAR=re.compile(r'(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)')
def undo(s,width,compact=False):
 if not s or s.endswith('\n') or len(s)>50000:raise ValueError('frame')
 rows=s.split('\n')
 if len(rows)>10000:raise ValueError('nodes')
 nodes=[]
 for row in rows:
  if row.startswith('{'):
   keys=[];i=1
   while i<len(row):
    if row[i]!=' ':raise ValueError('separator')
    i+=1;m=STR.match(row,i)
    if m:raw=m[0]
    elif compact and (m:=BARE.match(row,i)):raw='"'+m[0]+'"'
    else:raise ValueError('key')
    keys.append(raw);i=m.end()
   nodes.append(['object',keys,[]])
  elif row.startswith('['):
   if not re.fullmatch(r'\[(0|[1-9][0-9]*)',row):raise ValueError('count')
   n=int(row[1:])
   if n>10000:raise ValueError('count cap')
   nodes.append(['array',n,[]])
  else:
   raw='"'+row[1:]+'"' if compact and row.startswith('=') else row
   if not STR.fullmatch(raw) and not SCALAR.fullmatch(raw):raise ValueError('scalar')
   nodes.append(['leaf',raw,[]])
 next_child=1;depth=[0]*len(nodes)
 for i,(kind,data,children) in enumerate(nodes):
  if i>=next_child or depth[i]>128:raise ValueError('orphan/depth')
  count=len(data) if kind=='object' else data if kind=='array' else 0
  if next_child+count>len(nodes):raise ValueError('missing')
  children.extend(range(next_child,next_child+count))
  for j in children:depth[j]=depth[i]+1
  next_child+=count
 if next_child!=len(nodes):raise ValueError('cardinality')
 def render(i):
  kind,data,children=nodes[i]
  if kind=='leaf':return data
  start,end=('{','}') if kind=='object' else ('[',']')
  if not children:return start+end
  items=[' '*(width*(depth[i]+1))+(data[k]+': ' if kind=='object' else '')+render(j) for k,j in enumerate(children)]
  return start+'\n'+',\n'.join(items)+'\n'+' '*(width*depth[i])+end
 out=render(0)+'\n'
 if len(out)>50000:raise ValueError('output cap')
 return out.encode('utf-8')
def read(message):
 for w in [1,2,4]:
  for compact in [False,True]:
   h=header(w,compact)
   if message.startswith(h):return undo(prev.parent_read(message[len(h):]),w,compact)
 raise ValueError('header')
if __name__=='__main__':
 rows=[]
 for path in sys.argv[1:]:
  for line in Path(path).read_text().splitlines():
   r=json.loads(line)
   if not r.get('message') or r.get('stage')=='incumbent':continue
   source=Path(r['path']).read_bytes();assert read(r['message'])==source,r['path'];rows.append({'path':r['path'],'exact':True,'sourceBytes':len(source),'sourceSha256':hashlib.sha256(source).hexdigest()})
 print(json.dumps({'checks':len(rows),'rows':rows,'nativeSingleChat':'NOT_RUN'},indent=2))
