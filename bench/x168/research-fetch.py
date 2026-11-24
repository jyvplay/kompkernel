"""Re-fetch pinned artifacts listed in committed receipt; never executes Lean."""
import json,hashlib,subprocess
from pathlib import Path
root=Path('.cache/x168/research');root.mkdir(parents=True,exist_ok=True)
for r in json.loads(Path('bench/x168/receipts/research-artifacts.json').read_text()):
 b=subprocess.check_output(['gh','api',f"repos/{r['repo']}/contents/{r['path']}?ref={r['commit']}",'-H','Accept: application/vnd.github.raw+json'])
 assert hashlib.sha256(b).hexdigest()==r['sha256']
 prefix=r['repo'].split('/')[0]
 if prefix=='google-deepmind':prefix='google'
 if prefix=='anthropics' and '/CountedRoute/Defs.' not in r['path']:prefix='anthropic'
 (root/(prefix+'-'+r['path'].replace('/','_'))).write_bytes(b)
