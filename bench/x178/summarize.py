"""Final evidence binding: run only after paid processes and fresh replay finish."""
import hashlib,json,subprocess
from pathlib import Path
root=Path('bench/x178');receipts=root/'receipts'
def load(p):return json.loads(Path(p).read_text())
front=load('bench/x177/receipts/frontier-compare.json')['summary'];assert front['lanes']==29
paid=[]
for file in sorted(receipts.glob('trial-*.json')):
 r=load(file);source=Path(r['path']).read_bytes();assert source
 for c in r['candidates']:
  paid.append(dict(path=r['path'],mode=c['mode'],width=c['n'],before=r['base']['tokens'],after=c['tokens'],status=c['status'],file=str(file)))
processes=load(receipts/'paid-processes.json');assert len(processes)==8
assert all(r['status'] in ['completed','TIMEOUT','process-failed'] for r in processes)
for generation in ['x177','x178']:
 for r in load(f'bench/{generation}/receipts/heldout-sources.json'):
  assert hashlib.sha256(Path(r['file']).read_bytes()).hexdigest()==r['sha256']
base='cc72aba540491c4f8e9f0ee3b1cee7ee0b2e2f29'
existing=subprocess.check_output(['git','ls-tree','-r','--name-only',base,'src/lib/omega'],text=True).splitlines()
assert subprocess.check_output(['git','diff',base,'--',*existing])==b''
provenance=dict(scope='One fresh canonical replay begun X177, completed X178; not two independent runs. No production codec or speed changes.',base=base,replay='bench/x177/receipts/frontier.jsonl',replaySha256=hashlib.sha256(Path('bench/x177/receipts/frontier.jsonl').read_bytes()).hexdigest(),existingModuleCount=len(existing),productionSha256={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in existing})
(receipts/'frontier-provenance.json').write_text(json.dumps(provenance,indent=2))
screen=load(receipts/'screen.json');native=load(root/'native/manifest.json');speed=load(receipts/'runtime-summary.json');independent=load(receipts/'independent.json')
summary=dict(accepted=False,productionUnchanged=True,frontier=front,checks=screen['checks'],sources=len(screen['rows']),supportedSources=sum(bool(r.get('plans')) for r in screen['rows']),rawWinningSources=[r['path'] for r in screen['rows'] if any(p['tokens']<r['raw'] for p in r.get('plans',[]))],paid=paid,paidWins=[r for r in paid if r['after']<r['before']],paidProcessFailures=[r for r in processes if r['status']!='completed'],initialParentFailure=load(receipts/'initial-parent-status.json'),independent=independent,speed=speed,native=native,x177=load('bench/x177/receipts/paid-summary.json'),remaining=['No demonstrated significant varied-source paid gain','Native model behavior NOT_RUN','No accepted significant whole-stack speed improvement','X177 raw-winning-source all-plan tournament not completed: budget-limited','No exhaustive semantic novelty or all-labs proof audit'])
(receipts/'summary.json').write_text(json.dumps(summary,indent=2))
files=[Path('src/lib/omega/pinakas.ts'),Path('src/lib/omega/kyklograf-frequency.ts')]
for d in ['bench/x177','bench/x178']:
 files.extend(p for p in Path(d).rglob('*') if p.is_file() and (p.suffix!='.mjs' or p.name.endswith('-build.mjs')) and p.name not in ['hashes.json','validation.log'])
(receipts/'hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(files))},indent=2))
print(json.dumps({k:summary[k] for k in ['accepted','frontier','checks','sources','supportedSources','rawWinningSources','paidWins','paidProcessFailures']},indent=2))
