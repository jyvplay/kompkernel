import subprocess,json,hashlib
from pathlib import Path
root=Path('.cache/x167/research');rows=[]
for repo,sha,paths in [('openai/math',json.loads((root/'openai-tree.json').read_text())['sha'],['lean/ComparatorChallenges/VPVNP.lean','lean/ComparatorChallenges/README.md']),('anthropics/formal-math',json.loads((root/'anthropic-tree.json').read_text())['sha'],['eth/Challenge.lean','eth/MainResults.lean','eth/Solution.lean'])]:
 for path in paths:
  b=subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json']);out=root/(repo.split('/')[0]+'-'+path.replace('/','_'));out.write_bytes(b);rows.append(dict(repo=repo,commit=sha,path=path,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
Path('bench/x167/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2))
