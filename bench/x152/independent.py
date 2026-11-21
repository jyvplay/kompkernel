"""Independent iterative Python grammar-state reader; no project codec imports.
Supports literal HOMOSEMA wires and narrow Cyrillic/Arabic CHIRON parent subsets.
Refuses unsupported operators/layout rather than treating them as successes.
"""
import json,re,hashlib,sys
from pathlib import Path

def parent_read(m):
 heads=['Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand; print only.\n']
 head=next((h for h in heads if m.startswith(h+'§')),None)
 if head is None:return m
 tape,body=m[len(head)+1:].split('¶',1)
 if any(c in tape+body for c in ('॥','×','…','⁂')):raise ValueError('unsupported operator')
 if not tape:raise ValueError('empty tape')
 lo=next((lo for lo in (0x400,0x600) if lo<=ord(tape[0])<lo+0x100),None)
 if lo is None:raise ValueError('unsupported script')
 def inscript(c):return lo<=ord(c)<lo+0x100
 seen=set();values={};pos=0
 def expand(s):
  out=''
  for c in s:
   if inscript(c) and c not in values:raise ValueError('forward ref')
   out+=values.get(c,c)
   if len(out)>50000:raise ValueError('cap')
  return out
 while pos<len(tape):
  k=tape[pos]
  if not inscript(k) or k in seen:raise ValueError('unsupported tape')
  seen.add(k);end=pos+1
  while end<len(tape) and not(inscript(tape[end]) and tape[end] not in seen):end+=1
  values[k]=expand(tape[pos+1:end]);pos=end
 return expand(body)

def read(message):
 fused=re.match(r'^¶ k=v; expand repeatedly\. Outside JSON strings, ([\])]) closes either container; print only\.\n',message)
 if fused:
  message=('After decoding, restore JSON punctuation outside strings: '+fused[1]+' closes the innermost open object or array. Preserve all other characters; print only.\n'+'¶ k=v. expand repeatedly; print only.\n'+message[fused.end():])
 prefix='After decoding, restore JSON punctuation outside strings: '
 if not message.startswith(prefix):raise ValueError('header')
 header,payload=message.split('\n',1);spec=header[len(prefix):]
 sep=re.match(r'([,:;]) means colon after an object key, comma otherwise\. ',spec)
 separator=sep[1] if sep else None
 if sep:spec=spec[0+sep.end():]
 close=re.match(r'([\])]) closes the innermost open object or array\. ',spec)
 closing=close[1] if close else None
 if close:spec=spec[close.end():]
 if spec!='Preserve all other characters; print only.' or separator is None and closing is None:raise ValueError('contract')
 text=parent_read(payload);at=0;out=[];stack=[['root','value']]
 # State names encode key/colon/value/after; array and object empty states differ.
 while at<len(text):
  c=text[at];kind,state=stack[-1]
  if c in ' \t\r\n':out.append(c);at+=1;continue
  end='}' if kind=='object' else ']'
  if kind!='root' and c==(closing or end) and state in ('empty','after'):
   out.append(end);at+=1;stack.pop();continue
  if state=='colon':
   if c!=(separator or ':'):raise ValueError('colon')
   out.append(':');at+=1;stack[-1][1]='value';continue
  if state=='after':
   if kind=='root' or c!=(separator or ','):raise ValueError('comma/trailing')
   out.append(',');at+=1;stack[-1][1]='key' if kind=='object' else 'value';continue
  if kind=='object' and state in ('empty','key'):
   if c!='"':raise ValueError('key')
   _,n=json.JSONDecoder().raw_decode(text[at:]);out.append(text[at:at+n]);at+=n;stack[-1][1]='colon';continue
  if state not in ('empty','value'):raise ValueError('state')
  stack[-1][1]='after'
  if c in '{[':
   out.append(c);at+=1;stack.append(['object' if c=='{' else 'array','empty']);continue
  if c=='"':_,n=json.JSONDecoder().raw_decode(text[at:])
  else:
   match=re.match(r'(?:null|true|false|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)',text[at:])
   if not match:raise ValueError('value')
   n=match.end()
  out.append(text[at:at+n]);at+=n
 if stack!=[['root','after']]:raise ValueError('unclosed')
 result=''.join(out);json.loads(result);return result.encode('utf8')

if __name__=='__main__':
 if len(sys.argv)>1:
  rows=[json.loads(l) for l in Path(sys.argv[1]).read_text().splitlines()];results=[]
  for r in rows:
   if not r['message']:results.append({'mode':r['mode'],'unsupported':True});continue
   result=read(r['message']);source=Path(r['path']).read_bytes();assert result==source
   results.append({'mode':r['mode'],'bytes':len(result),'sha256':hashlib.sha256(result).hexdigest(),'byteExact':True})
 else:
  result=read(Path('bench/x152/receipts/unit-wire.txt').read_text());assert result==Path('bench/x152/receipts/unit-source.txt').read_bytes();results=[{'unit':True,'bytes':len(result),'byteExact':True}]
 print(json.dumps(results,indent=2))
