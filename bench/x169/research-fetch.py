import subprocess,json,hashlib
from pathlib import Path
root=Path('.cache/x169/research');root.mkdir(parents=True,exist_ok=True);rows=[]
items=[('openai/math','f5702854040e97fa7675c21ba37a9608f5f92dd3','lean/OAI/Computability/VPVNP/FixedPaperPairCompiler.lean'),('anthropics/formal-math','11b6c7e3c927df2658f513b6b68ea7f8929c62c5','eth/proof/rates/CountedToPadded/Defs.lean'),('anthropics/formal-math','11b6c7e3c927df2658f513b6b68ea7f8929c62c5','eth/proof/rates/CountedToPadded/Main.lean'),('harmonic-ai/IMO2025','72b62405a176a7eaeadb335a7fa6ee80b6667161','HarmonicLean/StatementOnly_IMO2025P3.lean'),('ByteDance-Seed/Seed-Prover','38c59cebaf969ac259196eb091757518d5b54c67','SeedProver/imo2025/p3.lean'),('ByteDance-Seed/Seed-Prover','38c59cebaf969ac259196eb091757518d5b54c67','SeedProver/imo2025/IMO2025/P3.lean'),('google-deepmind/formal-conjectures','7862bf6a6976c26acb086b6b2cec12ad1d92ce5d','FormalConjecturesForMathlib/Data/Set/Density.lean'),('google-deepmind/formal-conjectures','7862bf6a6976c26acb086b6b2cec12ad1d92ce5d','FormalConjectures/ErdosProblems/741.lean')]
for repo,sha,path in items:
 r=subprocess.run(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json'],capture_output=True)
 if r.returncode:rows.append(dict(repo=repo,commit=sha,path=path,error=r.stderr.decode()));continue
 file=root/(repo.split('/')[0]+'-'+path.replace('/','_'));file.write_bytes(r.stdout);rows.append(dict(repo=repo,commit=sha,path=path,file=str(file),bytes=len(r.stdout),sha256=hashlib.sha256(r.stdout).hexdigest()))
Path('bench/x169/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2))
