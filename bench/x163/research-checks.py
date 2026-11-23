"""Independent bounded mathematical/data checks; no Lean replay or full lab audit."""
import ast,re,json,itertools,time
from pathlib import Path
from decimal import Decimal,localcontext
start=time.perf_counter();text=Path('bench/x162/research/google-sums.txt').read_text();u=ast.literal_eval(re.search(r'^solution_1 = (\[.*\])$',text,re.M)[1]);assert min(u)==0 and len(set(u))==len(u)
# Python integer sets rather than the published NumPy Boolean-array algorithm.
sums={a+b for a in u for b in u};diffs={a-b for a in u for b in u};assert len(diffs)<=2*max(u)+1
with localcontext() as ctx:
 ctx.prec=60;bound=Decimal(1)+(Decimal(len(diffs))/Decimal(len(sums))).ln()/Decimal(2*max(u)+1).ln()
google={'witness':'solution_1 only','source':'bench/x162/research/google-sums.txt (pinned X162 provenance)','size':len(u),'pairsPerSet':len(u)**2,'sumCardinality':len(sums),'differenceCardinality':len(diffs),'max':max(u),'expression60Digit':str(bound),'scope':'exact finite counts; decimal expression is numerical, imported asymptotic theorem NOT proved here','large54265Witness':'NOT_RUN'}
lits=[-3,-2,-1,1,2,3];clauses=[()]+[(a,) for a in lits]+list(itertools.product(lits,repeat=2));checks=0
for c in clauses:
 for d in clauses:
  for values in itertools.product([False,True],repeat=3):
   direct=all(any(values[abs(l)-1] if l>0 else not values[abs(l)-1] for l in clause) for clause in [c,d]);adapter=all(any(values[abs(l)-1]==(l>0) for l in clause) for clause in [c,d]);assert direct==adapter;checks+=1
assert any(all(any(v[abs(l)-1]==(l>0) for l in c) for c in []) for v in itertools.product([False,True],repeat=3))
assert not any(all(any(v[abs(l)-1]==(l>0) for l in c) for c in [()]) for v in itertools.product([False,True],repeat=3))
assert not all(l!=0 and abs(l)<=3 for l in [1,0,4])
# Scheduler charge removal needs Nodup: removing all copies otherwise changes the accounting.
weights={0:2,1:7,2:11};partition=0
for order in itertools.permutations(weights):
 for g in order:assert weights[g]+sum(weights[i] for i in order if i!=g)==sum(weights[i] for i in order);partition+=1
assert weights[0]+sum(weights[i] for i in [0,0,1] if i!=0)!=sum(weights[i] for i in [0,0,1])
result={'google':google,'doubleai':{'twoClauseThreeVariableAssignmentChecks':checks,'emptyClauseAndFormulaAndInvalidLiteralAttacks':True,'actualLRATOrChessProof':'NOT_VERIFIED'},'openai':{'distinctChargeRemovalChecks':partition,'duplicateCounterexampleToOmittingNodup':True,'kernelReplay':False},'elapsedSeconds':time.perf_counter()-start}
Path('bench/x163/receipts/research-checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
