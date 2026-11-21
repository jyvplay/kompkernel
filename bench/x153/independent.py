"""Independent Python KENOMA reader. Reuses X152's independent parent reader,
not any TypeScript codec. Explicitly NOT a native-chat behavioral test.
"""
import sys,json,re,hashlib
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('x152_reader',Path(__file__).resolve().parents[1]/'x152'/'independent.py')
previous=importlib.util.module_from_spec(spec);spec.loader.exec_module(previous)
parent_read=previous.parent_read
PARENT='¶ k=v. expand repeatedly; print only.\n'
HOLE='After decoding, on whitespace-only or comma-only lines insert the matching JSON closer after indentation. Ignore the empty segment after a final newline; preserve everything else. Print only.\n'
FUSED='¶ k=v; expand repeatedly. On whitespace-only or comma-only lines insert the matching JSON closer after indentation, excluding the empty segment after a final newline. Print only.\n'
def read(message):
 indent=re.match(r'^¶ k=v; expand repeatedly\. Restore missing JSON closing lines at dedents and EOF using ([124])-space indentation; add a comma only before a sibling\. Preserve other text\. Print only\.\n',message)
 if indent:folded=parent_read(PARENT+message[indent.end():]);width=int(indent[1])
 elif message.startswith(FUSED):folded=parent_read(PARENT+message[len(FUSED):]);width=None
 elif message.startswith(HOLE):folded=parent_read(message[len(HOLE):]);width=None
 else:raise ValueError('unsupported envelope')
 stack=[]
 def scan(line):
  quoted=False;escape=False
  for c in line:
   if quoted:
    if escape:escape=False
    elif c=='\\':escape=True
    elif c=='"':quoted=False
   elif c=='"':quoted=True
   elif c in '[{':stack.append(']' if c=='[' else '}')
   elif c in ']}':
    if not stack or stack.pop()!=c:raise ValueError('stack')
  if quoted or len(stack)>128:raise ValueError('lexical/depth')
 out=[]
 if width is None:
  lines=re.findall(r'[^\r\n]*(?:\r\n|\n|$)',folded)
  if lines and lines[-1]=='':lines.pop()
  for line in lines:
   eol='\r\n' if line.endswith('\r\n') else '\n' if line.endswith('\n') else ''
   body=line[:-len(eol)] if eol else line
   if re.fullmatch(r'[ \t]*,?',body):
    if not stack:raise ValueError('empty stack')
    n=len(re.match(r'[ \t]*',body)[0]);body=body[:n]+stack[-1]+body[n:]
   scan(body);out.append(body+eol)
  if stack:raise ValueError('unclosed')
 else:
  if not folded.endswith('\n') or '\r' in folded:raise ValueError('LF')
  for line in folded[:-1].split('\n'):
   if not line or '\t' in line:raise ValueError('indent line')
   n=len(line)-len(line.lstrip(' '))
   if n%width:raise ValueError('indent quantum')
   level=n//width
   while len(stack)>level:
    c=stack.pop();out.append(' '*(len(stack)*width)+c+(',' if len(stack)==level and level>0 else '')+'\n')
   if level!=len(stack):raise ValueError('depth')
   scan(line);out.append(line+'\n')
  while stack:
   c=stack.pop();out.append(' '*(len(stack)*width)+c+'\n')
 source=''.join(out);json.loads(source);return source.encode('utf8')

if __name__=='__main__':
 rows=[]
 for file in sys.argv[1:]:
  for r in map(json.loads,Path(file).read_text().splitlines()):
   if not r.get('message') or ('stage' in r and not r['stage'].startswith('KENOMA')):continue
   actual=read(r['message']);expected=Path(r['path']).read_bytes();assert actual==expected,r['path']
   rows.append({'path':r['path'],'bytes':len(actual),'sha256':hashlib.sha256(actual).hexdigest(),'byteExact':True})
 print(json.dumps({'checks':len(rows),'rows':rows,'nativeSingleChat':'NOT_RUN'},indent=2))
