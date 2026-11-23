"""Bounded independent exact checks. Does not replay Lean or prove imported claims."""
import re,ast,json,itertools,hashlib
from fractions import Fraction as F
from pathlib import Path
from math import prod
# All63 Route B: count explicit unsatisfiability AXIOMS, not replayed certificates.
s=Path('bench/x164/research/doubleai-axioms.lean').read_text();axioms=re.findall(r'^axiom (\S+) : \(G63 (\d+)\)\.Unsat$',s,re.M)
assert len(axioms)==7224 and {int(n) for _,n in axioms}==set(range(7224))
# Trust adapter has zero-based variable index |l|-1. Omitting l != 0 breaks it.
checks=0
for values in itertools.product([False,True],repeat=4):
 for lit in [-4,-3,-2,-1,1,2,3,4]:
  direct=values[abs(lit)-1] if lit>0 else not values[abs(lit)-1]
  translated=values[max(abs(lit)-1,0)]==(lit>0);assert direct==translated;checks+=1
# Nat subtraction saturates at zero; zero literal can alias variable 1.
assignment={0:False,1:True};zero_direct=not assignment[0];zero_adapter=assignment[1]==False;assert zero_direct!=zero_adapter
# OpenAI's group encoding g*stride+i is injective only with bounded i.
enc_checks=0
for stride in range(1,20):
 seen={}
 for g in range(12):
  for i in range(stride):
   code=g*stride+i;assert code not in seen;seen[code]=(g,i);assert divmod(code,stride)==(g,i);enc_checks+=1
 assert 0*stride+stride==1*stride+0
# ByteDance local cancellation lemma: n<=m and positive entries are load-bearing.
bd=0
for a in itertools.product(range(1,5),repeat=5):
 for n in range(4):
  assert F(prod(a),a[n]*a[n+1])==prod(a[i] for i in range(5) if i not in (n,n+1));bd+=1
assert 0!=prod([2,3]) # a zero denominator's Lean division gives 0, not residual product6.
# X163 exact finite sumset/difference cardinalities, now rational log enclosure.
s=Path('bench/x162/research/google-sums.txt').read_text();u=ast.literal_eval(re.search(r'^solution_1 = (\[.*\])$',s,re.M)[1]);assert len(set(u))==2003
S=len({a+b for a in u for b in u});D=len({a-b for a in u for b in u});assert (S,D)==(93803,807667)
def core(x,N=70):
 assert 1<=x<=2;t=(x-1)/(x+1);total=F(0)
 for j in range(N):total+=2*t**(2*j+1)/(2*j+1)
 tail=2*t**(2*N+1)/((2*N+1)*(1-t*t));return total,total+tail
l2,h2=core(F(2))
def log_bounds(x):
 k=0
 while x>=2:x/=2;k+=1
 lo,hi=core(x);return lo+k*l2,hi+k*h2
lnlo,lnhi=log_bounds(F(D,S));ldlo,ldhi=log_bounds(F(2*max(u)+1));lo=1+lnlo/ldhi;hi=1+lnhi/ldlo
assert lo>F(1147988896509275695,10**18) and hi<F(1147988896509275696,10**18)
result={'openai':{'boundedIndexChecks':enc_checks,'unboundedIndexCollision':True,'scope':'CollectionCode owner/idx interface, not whole superstring proof'},'anthropic':{'scope':'Wrap/Main constructs one fixed wrapper before choosing delta, conditional on counting machine; dependency replay NOT_RUN'},'doubleai':{'nonzeroAdapterChecks':checks,'zeroCounterexample':True,'routeBExplicitUnsatAxioms':len(axioms),'routeBIsNotLRATReplay':True,'scope':'pinned All63/Axioms plus Trust; no assertion about separately supplied certificates'},'bytedance':{'positiveCancellationChecks':bd,'zeroDenominatorCounterexample':True,'wholeIrrationalityProof':'NOT_REPLAYED'},'google':{'points':len(u),'sumset':S,'differenceSet':D,'expressionStrictlyBetween':['1.147988896509275695','1.147988896509275696'],'method':'exact rational atanh log series with geometric tail bound, 70terms after binary range reduction','intervalWidthLessThan1eMinus18':True,'larger54265Witness':'NOT_RUN','asymptoticConstructionTheorem':'NOT_PROVED'}}
Path('bench/x164/receipts/research-checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
