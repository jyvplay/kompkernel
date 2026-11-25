import json,subprocess,hashlib
from pathlib import Path
manifest=json.loads(Path('.cache/x179/research/google-deepmind_alphaproof-nexus-results-lake-manifest.json').read_text())
pkg=next(p for p in manifest['packages'] if p['name']=='formal_conjectures');repo=pkg['url'].removeprefix('https://github.com/');sha=pkg['rev'];path='FormalConjecturesForMathlib/Data/Set/Density.lean'
b=subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}','-H','Accept: application/vnd.github.raw+json']);f=Path('.cache/x179/research/google-density.lean');f.write_bytes(b)
p=Path('bench/x179/receipts/research-artifacts.json');rows=json.loads(p.read_text());rows=[r for r in rows if r['repo']!=repo];rows.append(dict(repo=repo,commit=sha,path=path,file=str(f),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),kernel='NOT_RUN',pinSource='AlphaProof lake-manifest.json'));p.write_text(json.dumps(rows,indent=2))
