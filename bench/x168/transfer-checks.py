"""Small exact counterexamples to invalid transfers, NOT external-proof replay."""
import itertools,json,math
from pathlib import Path

def transitions(s):return sorted(zip(s.split(' '),s.split(' ')[1:]))
a,b='a b a c a','a c a b a'
assert a!=b and transitions(a)==transitions(b)
# Dropping the division-algebra premise invalidates 'nonidentity -> det(w-I)!=0'.
w=[1,-1,1,-1]
assert math.prod(w)==1 and all(x*x==1 for x in w) and w!=[1]*4
assert math.prod(x-1 for x in w)==0
# An exact finite construction for n=3 sunny lines, not the n>=3 classification.
points=[(a,b) for a in range(1,4) for b in range(1,4) if a+b<=4]
lines=[(1,-1,0),(1,2,-5),(2,1,-5)]
assert len(set(lines))==3
assert all(a!=0 and b!=0 and a!=b for a,b,c in lines)
assert all(any(a*x+b*y+c==0 for a,b,c in lines) for x,y in points)
# Statement/solution distinction and permitted axiom policy are inspected, not run.
r=json.loads(Path('bench/x168/receipts/research-artifacts.json').read_text())
config=json.loads(Path('.cache/x168/research/openai-lean_ComparatorChallenges_VPVNP.json').read_text())
assert config['solution_module']=='OAI.Computability.VPVNP.ClassSeparation'
assert set(config['permitted_axioms'])=={'propext','Quot.sound','Classical.choice'}
assert config['enable_nanoda'] is False
# Patch-targeted trial-configuration guard and a mutant that must fail.
s=Path('bench/x168/trial.ts').read_text()
def correct(s):return "process.env.OMEGA_NO_OROTHESIA='1'" in s and 'OMEGA_NO_ORODIADOCHIA' not in s
assert correct(s) and not correct(s.replace('OMEGA_NO_OROTHESIA','OMEGA_NO_ORODIADOCHIA'))
out=dict(transitionMultisetCounterexample=[a,b],divisionPremiseCounterexampleDiagonal=w,harmonicN3Witness=dict(points=points,lines=lines),configChecked=True,trialFlagMutantRejected=True,kernelReplay='NOT_RUN',scope='bounded exact arithmetic/witnesses and configuration inspection; no imported theorem certified')
Path('bench/x168/receipts/transfer-checks.json').write_text(json.dumps(out,indent=2));print(out)
