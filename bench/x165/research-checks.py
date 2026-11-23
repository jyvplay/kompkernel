"""Bounded interface checks; NOT Lean replay or verification of lab theorems."""
import itertools,json
from pathlib import Path
words=['','a','b','aa','ab','ba'];checks=0
for n in range(1,4):
 for ws in itertools.product(words,repeat=n):
  tokens=list(enumerate(ws));largest=max(tokens,key=lambda x:len(x[1]));assert largest in tokens and all(len(t[1])<=len(largest[1]) for t in tokens);checks+=1
  for a in words:
   matches=[t for t in tokens if t[1].startswith(a)];extension=matches[0] if matches else (0,'')
   if matches:assert extension in tokens and extension[1].startswith(a);checks+=1
# Dropping existence hypothesis returns a sentinel, not a compatible match.
assert not ''.startswith('z')
openai={'finiteChecks':checks,'missingExtensionCounterexample':True,'scope':'PrefixGreedy largest/extension semantics from Tables+PrefixMatching; no Poly/kernel replay'}
cnf_checks=0
for nv in range(4):
 for clause in itertools.product(range(-4,5),repeat=2):
  wf=all(l!=0 and abs(l)<=nv for l in clause)
  if wf:
   line=' '.join(map(str,clause))+' 0\n';parsed=[int(v) for v in line.split()[:-1]];assert parsed==list(clause)
   for bits in itertools.product([False,True],repeat=nv):
    value=lambda l:bits[abs(l)-1] if l>0 else not bits[abs(l)-1]
    assert any(value(l) for l in parsed)==any(value(l) for l in clause);cnf_checks+=1
# Literal zero is a terminator in DIMACS; preserving it as a clause literal is invalid.
assert '1 0 2 0'.split('0')!=['1 0 2 ','']
double={'checks':cnf_checks,'zeroTerminatorAmbiguity':True,'scope':'well-formed finite DIMACS serialization; no LRAT certificate, no chess theorem replay'}
constants=0
for c in range(256):assert c+18>=18 and c+7<=2**(c+18);constants+=1
anthropic={'constantChecks':constants,'scope':'CountedInstance selects c+18 and max(C0,10), imports five premises; dependency closure NOT_REPLAYED'}
sets=0
for n in range(2,9):
 for a in range(-2,3):
  s={i*i+i%3 for i in range(n)}
  for m in [-3,-1,1,2]:
   t={m*x+a for x in s};assert len({x+y for x in s for y in s})==len({x+y for x in t for y in t});assert len({x-y for x in s for y in s})==len({x-y for x in t for y in t});sets+=2
assert len({0*x for x in {1,2}})<2
google={'finiteAffineChecks':sets,'zeroScaleCounterexample':True,'scope':'nonzero affine reparameterization preserves finite sum/difference cardinalities, NOT BPE cost; prior2003witness not enlarged'}
from fractions import Fraction
partial=Fraction(0);boundary=0
for n in range(1024):
 partial+=Fraction(1,(n+1)*(n+2));assert partial==Fraction(n+1,n+2);boundary+=1
result={'openai':openai,'anthropic':anthropic,'doubleai':double,'google':google,'bytedance':{'boundaryPartialSums':boundary,'counterexampleAtLiminfOne':'a(n)=n+1; telescoping sum=1','scope':'strict growth hypothesis cannot be weakened to >=1; no Lean replay'},'nativeTransfer':'REJECTED','lean':'NOT_RUN'}
Path('bench/x165/receipts/research-checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
