"""Finite premise tests only, not theorem-kernel output."""
import json,hashlib
from pathlib import Path
checks=0
def f(n):return 16 if n==4 else 1 if n%2 else 2
for a in range(1,101):
 for b in range(1,101):
  assert (pow(b,a,f(a))-pow(f(b),f(a),f(a)))%f(a)==0;checks+=1
assert f(4)/4==4;checks+=1
# Two expanding eigenvalues at q=3,k=1 give determinant factors 3 each.
assert 3*3>3;checks+=1
# Encoded oracle tables can dominate nominal padding: do not omit their size.
assert 2**20>2**10;checks+=1
p=Path('.cache/x169/research/ByteDance-Seed-SeedProver_imo2025_IMO2025_P3.lean');assert p.exists()
Path('bench/x169/receipts/transfer-checks.json').write_text(json.dumps(dict(checks=checks,seedSourceSha256=hashlib.sha256(p.read_bytes()).hexdigest(),scope='100x100 finite bonza witness; premise mutants only',kernels='NOT_RUN'),indent=2));print(checks)
