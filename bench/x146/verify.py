"""Independent Python JSON serializer + existing Python grammar reader.
No model inference; no encoder's decoded field is trusted.
"""
import json,pathlib,importlib.util
root=pathlib.Path(__file__).resolve().parents[2];r=root/'bench/x146/receipts'
spec=importlib.util.spec_from_file_location('cd',root/'bench/chiron_decode.py');cd=importlib.util.module_from_spec(spec);spec.loader.exec_module(cd)
headers=['Before ¶ k=v. expand; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n']
def quote(s,d):
 for _ in range(d):s=json.dumps(s,ensure_ascii=False)
 return s

def undo(s,d,whole):
 if whole:return quote(s,d)
 out=''
 while '⟦'in s:
  a,b=s.split('⟦',1);v,s=b.split('⟧',1);out+=a+quote(v,d)
 return out+s
counts={};baseline_reads=0;baseline_unsupported=[]
for name in ['unit-wires','probe','parent','body-parent','root-parent','packages-parent','final-parent','integration']:
 if not (r/(name+'.jsonl')).exists():continue
 n=0
 for line in (r/(name+'.jsonl')).read_text().split('\n'):
  if not line:continue
  a=json.loads(line);source=(root/a['path']).read_bytes() if 'path'in a else a['source'].encode()
  if name=='probe':plans=a['plans']
  elif name=='unit-wires':plans=[a]
  elif name=='integration':
   if not a['applied']:continue
   _,m=a['message'].split('\n',1);h=next((h for h in headers if m.startswith(h+'§')),None);payload=cd.decode(m[len(h):]) if h else m
   assert quote(payload,1).encode()==source;n+=1;continue
  else:
   if 'B'not in a:continue
   bm=a.get('baseMessage');bh=next((h for h in headers if bm and bm.startswith(h+'§')),None)
   if bm:
    if bh:assert cd.decode(bm[len(bh):]).encode()==source;baseline_reads+=1
    elif bm.encode()==source:baseline_reads+=1
    else:baseline_unsupported.append(name+':'+a['path'])
   m=a['childMessage'];h=next((h for h in headers if m.startswith(h+'§')),None);payload=cd.decode(m[len(h):]) if h else m
   assert payload==a['folded'],(name,a['path'],'parent')
   plans=[{**a,'folded':payload}]
  for p in plans:
   p['message'].encode('utf8',errors='strict');assert undo(p['folded'],p['depth'],p.get('whole',False)).encode()==source,(name,a.get('path'));n+=1
 counts[name]=n
print(json.dumps({'independentReads':counts,'baselineSourceReads':baseline_reads,'baselineUnsupported':baseline_unsupported,'native':'NOT_RUN'},indent=2))
