"""Reuse the original three-lane cold ABBA runner, with real heavy workers paused."""
import os,signal,sys,json
from pathlib import Path
pids=list(map(int,sys.argv[1:]));paused=[]
Path('bench/x166/receipts/retention-isolation.json').write_text(json.dumps({'requestedPids':pids,'scope':'pause canonical and instrumented Requests; no compilers or other test runs during ABBA'}))
try:
 for pid in pids:
  try:os.kill(pid,signal.SIGSTOP);paused.append(pid)
  except ProcessLookupError:pass
 s=Path('bench/x163/cache-speed-run.py').read_text().replace('bench/x163/','bench/x166/').replace('cache-speed','retention')
 exec(compile(s,'reused-retention-abba','exec'))
finally:
 for pid in paused:
  try:os.kill(pid,signal.SIGCONT)
  except ProcessLookupError:pass
