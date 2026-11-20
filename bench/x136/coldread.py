"""Python inverse of PTYCHE from the emitted instruction+wire, no encoder state."""
import json,re,pathlib,importlib.util
root=pathlib.Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('chiron',root/'bench/chiron_decode.py')
cd=importlib.util.module_from_spec(sp);sp.loader.exec_module(cd)
KEY='After decoding, ↵W[/line:delta,...]| marks a paragraph: remove prefix; greedily fill lines to W characters with single spaces, adjusting word count on listed 1-based lines by delta; print only.\n'
def undo(text):
 final='\n' if text.endswith('\n') else ''
 if final:text=text[:-1]
 blocks=[]
 for p in text.split('\n\n'):
  if not p.startswith('↵'):blocks.append(p);continue
  m=re.fullmatch(r'↵([1-9]\d{0,3})(?:/([^|]*))?\|([^\n]*)',p)
  if not m:raise ValueError('bad block')
  w=int(m[1]);words=m[3].split(' ')
  if not all(words) or any(not all(32<=ord(c)<=126 for c in x)for x in words):raise ValueError('words')
  fixes={}
  if m[2] is not None:
   for pair in m[2].split(','):
    if not re.fullmatch(r'[1-9]\d*:-?[1-9]\d*',pair):raise ValueError('bad patch')
    line,delta=map(int,pair.split(':'))
    if line in fixes:raise ValueError('duplicate')
    fixes[line]=delta
  lines=[];at=0
  while at<len(words):
   k=1;n=len(words[at])
   while at+k<len(words) and n+1+len(words[at+k])<=w:n+=1+len(words[at+k]);k+=1
   k+=fixes.pop(len(lines)+1,0)
   if not 0<k<=len(words)-at:raise ValueError('bounds')
   lines.append(' '.join(words[at:at+k]));at+=k
  if fixes:raise ValueError('unused patch')
  blocks.append('\n'.join(lines))
 return '\n\n'.join(blocks)+final
assert undo('↵5/1:-1|aa bb cc dd ee')=='aa\nbb cc\ndd ee'
assert undo('↵5/1:1|aa bb cc dd ee\n')=='aa bb cc\ndd ee\n'
rows=[]
for line in (root/'bench/x136/receipts/layout.jsonl').read_text().splitlines():
 a=json.loads(line);message=a['message']
 if not message.startswith(KEY):raise ValueError('undeclared layout inverse')
 inner=message[len(KEY):]
 prefixes=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n']
 for pre in prefixes:
  if inner.startswith(pre+'§'):inner=cd.decode(inner[len(pre):]);break
 result=undo(inner)
 exact=result.encode('utf8')==(root/a['path']).read_bytes()
 assert exact
 rows.append({'path':a['path'],'sourceExact':exact,'delta':a['delta']})
default_rows=[]
for line in (root/'bench/x136/receipts/default-layout.jsonl').read_text().splitlines():
 a=json.loads(line);key,wire=a['message'].split('\n',1)
 match=re.fullmatch(r'¶ k=v; expand recursively\. Replace ~W\|paragraph by its greedy W-column wrap \(default W=(\d+)\)\. Print only\.',key)
 if not match:raise ValueError('unknown default contract')
 default=int(match[1]);inner=cd.decode(wire)
 if '↵' in inner or not 40<=default<=160:raise ValueError('collision/default')
 inner=re.sub(r'(^|\n\n)~(\d*)\|',lambda m:m[1]+'↵'+(m[2] or str(default))+'|',inner)
 if '~' in inner:raise ValueError('malformed marker')
 result=undo(inner);exact=result.encode('utf8')==(root/a['path']).read_bytes()
 assert exact
 default_rows.append({'path':a['path'],'sourceExact':exact,'delta':a['delta']})
print(json.dumps({'reader':'Python CHIRON plus independent residual-layout inverse','rows':rows,'defaultRows':default_rows,'nativeModelVerified':False},indent=2))
