"""Pinned source-interface retrieval, not a theorem-kernel replay."""
import subprocess,json,base64,hashlib
from pathlib import Path
old=json.loads(Path('bench/x182/receipts/research-artifacts.json').read_text());jobs=[{k:r[k] for k in ['repo','commit','path']} for r in old if 'commit' in r]
root=Path('.cache/x187/research');root.mkdir(parents=True,exist_ok=True);rows=[]
for j in jobs:
 try:
  d=json.loads(subprocess.check_output(['gh','api',f"repos/{j['repo']}/contents/{j['path']}?ref={j['commit']}"]));b=base64.b64decode(d['content']);f=root/(j['repo'].replace('/','_')+'-'+j['path'].replace('/','_'));f.write_bytes(b);rows.append(dict(**j,file=str(f),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),kernel='NOT_RUN'))
 except Exception as e:rows.append(dict(**j,error=str(e)))
Path('bench/x187/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2));print(len(rows),'retrieval records',sum('error' in r for r in rows),'errors')
