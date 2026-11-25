"""Pinned source-interface retrieval, not a theorem-kernel replay."""
import subprocess,json,base64,hashlib
from pathlib import Path
old=json.loads(Path('bench/x181/receipts/research-artifacts.json').read_text());jobs=[{k:r[k] for k in ['repo','commit','path']} for r in old if 'commit' in r]
for repo,path in [('openai/math','lean/OAI/Algorithms/SubexponentialSAT/BinaryArithmetic.lean'),('anthropics/formal-math','eth/proof/rates/CountedToPadded/RunFor.lean'),('double-ai/double-check','lean/ChessProof/All63/Circuit.lean'),('harmonic-ai/IMO2025','HarmonicLean/Attrs.lean'),('google-deepmind/formal-conjectures','FormalConjecturesForMathlib/Data/Set/Interval.lean')]:
 jobs.append(dict(repo=repo,path=path,commit=next(r['commit'] for r in old if r['repo']==repo),followup=True))
root=Path('.cache/x182/research');root.mkdir(parents=True,exist_ok=True);rows=[]
for j in jobs:
 try:
  d=json.loads(subprocess.check_output(['gh','api',f"repos/{j['repo']}/contents/{j['path']}?ref={j['commit']}"]));b=base64.b64decode(d['content']);f=root/(j['repo'].replace('/','_')+'-'+j['path'].replace('/','_'));f.write_bytes(b);rows.append(dict(**j,file=str(f),sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),kernel='NOT_RUN'))
 except Exception as e:rows.append(dict(**j,error=str(e)))
Path('bench/x182/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2));print(len(rows),'retrieval records',sum('error' in r for r in rows),'errors')
