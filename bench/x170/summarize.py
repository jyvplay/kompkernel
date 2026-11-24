import json
from pathlib import Path
root=Path('bench/x170/receipts')
def load(name):return json.loads((root/name).read_text())
trials=[json.loads(p.read_text()) for p in root.glob('trial-*.json')];assert len(trials)==6
rows=[dict(path=r['path'],base=r['base']['tokens'],selected=r['result']['tokens'],candidates=[c['tokens'] for c in r['candidates']]) for r in trials]
assert all(len(r['candidates'])==1 for r in rows)
frontier=load('frontier-compare.json')['summary'];assert frontier['lanes']==29
out=dict(codec='KYKLOS',productionIntegration=False,codecChecks=load('screen.json')['checks'],sourceCount=len(load('screen.json')['rows']),savedPairs=len(load('unit-pairs.json')),independent=load('independent.json'),parentTrials=rows,incumbentWinningTrials=sum(r['selected']<r['base'] for r in rows),significantWinningTrials=sum(r['selected']<r['base']-10 for r in rows),frontier=frontier,runtimeC=load('runtime-C-combined.json'),requests=load('requests-D-outcome.json'),native='NOT_RUN',paretoAccepted=False)
(root/'summary.json').write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k not in ['requests','runtimeC','parentTrials']},indent=2))
