"""Fetch pinned source evidence only; no Lean compilation is claimed."""
import subprocess,hashlib,json
from pathlib import Path
root=Path('.cache/x172/research');root.mkdir(parents=True,exist_ok=True);rows=[]
for name,repo,sha,path in [
 ('openai-rated-terminal','openai/math','f5702854040e97fa7675c21ba37a9608f5f92dd3','lean/OAI/Computability/VPVNP/FixedPaperRatedTerminal.lean'),
 ('anthropic-runfor','anthropics/formal-math','11b6c7e3c927df2658f513b6b68ea7f8929c62c5','eth/proof/rates/CountedToPadded/RunFor.lean'),
 ('google-741','google-deepmind/alphaproof-nexus-results','0647711a71183c1ea492ad60860776617ce1ea88','APNOutputs/ErdosProblems/erdos_741.parts.i.lean'),
 ('harmonic-P3','harmonic-ai/IMO2025','72b62405a176a7eaeadb335a7fa6ee80b6667161','HarmonicLean/IMO2025P3.lean'),
 ('seed-P3','ByteDance-Seed/Seed-Prover','38c59cebaf969ac259196eb091757518d5b54c67','SeedProver/imo2025/IMO2025/P3.lean')]:
 b=subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json']);file=root/(name+'.lean');file.write_bytes(b);rows.append(dict(repo=repo,commit=sha,path=path,file=str(file),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),kernel='NOT_RUN'))
Path('bench/x172/receipts/research-artifacts.json').write_text(json.dumps(rows,indent=2))
