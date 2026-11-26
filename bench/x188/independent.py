"""Separately implemented parent reader; same agent, not independent personnel."""
import json, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py')
reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
r=json.loads(Path('bench/x188/receipts/trials.json').read_text());checks=0;unsupported=[]
for row in r['out']:
 for v in row['variants']:
  if 'message' not in v:continue
  try:actual=reader.parent_read(v['message'])
  except ValueError as e:unsupported.append(dict(path=row['path'],width=v['width'],error=str(e)));continue
  assert actual.encode('utf8')==Path(row['path']).read_bytes(),row['path']
  checks+=1
result=dict(byteExact=checks,unsupported=unsupported,native='NOT_RUN',independentAgent=False)
Path('bench/x188/receipts/independent.json').write_text(json.dumps(result,indent=2));print(result)
