"""Independent Python expansion; not a native LLM evaluation."""
import json,re,pathlib
word=re.compile(r'[A-Za-z0-9_./-]+')
marker=re.compile(r'\^([A-Za-z0-9_./-]),(0|[1-9][0-9]{0,4}):([A-Za-z0-9_./-]*);')
checks=0
for line in pathlib.Path('bench/x143b/receipts/probe.jsonl').read_text().splitlines():
 a=json.loads(line)
 if 'folded' not in a:continue
 s=a['folded'];i=0;out=[];history={}
 while i<len(s):
  if s[i]=='^':
   m=marker.match(s,i);assert m
   prev=history[m[1]];d=int(m[2]);assert d<=len(prev)
   w=prev[:len(prev)-d]+m[3];out.append(w);history[w[0]]=w;i=m.end()
  else:
   m=word.match(s,i)
   if m:w=m[0];out.append(w);history[w[0]]=w;i=m.end()
   else:out.append(s[i]);i+=1
 assert ''.join(out).encode()==pathlib.Path(a['path']).read_bytes()
 checks+=1
print(json.dumps({'independentSourceByteChecks':checks,'native':'NOT_RUN'}))
