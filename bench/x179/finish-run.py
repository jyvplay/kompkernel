"""Run one raw-winning KLADOS parent, then isolated speed; no simultaneous paid job."""
import subprocess,json
from pathlib import Path
root=Path('bench/x179/receipts');job=dict(kind='klados',path='bench/holdout-x41/ls-l-real.txt',policy='local',file=str(root/'paid-37.json'))
with (root/'paid-37.log').open('w') as f:
 try:r=subprocess.run(['node','--max-old-space-size=900','bench/x179/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if r.returncode==0 else 'process-failed';code=r.returncode
 except subprocess.TimeoutExpired:status='TIMEOUT';code=None
(root/'raw-parent-process.json').write_text(json.dumps(dict(job=job,status=status,exit=code,limitSeconds=90,oldSpaceMiB=900),indent=2))
pids=[]
for p in Path('/proc').glob('[0-9]*/cmdline'):
 try:cmd=p.read_bytes().split(b'\0')
 except (OSError,ProcessLookupError):continue
 if cmd and cmd[0].split(b'/')[-1]==b'node' and b'bench/x179/frontier.mjs' in cmd:pids.append(p.parent.name)
with (root/'runtime.log').open('w') as f:
 subprocess.run(['python3','bench/x179/runtime-run.py',*pids],stdout=f,stderr=subprocess.STDOUT,check=True)
