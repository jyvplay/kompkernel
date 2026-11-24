"""Finite conditional-information bound; not a token lower bound."""
from collections import Counter,defaultdict
from itertools import product
from math import ceil,log2
from pathlib import Path
import json
classes=defaultdict(list)
for n in range(2,9):
 for words in product(['a','b',''],repeat=n):
  key=(words[0],tuple(sorted(Counter(zip(words,words[1:])).items())))
  classes[key].append(words)
maxclass=max(classes.values(),key=len)
out=dict(sequences=sum(map(len,classes.values())),graphClasses=len(classes),unique=sum(len(v)==1 for v in classes.values()),ambiguous=sum(len(v)>1 for v in classes.values()),maxMultiplicity=len(maxclass),worstCaseExtraBits=ceil(log2(len(maxclass))),witnesses=maxclass[:3],scope='With this fixed start+edge multiset and no other side information, a distinguishing fixed-length binary field needs at least ceil(log2 multiplicity) bits. Not a BPE-token or universal native lower bound.')
assert out['sequences']==9837 and out['graphClasses']==3129 and out['unique']==1065
Path('bench/x173/receipts/ambiguity-bound.json').write_text(json.dumps(out,indent=2));print(out)
