"""Finite exact attractor search. Not a production codec or a hardness proof."""
import itertools,json
from pathlib import Path
checks=0;examples=[]
def valid(s,positions):
 for size in range(1,len(s)+1):
  for word in set(s[i:i+size] for i in range(len(s)-size+1)):
   if not any(any(j in positions for j in range(i,i+size)) for i in range(len(s)-size+1) if s[i:i+size]==word):return False
 return True
for n in range(1,9):
 for a in itertools.product('ab',repeat=n):
  s=''.join(a);best=None
  for k in range(1,n+1):
   for positions in itertools.combinations(range(n),k):
    checks+=1
    if valid(s,positions):best=positions;break
   if best is not None:break
  assert best is not None
  # An attractor is NOT an invertible message by itself.
  if n<=2:examples.append(dict(source=s,positions=best))
assert valid('aaaa',{0}) and valid('bbbb',{0})
Path('bench/x172/receipts/attractor.json').write_text(json.dumps(dict(checks=checks,sources=510,examples=examples,counterexample=['aaaa','bbbb'],gap='Identical attractor positions do not identify source; copy instructions, alphabet and literals must be paid.'),indent=2));print(checks)
