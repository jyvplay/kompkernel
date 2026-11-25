import json,hashlib,subprocess,collections
from pathlib import Path
root=Path('bench/x182');r=root/'receipts'
def load(p):return json.loads(Path(p).read_text())
front=load(r/'frontier-compare.json')['summary'];assert front['lanes']==29
base={x['path']:x for x in map(json.loads,(r/'frontier.jsonl').read_text().splitlines())};paid=[]
for file in sorted(r.glob('paid-[0-9][0-9].json')):
 x=load(file);b=base.get(x['path']);paid.append(dict(file=str(file),path=x['path'],status=x['status'],tokens=x['tokens'],baselineTokens=b['tokens'] if b else None,rank=x['rank']))
assert len(paid)==8
screen=load(r/'screen.json');old=subprocess.check_output(['git','ls-tree','-r','--name-only','e90ba76ef2a750c2314a5bbb17b8b56cde002ee5','src/lib/omega'],text=True).splitlines();assert subprocess.check_output(['git','diff','e90ba76ef2a750c2314a5bbb17b8b56cde002ee5','--',*old])==b''
for x in load(r/'heldout-sources.json'):assert hashlib.sha256(Path(x['file']).read_bytes()).hexdigest()==x['sha256']
summary=dict(accepted=False,productionUnchanged=True,frontier=front,unitChecks=screen['checks'],sources=len(screen['rows']),rawWins=[x['path'] for x in screen['rows'] if any(p['tokens']<x['raw'] for p in x['plans'])],paid=paid,paidWins=[x for x in paid if x['baselineTokens'] is not None and x['tokens']<x['baselineTokens']],processCounts=dict(collections.Counter(x['status'] for x in load(r/'paid-processes.json'))),independent=load(r/'independent.json'),frontierReaders=load(r/'frontier-gate.json'),pythonFrontier=load(r/'replay-independent.json'),speed=load(r/'runtime-summary.json'),native=load(root/'native/manifest.json'),remaining=['No demonstrated paid gains','Native NOT_RUN','Three bounded-reader grammars refused','All-stack semantic novelty unproved','No theorem-kernel or exhaustive all-labs audit'])
assert all(x['status']=='exact' for x in summary['independent']['paid']);assert len(summary['independent']['paid'])==8
assert all(x['status']=='exact' for x in load(r/'receipt-gate.json')['rows'])
(r/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
files=[Path('src/lib/omega/ropi.ts'),Path('src/lib/omega/grammikos-parent.ts'),Path('docs/codecs.md'),Path('docs/codec-abbreviations.md')]+[p for p in root.rglob('*') if p.is_file() and (p.suffix!='.mjs' or p.name.endswith('-build.mjs')) and p.name not in ['hashes.json','validation.log','summary.log','profile-summary.log']]
(r/'hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},indent=2))
