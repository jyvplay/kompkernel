"""Prepare single-user-message prompts, or verify an externally saved raw reply.
No model is invoked. Never strips fences, whitespace or final newlines.
Usage: python3 bench/x168/native-handoff.py [verify ID RESPONSE_FILE]
"""
import sys,json,hashlib
from pathlib import Path
root=Path('bench/x168/native');root.mkdir(exist_ok=True)
if len(sys.argv)==1:
 rows=json.loads(Path('bench/x168/receipts/heldout.json').read_text())['rows'];manifest=[]
 for i,r in enumerate(rows):
  if not r['plans']:continue
  source=Path(r['path']).read_bytes();p=r['plans'][0];file=root/f'{i}.txt';file.write_text(p['message'],encoding='utf8')
  manifest.append(dict(id=i,prompt=str(file),responseBytes=len(source),responseSha256=hashlib.sha256(source).hexdigest(),expectedContext='single user message only; no system skills/tools/dictionary',observed='NOT_RUN'))
 (root/'manifest.json').write_text(json.dumps(manifest,indent=2));print('Prepared',len(manifest),'prompts; native NOT_RUN')
else:
 assert len(sys.argv)==4 and sys.argv[1]=='verify'
 r=next(r for r in json.loads((root/'manifest.json').read_text()) if r['id']==int(sys.argv[2]));b=Path(sys.argv[3]).read_bytes();out=dict(id=r['id'],bytes=len(b),sha256=hashlib.sha256(b).hexdigest());out['exact']=out['bytes']==r['responseBytes'] and out['sha256']==r['responseSha256'];print(json.dumps(out));sys.exit(0 if out['exact'] else 1)
