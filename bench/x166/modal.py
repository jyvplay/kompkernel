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
Path('bench/x166/receipts/modal.json').write_text(json.dumps({'deceptiveShapes':len(rows),'rows':rows,'actualX166ParetoRejection':detect(actual),'honestBoundedClaimAccepted':True,'scope':'flags supplied explicitly; cannot infer omissions from arbitrary prose'},indent=2)+'\n')
print(len(rows),'deceptive shapes rejected; X166 Pareto claim rejected')

# Concrete countermodel to the invalid modal implication; not a simulated LLM.
x='<a>x</a>';wire='<a>x<>'
def exact_program(w):return w.replace('<>','</a>')
def another_decoder(w):return w
assert exact_program(wire)==x and another_decoder(wire)!=x
print('program-existence to arbitrary-decoder implication falsified by explicit functions')
