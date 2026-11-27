"""Finite exact-integer sanity checks of inspected lemma; NOT kernel replay."""
import itertools,json
from pathlib import Path
from fractions import Fraction

def mul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
def tr(a):return [list(x) for x in zip(*a)]
def positive(q):
 assert q[0][1]==q[1][0]
 det=q[0][0]*q[1][1]-q[0][1]*q[1][0];trace=q[0][0]+q[1][1]
 return 1 if det<0 else (2 if trace>0 else 0) if det>0 else (1 if trace>0 else 0)
qs=[[[a,b],[b,c]] for a,b,c in itertools.product([-1,0,1],repeat=3)];bs=[[[a,b],[c,d]] for a,b,c,d in itertools.product([-1,0,1],repeat=4)];checks=0
for q in qs:
 for b in bs:assert positive(mul(mul(tr(b),q),b))<=positive(q);checks+=1
 for r in qs:assert positive([[q[i][j]+r[i][j] for j in range(2)] for i in range(2)])<=positive(q)+positive(r);checks+=1
# Tree has infinite simple-cycle girth, but two fixed-length returning walks.
g={'a':['b','c'],'b':['a'],'c':['a']};walks=[['a',b,c] for b in g['a'] for c in g[b] if c=='a'];assert len(walks)==2
# Information-losing modal normalization, independent of graph structure.
originals=[b'a b\n',b'a  b\n',b'a b\r\n'];assert len(set(originals))==3 and len({b' '.join(x.split()) for x in originals})==1
Path('bench/x191/receipts/math-sanity.json').write_text(json.dumps(dict(integerMatrixChecks=checks,scope='2x2 symmetric Q and integer B entries -1,0,1; not a general proof',girthCounterexample=walks,modalCollision=[x.decode() for x in originals],kernel='NOT_RUN'),indent=2));print(checks,'finite matrix checks; girth/modal counterexamples')
