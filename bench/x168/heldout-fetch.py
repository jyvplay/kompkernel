"""Replay frozen heldouts; --refresh explicitly acquires a new corpus at HEAD."""
import subprocess,json,hashlib,sys
from pathlib import Path
root=Path('bench/x168/fixtures');root.mkdir(exist_ok=True);manifest=Path('bench/x168/receipts/heldout-sources.json')
if manifest.exists() and '--refresh' not in sys.argv:
 rows=json.loads(manifest.read_text())
 for r in rows:
  data=subprocess.check_output(['gh','api',f"repos/{r['repo']}/contents/{r['path']}?ref={r['commit']}",'-H','Accept: application/vnd.github.raw+json'])
  assert hashlib.sha256(data).hexdigest()==r['sha256'];Path(r['file']).write_bytes(data)
  if 'licenseFile' in r:
   data=subprocess.check_output(['gh','api',f"repos/{r['repo']}/contents/{r['licenseSource']}?ref={r['commit']}",'-H','Accept: application/vnd.github.raw+json']);Path(r['licenseFile']).write_bytes(data)
else:
 rows=[]
 for repo,path in [('git/git','Documentation/howto/revert-a-faulty-merge.adoc'),('prometheus/prometheus','README.md'),('jqlang/jq','README.md'),('pallets/click','README.md')]:
  sha=subprocess.check_output(['gh','api',f'repos/{repo}/commits/HEAD','--jq','.sha'],text=True).strip()
  data=subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json'])
  file=root/(repo.replace('/','_')+'-'+path.split('/')[-1]);file.write_bytes(data)
  rows.append(dict(repo=repo,commit=sha,path=path,file=str(file),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),url=f'https://github.com/{repo}/blob/{sha}/{path}',scope='whole public documentation file; acquired separately from parent frontier'))
 manifest.write_text(json.dumps(rows,indent=2))
