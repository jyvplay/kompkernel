import subprocess,json,hashlib
from pathlib import Path
out=[];root=Path('bench/x172/fixtures');root.mkdir(exist_ok=True)
old=json.loads(Path('bench/x170/receipts/heldout-sources.json').read_text())
paths=['Doc/tutorial/errors.rst','src/ch04-02-references-and-borrowing.md','content/en/docs/tasks/debug/debug-application/debug-service.md']
for r,path in zip(old,paths):
 b=subprocess.check_output(['gh','api',f'repos/{r["repo"]}/contents/{path}?ref={r["commit"]}','-H','Accept: application/vnd.github.raw+json']);file=root/(r['repo'].replace('/','_')+'-'+Path(path).name);file.write_bytes(b);assert len(b.decode().encode())==len(b)
 license=root/Path(r['license']).name;license.write_bytes(Path(r['license']).read_bytes());out.append(dict(repo=r['repo'],commit=r['commit'],path=path,file=str(file),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),license=str(license),selection='new whole document; not model-blinded'))
Path('bench/x172/receipts/heldout-sources.json').write_text(json.dumps(out,indent=2));print([(r['file'],r['bytes']) for r in out])
