"""Bounded individual follow-ups; source retrieval is not kernel replay."""
import json,subprocess,hashlib
from pathlib import Path
old=json.loads(Path('bench/x175/receipts/research-artifacts.json').read_text());pins={r['repo']:r['commit'] for r in old};root=Path('.cache/x176/research');root.mkdir(parents=True,exist_ok=True)
requests={
'openai/math':['lean/OAI/Algorithms/SubexponentialSAT/'+p+'.lean' for p in ['Algorithm','Interfaces','Computation','SubexpOrderedRawMainTheorem']],
'anthropics/formal-math':['eth/proof/rates/CountedToPadded/'+p+'.lean' for p in ['Defs','Need','SolverPoly']],
'anthropics/fermats-last-theorem':['FinalCheck.lean','PROOF-PATH.md','Theorems/Thm_fermat_last_theorem.lean'],
'double-ai/double-check':['lean/ChessProof/Trust.lean','lean/ChessProof/All63/Trust.lean','lean/ChessProof/All63/Final.lean'],
'google-deepmind/alphaproof-nexus-results':[r['path'] for r in old if r['repo']=='google-deepmind/alphaproof-nexus-results'],
'harmonic-ai/IMO2025':[r['path'] for r in old if r['repo']=='harmonic-ai/IMO2025'],
'ByteDance-Seed/Seed-Prover':[r['path'] for r in old if r['repo']=='ByteDance-Seed/Seed-Prover']}
rows=[]
for repo,paths in requests.items():
 for path in paths:
  sha=pins[repo];r=subprocess.run(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json'],capture_output=True)
  row=dict(repo=repo,commit=sha,path=path,kernel='NOT_RUN')
  if r.returncode:row['error']=r.stderr.decode()
  else:
   f=root/(repo.replace('/','_')+'-'+path.replace('/','_'));f.write_bytes(r.stdout);row.update(file=str(f),bytes=len(r.stdout),sha256=hashlib.sha256(r.stdout).hexdigest())
  rows.append(row)
Path('bench/x176/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2));print([(r['path'],r.get('bytes'),r.get('error')) for r in rows])
