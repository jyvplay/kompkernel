"""Finite mathematical checks/countermodels; no external theorem kernel."""
import json
from pathlib import Path
checks=0
# Google: base-four complementary digit split, not the infinite density proof.
for n in range(65536):
 a=b=0;power=1;x=n
 while x:a+=(x%2)*power;b+=(x%4-x%2)*power;x//=4;power*=4
 assert a+b==n;checks+=1
# Harmonic and Seed: different concrete bonza witnesses, neither universal upper bound.
for f in [lambda n:1 if n%2 else 4 if n%4==2 else 16,lambda n:16 if n==4 else 1 if n%2 else 2]:
 for a in range(1,101):
  for b in range(1,101):assert pow(b,a,f(a))==pow(f(b),f(a),f(a));checks+=1
 assert f(4)==16;checks+=1
# DoubleAI Eq6 cyclic matrix identity. Integer real specialization only.
def mul(A,B):return [[sum(A[i][k]*B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
I=[[int(i==j) for j in range(4)] for i in range(4)]
for gamma in [-2,-1,0,1,2]:
 U=[[0,1,0,0],[0,0,1,0],[0,0,0,1],[gamma,0,0,0]]
 assert mul(mul(U,U),mul(U,U))==[[gamma*v for v in row] for row in I];checks+=1
 unitary=mul(U,list(map(list,zip(*U))))==I
 assert unitary==(gamma in [-1,1]);checks+=1
# Necessary Kraft bound is NOT sufficient for a specified code assignment.
code={'a':'0','b':'0'};assert sum(2**-len(v) for v in code.values())==1 and len(set(code.values()))<len(code);checks+=1
# The desired universal strictly-shorter injection already fails for binary length3.
assert sum(2**k for k in range(3))<2**3;checks+=1
# Modal shortcut: one exact inverse does not establish another decoder.
wire='Q Q';expected='alpha beta'
assert ' '.join(['alpha','beta'])==expected and wire!=expected;checks+=1
out=dict(checks=checks,scope='finite digit identities, modular witnesses and premise countermodels only',kernels='NOT_RUN');Path('bench/x170/receipts/transfer-checks.json').write_text(json.dumps(out,indent=2));print(out)
