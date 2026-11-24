"""Separate Python reader, original source bytes, explicit unsupported cases."""
import json,hashlib
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
out=[]
for name in ['frontier','requests']:
 file=Path(f'bench/x174/receipts/{name}.jsonl')
 if not file.exists():continue
 rows=[]
 for line in file.read_text().splitlines():
  r=json.loads(line);source=Path(r['path']).read_bytes()
  try:restored=reader.parent_read(r['message']).encode()
  except ValueError as e:
   if str(e) not in ['unsupported layout','unsupported instruction envelope']:raise
   rows.append(dict(path=r['path'],status='unsupported',error=str(e)));continue
  if restored!=source:
   rows.append(dict(path=r['path'],status='mismatch',expectedBytes=len(source),actualBytes=len(restored)));continue
  rows.append(dict(path=r['path'],status='exact',bytes=len(source),sha256=hashlib.sha256(source).hexdigest()))
 out.append(dict(input=str(file),exact=sum(r['status']=='exact' for r in rows),unsupported=sum(r['status']=='unsupported' for r in rows),mismatches=sum(r['status']=='mismatch' for r in rows),rows=rows))
Path('bench/x174/receipts/replay-independent.json').write_text(json.dumps(out,indent=2));print([(r['input'],r['exact'],r['unsupported']) for r in out])
for r in out:
 assert r['mismatches']==0, 'source byte mismatch'
 assert len(r['rows'])==(29 if r['input'].endswith('frontier.jsonl') else 1), 'incomplete replay'
