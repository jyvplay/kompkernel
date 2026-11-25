"""Executable evidence-schema detector. Not an English theorem prover."""
import json
from pathlib import Path

def detect(r):
 e=[]
 for flag,label in [
 ('payloadOnly','omitted final contract'),('weakBaseline','weakened frontier'),
 ('normalize','semantic equality replaces bytes'),('selfReport','encoder self-report'),
 ('nativeSubstitute','program inverse replaces native reading'),('trainingAsHeldout','selection leakage'),
 ('symbolTransfer','symbol theorem transferred to tokens'),('headerFree','free header/dictionary'),
 ('runtimeFree','extra search counted as free'),('microAsWhole','microbenchmark promoted to whole stack'),
 ('contaminated','contaminated timing'),('cacheLeak','memoized timing'),
 ('incompleteAsPass','timeout/unsupported counted as pass'),('challengeAsProof','challenge mistaken for proof'),
 ('sourceAsReplay','source inspection promoted to kernel replay'),('silentRepair','repair inherits stale gates'),
 ('familyUniversal','restricted family universalized'),('finiteUniversal','finite test universalized'),
 ('charAsToken','characters substituted for token price'),('differentSource','baseline source mismatch'),
 ('medianHidesRegression','aggregate hides protected-lane regression'),('notRunAsPass','NOT_RUN promoted to pass'),('axiomAsCertificate','axiom route promoted to certificate replay'),('wrongMarkerContract','undeclared marker accepted'),('knownSourceAsBlinded','known source called blinded native test'),('nicheAsBroad','niche source selection called broad gain'),('repairedInheritsTrust','repair skips fresh gates')]:
  if r.get(flag):e.append(label)
 if r.get('claim')=='pareto' and not all(r.get(k) is True for k in ['sourceExact','fullPrice','strongBaseline','native','runtimeNonRegression']):e.append('conjunctive Pareto gate incomplete')
 return e

flags=['payloadOnly','weakBaseline','normalize','selfReport','nativeSubstitute','trainingAsHeldout','symbolTransfer','headerFree','runtimeFree','microAsWhole','contaminated','cacheLeak','incompleteAsPass','challengeAsProof','sourceAsReplay','silentRepair','familyUniversal','finiteUniversal','charAsToken','differentSource','medianHidesRegression','notRunAsPass','axiomAsCertificate','wrongMarkerContract','knownSourceAsBlinded','nicheAsBroad','repairedInheritsTrust']
rows=[]
for flag in flags:
 r={'shape':flag,flag:True};errors=detect(r);assert errors;rows.append({'shape':flag,'rejected':errors})
actual={'claim':'pareto','sourceExact':True,'fullPrice':True,'strongBaseline':True,'native':False,'runtimeNonRegression':False};assert detect(actual)
assert detect({'claim':'bounded token win','sourceExact':True,'fullPrice':True,'strongBaseline':True})==[]
Path('bench/x179/receipts/modal.json').write_text(json.dumps({'deceptiveShapes':len(rows),'rows':rows,'actualX179ParetoRejection':detect(actual),'honestBoundedClaimAccepted':True,'scope':'flags supplied explicitly; cannot infer omissions from arbitrary prose'},indent=2)+'\n')
print(len(rows),'deceptive shapes rejected; X179 Pareto claim rejected')

# Concrete countermodel to the invalid modal implication; not a simulated LLM.
x='<a>x</a>';wire='<a>x<>'
def exact_program(w):return w.replace('<>','</a>')
def another_decoder(w):return w
assert exact_program(wire)==x and another_decoder(wire)!=x
print('program-existence to arbitrary-decoder implication falsified by explicit functions')

# Existence of an Euler trail is not unique source reconstruction.
from collections import Counter
left='a b a c a'.split();right='a c a b a'.split()
assert left!=right and left[0]==right[0]
assert Counter(zip(left,left[1:]))==Counter(zip(right,right[1:]))
p=Path('bench/x179/receipts/modal.json');r=json.loads(p.read_text());r['eulerCountermodel']={'left':left,'right':right,'sameStartAndEdgeMultiset':True,'conclusion':'existence is not uniqueness; row ordering is not an unstated tie-breaker'};p.write_text(json.dumps(r,indent=2)+'\n')
print('Euler-existence to unique-source implication falsified by two actual sequences')

# Integer floors cannot be replaced by truncation: structural lifting attacker.
a,b=10,9;d=b-a;s=a+d//2
assert (s-d//2,s-d//2+d)==(a,b)
assert (s-int(d/2),s-int(d/2)+d)!=(a,b)
# An observed compressor length is not a lower bound on other descriptions.
def toy_encode(n):return '0' if n==0 else '1'+format(n,'08b')
def toy_decode(w):return 0 if w=='0' else int(w[1:],2)
codes=[toy_encode(n) for n in range(256)]
assert all(toy_decode(w)==i for i,w in enumerate(codes))
assert all(not b.startswith(a) for a in codes for b in codes if a!=b)
assert len(toy_encode(0))==1<8
assert sum(2**i for i in range(8))<256
p=Path('bench/x179/receipts/modal.json');r=json.loads(p.read_text());r.update(floorCountermodel={'source':[a,b],'coarse':s,'detail':d,'truncationWrong':True},oracleUpperNotLower={'inputs':256,'prefixFree':True,'identityBits':8,'zeroCodeBits':1,'scope':'Toy mathematical countermodel, not an LLM codec or external compressor experiment'});p.write_text(json.dumps(r,indent=2)+'\n')
