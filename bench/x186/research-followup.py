"""Bounded source inspection only, no Lean or ZK verification."""
import subprocess,json,base64,hashlib
from pathlib import Path
old=json.loads(Path('bench/x186/receipts/research-artifacts.json').read_text());jobs=[]
for repo,path in [('openai/math','lean/OAI/Algorithms/SubexponentialSAT/Computation.lean'),('double-ai/double-check','lean/ChessProof/Cnf.lean'),('anthropics/formal-math','eth/proof/rates/CountedToPadded/Compare.lean')]:jobs.append(dict(repo=repo,path=path,commit=next(r['commit'] for r in old if r['repo']==repo)))
for repo,commit,paths in [('anthropics/zeta-23-lean','11b6c7e3c927df2658f513b6b68ea7f8929c62c5',['zeta23/README.md','zeta23/AUDIT.md','zeta23/Challenge.lean','zeta23/comparator.json']),('openai/math','3344da59991ed94f9ba711217b29c1d760badfa6',['README.md','history.md']),('double-ai/double-zkp-ecc','969ea21f2b0a019e10223331ab8a44ddd130706d',['README.md'])]:
 for path in paths:jobs.append(dict(repo=repo,commit=commit,path=path))
root=Path('.cache/x186/research');rows=[]
for j in jobs:
 try:
  d=json.loads(subprocess.check_output(['gh','api',f"repos/{j['repo']}/contents/{j['path']}?ref={j['commit']}"]));b=base64.b64decode(d['content']);f=root/(j['repo'].replace('/','_')+'-'+j['path'].replace('/','_'));f.write_bytes(b);rows.append(dict(**j,file=str(f),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),kernel='NOT_RUN'))
 except Exception as e:rows.append(dict(**j,error=str(e)))
Path('bench/x186/receipts/research-followup.json').write_text(json.dumps(rows,indent=2));print(len(rows),'retrieval records',sum('error' in r for r in rows),'errors')
