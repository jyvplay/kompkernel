"""Reuse X163 cold-process ABBA runner; freeze competing process groups explicitly."""
import os,signal,json
from pathlib import Path
pids=[1618,2634]
Path('bench/x164/receipts/cache-isolation.json').write_text(json.dumps({'pausedProcessGroups':pids,'scope':'CPU-bound frontier/codec trials paused; light source inspection may continue; not pristine-machine certification'}))
try:
 for pid in pids:os.killpg(pid,signal.SIGSTOP)
 script=Path('bench/x163/cache-speed-run.py').read_text().replace('bench/x163/','bench/x164/')
 exec(compile(script,'reused-x163-abba','exec'))
finally:
 for pid in pids:
  try:os.killpg(pid,signal.SIGCONT)
  except ProcessLookupError:pass
