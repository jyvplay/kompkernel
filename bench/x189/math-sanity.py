"""Finite arithmetic check only; neither a proof nor a codec benchmark."""
import math,json
from pathlib import Path
checks=0;primes=[2,3,5,7,11,13,17,19,23,29,31]
for m in range(1,257):
 for p in primes:
  n=math.comb(2*m,m);v=0
  while n%p==0:n//=p;v+=1
  x=m;carry=0;c=0
  while x or carry:
   d=x%p;x//=p;carry=(2*d+carry)//p;c+=carry
  assert c==v,(m,p,c,v);checks+=1
Path('bench/x189/receipts/kummer-sanity.json').write_text(json.dumps(dict(checks=checks,m=[1,256],primes=primes,claim='Finite check of doubling carry count versus central-binomial p-adic valuation; not a proof of Erdos 728 or a compression gain'),indent=2))
print(checks)
