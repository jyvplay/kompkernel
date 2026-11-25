"""Separate Python Foata implementation; prior bounded parent reader reused."""
import json,importlib.util
from pathlib import Path

def forward(word):
 result=[]
 for letter in word:
  if result:
   low=result[-1]<=letter;chunks=[];chunk=[]
   for v in result:
    chunk.append(v)
    if (v<=letter)==low:chunks.append(chunk[-1:]+chunk[:-1]);chunk=[]
   assert not chunk
   result=sum(chunks,[])
  result.append(letter)
 return result

def inverse(word):
 word=list(word);output=[]
 while word:
  letter=word[-1];word=word[:-1];output.insert(0,letter)
  if not word:break
  low=word[0]<=letter;starts=[i for i,v in enumerate(word) if (v<=letter)==low]+[len(word)]
  word=sum([word[a+1:b]+word[a:a+1] for a,b in zip(starts,starts[1:])],[])
 return output

def restore(folded,n,d):
 a=folded.split(' ');fn=inverse if d=='forward' else forward
 return ' '.join(sum([fn(a[i:i+n]) for i in range(0,len(a),n)],[]))
checks=0
for p in json.loads(Path('bench/x181/receipts/unit-pairs.json').read_text()):
 assert forward(p['a'])==p['b'];assert inverse(p['b'])==p['a'];checks+=2
for r in json.loads(Path('bench/x181/receipts/screen.json').read_text())['rows']:
 for p in r['plans']:assert restore(p['folded'],p['n'],p['direction']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
paid=[]
for file in sorted(Path('bench/x181/receipts').glob('paid-[0-9][0-9].json')):
 r=json.loads(file.read_text())
 try:body=reader.parent_read(r['parent'])
 except ValueError as e:paid.append(dict(file=str(file),status='unsupported',error=str(e)));continue
 assert restore(body,r['plan']['n'],r['plan']['direction']).encode()==Path(r['path']).read_bytes();checks+=1;paid.append(dict(file=str(file),status='exact'))
out=dict(checks=checks,paid=paid,native='NOT_RUN');Path('bench/x181/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
