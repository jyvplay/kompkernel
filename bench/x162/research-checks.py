"""Bounded checks of imported data/interfaces, NOT a lab theorem replay."""
import ast,json,itertools,re
from pathlib import Path
text=Path('bench/x162/research/google-sums.txt').read_text();rows=[]
for name,literal in re.findall(r'^(solution_\d+) = (\[.*\])$',text,re.M):
 a=ast.literal_eval(literal);assert a and all(type(x) is int and x>=0 for x in a);assert min(a)==0 and len(set(a))==len(a)
 rows.append({'name':name,'size':len(a),'maximum':max(a),'naiveOrderedPairs':len(a)**2,'publishedVerifierTwoBoolArraysBytes':2*(2*max(a)+1),'admissibilityOnly':True})
assert rows
checks=0
for bits in itertools.product([False,True],repeat=3):
 a=lambda i:bits[i-1]
 for lit in [-3,-2,-1,1,2,3]:
  old=a(abs(lit)) if lit>0 else not a(abs(lit));variable=abs(lit)-1;positive=lit>0;new=(bits[variable]==positive);assert old==new;checks+=1
assert not all(lit!=0 for lit in [1,0,-2])
Path('bench/x162/receipts/research-checks.json').write_text(json.dumps({'googleSets':rows,'googleCardinalitiesAndAsymptoticBound':'NOT_VERIFIED; quadratic pair enumeration and large arrays not run','doubleaiLiteralAdapterCases':checks,'zeroLiteralRejected':True,'doubleaiSATOrLeanReplay':False},indent=2));print(rows,checks)
