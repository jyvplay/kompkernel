"""Separate reader implementation, not independent personnel or native model."""
import json,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
r=Path('bench/x189/receipts');checks=0;unsupported=[]
for x in json.loads((r/'unit.json').read_text())['cases']:
 try:decoded=reader.parent_read(x['message'])
 except ValueError as e:unsupported.append(dict(scope='unit',family=x['family'],error=str(e)));continue
 assert decoded.encode()==x['source'].encode();checks+=1
for name in ['trials.jsonl','ranking.jsonl']:
 if not (r/name).exists():continue
 for x in map(json.loads,(r/name).read_text().splitlines()):
  if x['status']!='exact':continue
  try:decoded=reader.parent_read(x['message'])
  except ValueError as e:unsupported.append(dict(path=x['path'],family=x['family'],error=str(e)));continue
  assert decoded.encode()==Path(x['path']).read_bytes();checks+=1
out=dict(byteExact=checks,unsupported=unsupported,native='NOT_RUN',independentPersonnel=False)
(r/'independent.json').write_text(json.dumps(out,indent=2));print(out)
