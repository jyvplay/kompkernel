"""Pinned primary-source follow-up; retrieval/inspection is not kernel replay."""
import json,subprocess,hashlib
from pathlib import Path
pins={r['repo']:r['commit'] for r in json.loads(Path('bench/x177/receipts/research-artifacts.json').read_text())}
pr=json.loads(Path('bench/x178/receipts/tauceti-pr.json').read_text());pins['TauCetiProject/TauCeti']=pr['headRefOid']
requests={
 'openai/math':['lean/OAI/Algorithms/SubexponentialSAT/SqrtLogSpace/Final.lean'],
 'anthropics/formal-math':['eth/proof/rates/CountedToPadded/Need.lean'],
 'anthropics/fermats-last-theorem':['FinalCheck.lean'],
 'double-ai/double-check':['lean/ChessProof/All63/Trust.lean'],
 'google-deepmind/alphaproof-nexus-results':['APNOutputs/ErdosProblems/erdos_741.parts.i.lean'],
 'harmonic-ai/IMO2025':['HarmonicLean/IMO2025P3.lean'],
 'ByteDance-Seed/Seed-Prover':['SeedProver/imo2025/IMO2025/P3.lean'],
 'TauCetiProject/TauCeti':['TauCeti/Combinatorics/Young/RobinsonSchensted.lean','TauCeti/Combinatorics/Young/Schensted.lean']}
root=Path('.cache/x178/research');root.mkdir(parents=True,exist_ok=True);rows=[]
for repo,paths in requests.items():
 for path in paths:
  sha=pins[repo];r=subprocess.run(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json'],capture_output=True)
  row=dict(repo=repo,commit=sha,path=path,kernel='NOT_RUN')
  if r.returncode:row['error']=r.stderr.decode()
  else:
   f=root/(repo.replace('/','_')+'-'+path.replace('/','_'));f.write_bytes(r.stdout);row.update(file=str(f),bytes=len(r.stdout),sha256=hashlib.sha256(r.stdout).hexdigest())
  rows.append(row)
Path('bench/x178/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2));print([(r['path'],r.get('bytes'),r.get('error')) for r in rows])
