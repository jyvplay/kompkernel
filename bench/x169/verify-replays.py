"""Separate Python reader, original source bytes, explicit unsupported cases."""
import json,hashlib
from pathlib import Path
ns={};exec(compile(Path('bench/x159/independent.py').read_text().split('checks=0;rows=[]')[0],'parent','exec'),ns)
out=[]
for name in ['frontier','requests-D']:
 file=Path(f'bench/x169/receipts/{name}.jsonl')
 if not file.exists():continue
 rows=[]
 for line in file.read_text().splitlines():
  r=json.loads(line);source=Path(r['path']).read_bytes()
  try:restored=ns['parent_read'](r['message']).encode()
  except ValueError as e:
   if str(e)!='unsupported layout':raise
   rows.append(dict(path=r['path'],status='unsupported',error=str(e)));continue
  if restored!=source:
   rows.append(dict(path=r['path'],status='mismatch',expectedBytes=len(source),actualBytes=len(restored)));continue
  rows.append(dict(path=r['path'],status='exact',bytes=len(source),sha256=hashlib.sha256(source).hexdigest()))
 out.append(dict(input=str(file),exact=sum(r['status']=='exact' for r in rows),unsupported=sum(r['status']=='unsupported' for r in rows),mismatches=sum(r['status']=='mismatch' for r in rows),rows=rows))
Path('bench/x169/receipts/replay-independent.json').write_text(json.dumps(out,indent=2));print([(r['input'],r['exact'],r['unsupported']) for r in out])
