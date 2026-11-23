import os,signal,json
from pathlib import Path
pids=[1884]
Path('bench/x165/receipts/speed-isolation.json').write_text(json.dumps({'pausedProcessGroups':pids,'scope':'canonical paused; context trials exited; light inspection allowed'}))
try:
 for pid in pids:os.killpg(pid,signal.SIGSTOP)
 script=Path('bench/x163/cache-speed-run.py').read_text().replace('bench/x163/','bench/x165/')
 exec(compile(script,'reused-abba','exec'))
finally:
 for pid in pids:
  try:os.killpg(pid,signal.SIGCONT)
  except ProcessLookupError:pass
