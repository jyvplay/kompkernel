import subprocess,json,base64,hashlib
from pathlib import Path
root=Path('bench/x184/fixtures');root.mkdir(parents=True,exist_ok=True);rows=[]
for repo,path,license in [('git/git','Documentation/git-restore.adoc','COPYING'),('rust-lang/book','src/ch10-03-lifetime-syntax.md','LICENSE-MIT')]:
 commit=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/commits/HEAD']))['sha']
 for name in [path,license]:
  d=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/contents/{name}?ref={commit}']));b=base64.b64decode(d['content']);f=root/(repo.replace('/','_')+'-'+name.split('/')[-1]);f.write_bytes(b)
  if name==path:rows.append(dict(repo=repo,commit=commit,path=path,file=str(f),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),license=str(root/(repo.replace('/','_')+'-'+license)),selection='Whole documents fetched after KARTES family fixed; not a blinded model trial.'))
Path('bench/x184/receipts/heldout-sources.json').write_text(json.dumps(rows,indent=2));print(rows)
