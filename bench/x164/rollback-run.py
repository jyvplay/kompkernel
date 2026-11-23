"""Reuse X163 cold-process ABBA runner; freeze competing process groups explicitly."""
import os,signal,json
from pathlib import Path
pids=[1618,2634,6076]
Path('bench/x164/receipts/rollback-isolation.json').write_text(json.dumps({'pausedProcessGroups':pids,'scope':'CPU-bound frontier/codec trials paused; light source inspection may continue; not pristine-machine certification'}))
try:
 for pid in pids:os.killpg(pid,signal.SIGSTOP)
 script=Path('bench/x163/cache-speed-run.py').read_text().replace('bench/x163/','bench/x164/').replace('cache-speed','rollback-speed')
 exec(compile(script,'reused-x163-abba','exec'))
 # Audit actual production closures with committed-array snapshots retained.
 import subprocess
 evidence=[]
 for lane in ['bench/holdout-work/kb-article.txt','bench/holdout-x41/ps-real.txt','bench/holdout/json-pkg.txt']:
  r=json.loads(subprocess.check_output(['node','bench/x164/rollback-speed-audit.mjs',lane],text=True))
  reference=next(json.loads(line) for line in Path('bench/x164/receipts/rollback-speed.jsonl').read_text().splitlines() if json.loads(line)['path']==lane)
  assert r['hash']==reference['hash'];assert r['rollbackChecks']>0;evidence.append(r)
 Path('bench/x164/receipts/rollback-audit.json').write_text(json.dumps(evidence,indent=2))
finally:
 for pid in pids:
  try:os.killpg(pid,signal.SIGCONT)
  except ProcessLookupError:pass
