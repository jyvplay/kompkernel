"""Freeze fresh complete upstream documents; never edit their bytes."""
import json,subprocess,hashlib
from pathlib import Path
root=Path('bench/x170/fixtures');root.mkdir(exist_ok=True);rows=[]
for repo,branch,path,licensepath in [('python/cpython','main','Doc/tutorial/venv.rst','LICENSE'),('rust-lang/book','main','src/ch04-01-what-is-ownership.md','LICENSE-MIT'),('kubernetes/website','main','content/en/docs/tasks/debug/debug-application/debug-pods.md','LICENSE')]:
 sha=subprocess.check_output(['gh','api',f'repos/{repo}/commits/{branch}','--jq','.sha'],text=True).strip()
 b=subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json'])
 file=root/(repo.replace('/','_')+'-'+Path(path).name);file.write_bytes(b)
 lic=subprocess.check_output(['gh','api',f'repos/{repo}/contents/{licensepath}?ref={sha}','-H','Accept: application/vnd.github.raw+json']);lp=root/(repo.replace('/','_')+'-LICENSE.txt');lp.write_bytes(lic)
 rows.append(dict(repo=repo,commit=sha,path=path,file=str(file),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),license=str(lp),url=f'https://github.com/{repo}/blob/{sha}/{path}'))
 Path('bench/x170/receipts/heldout-sources.json').write_text(json.dumps(rows,indent=2))
print(rows)
