import os,signal,json
from pathlib import Path
pids=[1884,8862,12398]
Path('bench/x165/receipts/combined-isolation.json').write_text(json.dumps({'pausedProcessGroups':pids,'scope':'canonical and codec workers paused; light source inspection may continue'}))
try:
 for pid in pids:os.killpg(pid,signal.SIGSTOP)
 script=Path('bench/x163/cache-speed-run.py').read_text().replace('bench/x163/','bench/x165/').replace('cache-speed','combined-cache-speed')
 exec(compile(script,'reused-combined-abba','exec'))
finally:
 for pid in pids:
  try:os.killpg(pid,signal.SIGCONT)
  except ProcessLookupError:pass
