import json,hashlib,subprocess,collections
from pathlib import Path
root=Path('bench/x180');r=root/'receipts'
def load(p):return json.loads(Path(p).read_text())
front=load(r/'frontier-compare.json')['summary'];base={x['path']:x for x in map(json.loads,(r/'frontier.jsonl').read_text().splitlines())}
paid=[]
for file in sorted(r.glob('paid-[0-9][0-9].json')):
 x=load(file);b=base.get(x['path']);paid.append(dict(file=str(file),path=x['path'],kind=x['kind'],status=x['status'],tokens=x.get('tokens'),baselineTokens=b['tokens'] if b else None))
screen=load(r/'screen.json');old=subprocess.check_output(['git','ls-tree','-r','--name-only','97cd3e91b98223a4903953a28bee007331c7eb15','src/lib/omega'],text=True).splitlines();assert subprocess.check_output(['git','diff','97cd3e91b98223a4903953a28bee007331c7eb15','--',*old])==b''
summary=dict(accepted=False,productionUnchanged=True,frontier=front,unitChecks=screen['checks'],sources=len(screen['rows']),rawWins=[x['path'] for x in screen['rows'] if any(p['tokens']<x['raw'] for p in x.get('plans',[]))],paid=paid,paidWins=[x for x in paid if x['tokens'] is not None and x['baselineTokens'] is not None and x['tokens']<x['baselineTokens']],processCounts=dict(collections.Counter(x['status'] for x in load(r/'paid-processes.json'))),independent=load(r/'independent.json'),frontierReaders=load(r/'frontier-gate.json'),pythonFrontier=load(r/'replay-independent.json'),speed=load(r/'runtime-summary.json'),native=load(root/'native/manifest.json'),remaining=['Broad paid superiority not established','Native NOT_RUN','All-stack semantic novelty unproved','Timeouts leave exact pricing unknown','No exhaustive lab-proof or kernel audit'])
(r/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
files=[Path('src/lib/omega/apousia.ts'),Path('docs/codecs.md'),Path('docs/codec-abbreviations.md')]+[p for p in root.rglob('*') if p.is_file() and (p.suffix!='.mjs' or p.name.endswith('-build.mjs')) and p.name not in ['hashes.json','validation.log','summary.log','finish.log']]
(r/'hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},indent=2))
