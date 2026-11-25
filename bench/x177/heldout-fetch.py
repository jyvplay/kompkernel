import subprocess,json,hashlib
from pathlib import Path
out=[];root=Path('bench/x177/fixtures');root.mkdir(exist_ok=True)
old=json.loads(Path('bench/x174/receipts/heldout-sources.json').read_text())
paths=['Doc/tutorial/datastructures.rst','src/ch13-02-iterators.md','content/en/docs/tasks/debug/debug-application/debug-statefulset.md']
for r,path in zip(old,paths):
 p=subprocess.run(['gh','api',f'repos/{r["repo"]}/contents/{path}?ref={r["commit"]}','-H','Accept: application/vnd.github.raw+json'],capture_output=True)
 if p.returncode:out.append(dict(repo=r['repo'],path=path,error=p.stderr.decode()));continue
 b=p.stdout;file=root/(r['repo'].replace('/','_')+'-'+Path(path).name);file.write_bytes(b);assert b.decode().encode()==b
 license=root/Path(r['license']).name;license.write_bytes(Path(r['license']).read_bytes());out.append(dict(repo=r['repo'],commit=r['commit'],path=path,file=str(file),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),license=str(license),selection='whole new documents; not model-blinded'))
Path('bench/x177/receipts/heldout-sources.json').write_text(json.dumps(out,indent=2));print([(r.get('file'),r.get('bytes'),r.get('error')) for r in out])
