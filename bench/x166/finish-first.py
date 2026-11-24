"""Stop the existing serial worker after its first complete receipt.
Uses blocking Linux inotify, not guessed sleeps; allows the other 28 lanes to
run in a separate worker without intentionally recomputing the expensive lane.
"""
import os,sys,ctypes,json,signal
from pathlib import Path
pid=int(sys.argv[1]);p=Path('bench/x166/receipts/frontier.jsonl')
libc=ctypes.CDLL(None,use_errno=True);fd=libc.inotify_init1(0)
if fd<0:raise OSError(ctypes.get_errno(),'inotify_init1')
wd=libc.inotify_add_watch(fd,os.fsencode(p),2|8)
if wd<0:raise OSError(ctypes.get_errno(),'inotify_add_watch')
try:
 while True:
  text=p.read_text()
  if '\n' in text:
   lines=text.splitlines();r=json.loads(lines[0]);assert r['path']=='bench/holdout-x41/ls-l-real.txt'
   Path('bench/x166/receipts/frontier-first.jsonl').write_text(lines[0]+'\n')
   os.kill(pid,signal.SIGTERM)
   Path('bench/x166/receipts/frontier-split.json').write_text(json.dumps({'firstReceiptComplete':True,'pidStoppedAfterFirstReceipt':pid,'scope':'workflow split; canonical algorithm and flags unchanged; serial worker intentionally terminated after saved first lane'},indent=2))
   break
  os.read(fd,4096)
finally:os.close(fd)
