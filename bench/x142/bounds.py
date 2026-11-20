"""Finite counting checks and an order-loss counterexample, not a theorem prover."""
import json,math
# An injective codec over N source objects needs at least N distinct messages.
# With at most V token choices and length <=k, there are <=sum(V**i,i=0..k).
# Token-sequence validity can only reduce this number. No probability model.
checks=[]
for V in [2,3,256,200000]:
 for n in range(1,9):
  capacity=sum(V**i for i in range(n));sources=V**n
  assert capacity<sources
  checks.append({'V':V,'sourceObjects':sources,'maxShortMessages':capacity,'allStrictlyShorterImpossible':True})
x='01 alpha\n02 beta';y='02 beta\n01 alpha';wire=lambda s:'\n'.join(sorted(s.split('\n')))
assert x!=y and wire(x)==wire(y)
print(json.dumps({'countingChecks':len(checks),'orderCollision':{'x':x,'y':y,'sameSortedWire':wire(x)},'scope':'Only rules out strict shortening of every object of these finite domains. Does not bound our workload or rule out a corpus Pareto improvement. EUTAXIA admits only known strictly ordered source runs.','cases':checks},indent=2))
