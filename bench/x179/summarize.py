import json,hashlib,subprocess,collections
from pathlib import Path
root=Path('bench/x179');r=root/'receipts'
def load(p):return json.loads(Path(p).read_text())
front=load(r/'frontier-compare.json')['summary'];assert front['lanes']==29
baselines={x['path']:x for x in map(json.loads,(r/'frontier.jsonl').read_text().splitlines())}
processes=load(r/'paid-processes.json');assert len(processes)==37
assert sum(p['job']['kind']=='frequency' for p in processes)==24
paid=[];ineligible=[]
for p in sorted(r.glob('paid-[0-9][0-9].json')):
 x=load(p)
 if x['status']=='ineligible':ineligible.append(dict(path=x['path'],policy=x.get('policy')));continue
 base=baselines.get(x['path']);paid.append(dict(path=x['path'],kind=x['kind'],policy=x.get('policy'),n=x.get('n'),order=x.get('order'),tokens=x['tokens'],baselineTokens=base['tokens'] if base else None,status=x['status'],file=str(p)))
base='7c7b27cf68a752bebe5dcef12a159d6a61fd5f38';old=subprocess.check_output(['git','ls-tree','-r','--name-only',base,'src/lib/omega'],text=True).splitlines();assert subprocess.check_output(['git','diff',base,'--',*old])==b''
for x in load(r/'heldout-sources.json'):assert hashlib.sha256(Path(x['file']).read_bytes()).hexdigest()==x['sha256']
screen=load(r/'screen.json');summary=dict(accepted=False,productionUnchanged=True,frontier=front,unitChecks=screen['checks'],sources=len(screen['rows']),eligibleSources=sum(bool(x.get('plans')) for x in screen['rows']),rawWins=[x['path'] for x in screen['rows'] if any(p['tokens']<x['raw'] for p in x.get('plans',[]))],paid=paid,ineligible=ineligible,paidWins=[x for x in paid if x['baselineTokens'] is not None and x['tokens']<x['baselineTokens']],processCounts=dict(collections.Counter(p['status'] for p in processes)),frequencyProcessCounts=dict(collections.Counter(p['status'] for p in processes if p['job']['kind']=='frequency')),rawParent=load(r/'raw-parent-process.json'),extendedFrequency=load(r/'extended-frequency-process.json'),independent=load(r/'independent.json'),speed=load(r/'runtime-summary.json'),native=load(root/'native/manifest.json'),remaining=['No demonstrated varied-source significant paid gain','Native behavior NOT_RUN','All-plan exact pricing incomplete when processes time out','No exhaustive all-codec semantic novelty or all-labs proof audit'])
summary['psEfFollowup']=load(r/'ps-ef-processes.json');assert len(summary['psEfFollowup'])==5
ps=[p for p in paid if p['kind']=='frequency' and p['path']=='bench/holdout-x42/ps-ef.txt'];assert {(p['n'],p['order']) for p in ps}=={(n,o) for n in [32,128,512] for o in ['increasing','decreasing']};assert all(p['status']=='exact' and p['baselineTokens']==296 for p in ps);summary['psEfTournamentComplete']=True
summary['allAttemptCounts']=dict(collections.Counter(p['status'] for p in processes+[summary['rawParent'],summary['extendedFrequency']]+summary['psEfFollowup']));summary['totalAttempts']=44
(r/'summary.json').write_text(json.dumps(summary,indent=2))
(r/'frontier-provenance.json').write_text(json.dumps(dict(base=base,replay=str(r/'frontier.jsonl'),sha256=hashlib.sha256((r/'frontier.jsonl').read_bytes()).hexdigest(),scope='One actually completed fresh X179 replay; source comparisons and bounded independent reader coverage are separate.',existingModuleSha256={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in old}),indent=2))
files=[Path('src/lib/omega/klados.ts'),Path('docs/codecs.md'),Path('docs/codec-abbreviations.md')]+[p for p in root.rglob('*') if p.is_file() and (p.suffix!='.mjs' or p.name.endswith('-build.mjs')) and p.name not in ['hashes.json','validation.log','summary.log']]
(r/'hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},indent=2))
print(json.dumps({k:summary[k] for k in ['accepted','frontier','unitChecks','eligibleSources','paid','processCounts','frequencyProcessCounts']},indent=2))
