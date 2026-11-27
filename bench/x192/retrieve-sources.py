"""Restore pinned research sources; requires authenticated gh, verifies SHA256."""
import json,subprocess,base64,hashlib
from pathlib import Path
for r in json.loads(Path('bench/x192/receipts/research-sources.json').read_text()):
 p=Path(r['file'])
 if not p.exists():
  data=json.loads(subprocess.check_output(['gh','api',f"repos/{r['repo']}/contents/{r['path']}?ref={r['commit']}"]));p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(base64.b64decode(data['content']))
 assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']
print('Pinned sources verified; no proof kernel invoked')
