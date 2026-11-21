"""Read literal arrays only (no execution of downloaded notebook code)."""
import ast,json
from pathlib import Path
j=json.loads(Path('bench/x160/research/google-support.ipynb').read_text());arrays=None
for c in j['cells']:
 s=''.join(c['source'])
 if 'decomposition_227 = ' in s:
  tree=ast.parse(s);node=tree.body[0].value
  arrays=[ast.literal_eval(call.args[0]) for call in node.elts];break
assert arrays
A,B,C=[[[int(x) for x in row] for row in a] for a in arrays]
assert all(x==int(x) for a in arrays for r in a for x in r)
assert [len(a) for a in arrays]==[4,14,14] and all(len(r)==24 for a in arrays for r in a)
values=set();checked=0;nonunit=0
for i in range(4):
 for j in range(14):
  for k in range(14):
   v=sum(A[i][r]*B[j][r]*C[k][r] for r in range(24));target=(i%2==j//7 and j%7==k//2 and k%2==i//2)
   assert (v!=0)==target,(i,j,k,v);values.add(v);checked+=1;nonunit+=bool(target and v!=1)
Path('bench/x160/receipts/support-rank.json').write_text(json.dumps({'coefficients':checked,'rank':24,'dimensions':[2,2,7],'integerSupportIdentity':True,'nonunitTargetCoefficients':nonunit,'values':sorted(values),'notExactArithmeticMatmul':nonunit>0,'notMinimalityOrRuntimeProof':True},indent=2))
print(checked,sorted(values),nonunit)
