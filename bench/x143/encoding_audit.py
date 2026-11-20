"""Independent arithmetic audit of the pinned SAT challenge's encoding.
Not a replay of its algorithm or Lean proof. Exercises encoding-length only.
"""
import itertools,json
nat=lambda n:[True]*n+[False]
def frame(bits):return [v for b in bits for v in [True,b]]+[False]
def enc_list(enc,xs):return [v for x in xs for v in [True]+frame(enc(x))]+[False]
checks=0
for n in range(3):
 clauses=[x for k in range(3)for x in itertools.combinations(range(2*n),k)]
 for mask in range(1<<len(clauses)):
  F=[x for i,x in enumerate(clauses)if mask>>i&1];F.sort()
  wire=nat(n)+enc_list(lambda C:enc_list(nat,C),F)
  exact=n+2+4*len(F)+sum(4*c+8 for C in F for c in C)
  bound=n+2+4*len(F)+(8*n+4)*2*len(F)
  assert len(wire)==exact<=bound;checks+=1
print(json.dumps({'checks':checks,'domain':'all subsets of clauses of width<=2 on n=0,1,2; length only','identity':'L=n+2+4m+sum_literals(4*code+8)','upperBound':'L<=n+2+4m+(8n+4)km','algorithmVerified':False,'leanReplayed':False},indent=2))
