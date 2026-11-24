"""Pinned source retrieval, not theorem-kernel verification."""
import json,subprocess,hashlib
from pathlib import Path
root=Path('.cache/x174/research');root.mkdir(parents=True,exist_ok=True)
rows=[]
old=json.loads(Path('bench/x173/receipts/research-artifacts.json').read_text())
requests=[(r['repo'],r['commit'],r['path']) for r in old if r['repo']!='double-ai/double-check']
requests += [('openai/math',old[0]['commit'],'lean/OAI/Computability/VPVNP/CompressorDefaultSelection.lean'),('anthropics/formal-math',old[1]['commit'],'eth/proof/rates/CountedToPadded/Main.lean'),('anthropics/formal-math',old[1]['commit'],'eth/proof/rates/CountedToPadded/RunFor.lean')]
requests += [('double-ai/double-check','d2fc22e3bc0b675acc18dd53d8e3003c8eceae3a','lean/ChessProof/All63/'+p) for p in ['Trust.lean','Final.lean','Axioms.lean']]
requests += [('anthropics/fermats-last-theorem','6e837e75355538c7f80bab5b956861e86c4eacc2',p) for p in ['README.md','FinalCheck.lean','formalization.yaml','PROOF-PATH.md']]
for repo,sha,path in requests:
 p=subprocess.run(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json'],capture_output=True)
 if p.returncode:rows.append(dict(repo=repo,commit=sha,path=path,error=p.stderr.decode()));continue
 b=p.stdout;file=root/(repo.replace('/','_')+'-'+Path(path).name);file.write_bytes(b)
 rows.append(dict(repo=repo,commit=sha,path=path,file=str(file),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),kernel='NOT_RUN'))
Path('bench/x174/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2));print([(r['path'],r.get('bytes'),r.get('error')) for r in rows])
