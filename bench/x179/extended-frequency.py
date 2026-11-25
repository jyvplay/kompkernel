"""Budget escalation AFTER isolated speed completes; not a replacement for timeout receipts.
Choose ps-ef's best raw-ranked plan from the prior screen, not a paid winner.
180 s wall, fresh 900 MiB worker, no simultaneous benchmark.
"""
import json,subprocess
from pathlib import Path
root=Path('bench/x179/receipts');screen=json.loads(Path('bench/x177/receipts/screen.json').read_text());r=next(r for r in screen['rows'] if r['path']=='bench/holdout-x42/ps-ef.txt');p=min(r['plans'],key=lambda p:p['tokens']);job=dict(kind='frequency',path=r['path'],n=p['n'],order=p['order'],file=str(root/'paid-38.json'))
with (root/'paid-38.log').open('w') as f:
 try:run=subprocess.run(['node','--max-old-space-size=900','bench/x179/worker.mjs',json.dumps(job)],stdout=f,stderr=subprocess.STDOUT,timeout=180);status='completed' if run.returncode==0 else 'process-failed';code=run.returncode
 except subprocess.TimeoutExpired:status='TIMEOUT';code=None
(root/'extended-frequency-process.json').write_text(json.dumps(dict(job=job,status=status,exit=code,limitSeconds=180,oldSpaceMiB=900,selection='Prior best complete raw-price plan; escalation after all 24 bounded attempts timed out'),indent=2));print(status)
