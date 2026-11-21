"""Independent exact verification of published AlphaEvolve rank-48 coefficients.
No notebook execution, NumPy, random trials, or floating tolerance.
Parse literal half-integer Gaussian coefficients, then multiply integer pairs.
"""
import ast,json,hashlib
from pathlib import Path
text=Path('bench/x159/research/matmul-notebook-inspection.txt').read_text();start=text.index('decomposition_444 = ');end=text.index('\n\n',start)
statement=ast.parse(text[start:end]).body[0];assert isinstance(statement,ast.Assign)
arrays=[]
for call in statement.value.elts:
 assert isinstance(call,ast.Call) and isinstance(call.func,ast.Attribute) and call.func.attr=='array'
 a=ast.literal_eval(call.args[0]);out=[]
 for row in a:
  r=[]
  for z in row:
   z=complex(z);assert z.real in [-1,-.5,0,.5,1] and z.imag in [-1,-.5,0,.5,1];r.append((int(2*z.real),int(2*z.imag)))
  out.append(r)
 assert len(out)==16 and all(len(r)==48 for r in out);arrays.append(out)
def mul(a,b):return (a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0])
def check(a):
 checks=0
 for x in range(16):
  for y in range(16):
   for z in range(16):
    total=[0,0]
    for k in range(48):
     t=mul(mul(a[0][x][k],a[1][y][k]),a[2][z][k]);total[0]+=t[0];total[1]+=t[1]
    i,j=divmod(x,4);jj,kk=divmod(y,4);k,ii=divmod(z,4);expected=8 if j==jj and kk==k and ii==i else 0
    if total!=[expected,0]:return False,checks
    checks+=1
 return True,checks
ok,n=check(arrays);assert ok and n==4096
original=arrays[0][0][0];arrays[0][0][0]=(original[0]+1,original[1]);mutated,m=check(arrays);assert not mutated;arrays[0][0][0]=original
Path('bench/x159/receipts/matmul-exact.json').write_text(json.dumps({'sourceRevision':'c42694909d50f92cb01c2d50916f022b1c7e74d1','sourcePath':'matmul_tensor_decompositions/verification_rank.ipynb','section':'decomposition_444','symbols':'Gaussian half-integers; multiply all factors by2; target coefficients multiplied by8','basisCoefficients':n,'passed':ok,'rank':48,'mutatedCoefficientRejected':not mutated,'mutationFailureAfterCoefficients':m,'notebookInspectionSha256':hashlib.sha256(text.encode()).hexdigest(),'scope':'tensor identity certifies bilinear 4x4 complex matrix multiplication; not fastest wall time, not token compression, not Lean replay'},indent=2));print(n,ok,'mutation rejected',not mutated)
