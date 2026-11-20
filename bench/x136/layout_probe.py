import re,json
from pathlib import Path
for name in Path('bench/x109/lanes29.txt').read_text().splitlines():
 s=Path(name).read_text(); paras=s.split('\n\n'); best=None
 for w in range(40,121):
  kept=folds=err=0
  for p in paras:
   ls=p.split('\n')
   if len(ls)<3 or any(not l or l.startswith(' ') or l.endswith(' ') or '\t'in l for l in ls):continue
   words=' '.join(ls).split(' ')
   if ''in words:continue
   actual=set();i=0
   for l in ls[:-1]:i+=len(l.split(' '));actual.add(i)
   expected=set();n=0
   for i,v in enumerate(words):
    if n and n+1+len(v)>w:expected.add(i);n=len(v)
    else:n+=len(v)+(1 if n else 0)
   e=len(expected^actual)
   if e<len(actual)/4:folds+=len(actual);err+=e;kept+=1
  score=folds-4*err
  if best is None or score>best['score']:best={'width':w,'folds':folds,'errors':err,'paras':kept,'score':score}
 if best['folds']:print(json.dumps({'path':name,**best}))
