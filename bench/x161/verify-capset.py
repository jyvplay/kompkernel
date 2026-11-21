"""Independently verify the published F3^9 cap set using integer arithmetic.
Only literal data is parsed; downloaded notebook code is never executed.
"""
import ast,json,itertools
from pathlib import Path
s=Path('bench/x161/research/google-capsets.txt').read_text()
line=next(x for x in s.splitlines() if x.startswith('discovered_cap_set = '))
points=[tuple(p) for p in ast.literal_eval(line.split('=',1)[1])]
assert len(points)==1084 and len(set(points))==1084
assert all(len(p)==9 and set(p)<=set(range(3)) for p in points)
S=set(points);pairs=0
for x,y in itertools.combinations(points,2):
 z=tuple((-a-b)%3 for a,b in zip(x,y));assert z not in S,(x,y,z);pairs+=1
x,y=points[:2];z=tuple((-a-b)%3 for a,b in zip(x,y));assert z not in S and z!=x and z!=y
assert all((a+b+c)%3==0 for a,b,c in zip(x,y,z))
Path('bench/x161/receipts/capset.json').write_text(json.dumps({'points':1084,'dimension':9,'field':3,'distinctPairsChecked':pairs,'verified':True,'mutationRejected':'adjoining -(first+second) creates a distinct zero-sum triple','sourceTypo':'notebook prose says F_2^n but data and arithmetic are over F_3^9','notProved':['optimality','history of record','runtime bound','compression transfer']},indent=2));print(pairs)
