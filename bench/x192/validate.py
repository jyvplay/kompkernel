"""Final gates; paid/frontier/runtime workers are separately reproduced."""
import subprocess,json,time,sys
from pathlib import Path
r=Path('bench/x192/receipts');rows=[]
commands=[['npx','esbuild','bench/x192/test.ts','--bundle','--platform=node','--format=esm','--outfile=bench/x192/test.mjs'],['node','bench/x192/test.mjs'],['python3','bench/x192/independent.py'],['python3','bench/x192/native_eval.py','selftest'],['npx','tsc','--noEmit'],['npm','run','build']]
for i,c in enumerate(commands):
 t=time.monotonic()
 with (r/f'validation-{i}.log').open('w') as f:p=subprocess.run(c,stdout=f,stderr=subprocess.STDOUT)
 rows.append(dict(command=c,exit=p.returncode,wallSeconds=time.monotonic()-t,log=str(r/f'validation-{i}.log')))
 (r/'validation.json').write_text(json.dumps(rows,indent=2))
 if p.returncode:sys.exit(p.returncode)
print('passed',len(rows),'commands')
