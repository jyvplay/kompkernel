import json,hashlib,collections,importlib.util,subprocess
from pathlib import Path
root=Path('bench/x184');r=root/'receipts'
def load(p):return json.loads(Path(p).read_text())
def lines(p):return [json.loads(s) for s in Path(p).read_text().splitlines()]
a={x['path']:x for x in lines('bench/x183/receipts/frontier.jsonl')};b={x['path']:x for x in lines(r/'frontier.jsonl')};assert len(a)==len(b)==29 and a.keys()==b.keys()
assert all(x['text'].encode()==Path(p).read_bytes() and x['decoded'].encode()==Path(p).read_bytes() for p,x in b.items())
front=dict(lanes=29,oldTokens=sum(x['tokens'] for x in a.values()),tokens=sum(x['tokens'] for x in b.values()),identical=sum(a[p]['message']==b[p]['message'] for p in a),different=[p for p in a if a[p]['message']!=b[p]['message']])
spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader);reads=[]
for p,x in b.items():
 try:s=reader.parent_read(x['message'])
 except ValueError as e:reads.append(dict(path=p,status='unsupported',error=str(e)));continue
 assert s.encode()==Path(p).read_bytes();reads.append(dict(path=p,status='exact'))
front['pythonReaders']=dict(collections.Counter(x['status'] for x in reads));(r/'python-frontier.json').write_text(json.dumps(reads,indent=2))
screen=load(r/'screen.json');raw={x['path']:x['raw'] for x in screen['rows']};groups={}
for p,x in b.items():
 name=Path(p).name;cat='PROSE' if name in ['email-thread.txt','kb-article.txt','llm-answer.md'] else 'CODE/STRUCT' if name in ['code-ts.txt','json-pkg.txt','unified-diff.patch'] else 'OTHER' if name=='cue-sheet.md' else 'OPS/TABULAR'
 groups.setdefault(cat,[]).append(dict(path=p,raw=raw[p],tokens=x['tokens'],saved=raw[p]-x['tokens'],savedPercent=100*(raw[p]-x['tokens'])/raw[p]))
leaders={cat:dict(lanes=len(rs),aggregateRaw=sum(x['raw'] for x in rs),aggregateTokens=sum(x['tokens'] for x in rs),largestAbsoluteSaving=max(rs,key=lambda x:x['saved']),largestRelativeSaving=max(rs,key=lambda x:x['savedPercent']),rows=rs) for cat,rs in groups.items()};(r/'leaders.json').write_text(json.dumps(leaders,indent=2))
paid=[]
for f in sorted(r.glob('paid-[0-9][0-9].json')):
 x=load(f);entry=dict(file=str(f),path=x['path'],family=x['family'],status=x['status'])
 if 'tokens' in x:entry.update(tokens=x['tokens'],baseline=b.get(x['path'],{}).get('tokens'),parentTokens=x['parentTokens'],keyMarginal=x['keyMarginal'])
 paid.append(entry)
for x in load(r/'heldout-sources.json'):assert hashlib.sha256(Path(x['file']).read_bytes()).hexdigest()==x['sha256']
summary=dict(accepted=False,productionUnchanged=True,frontier=front,tsReaders=load(r/'readers.json'),unitChecks=screen['checks'],sources=len(raw),families=len({x['family'] for x in screen['rows']}),rawWins=[dict(path=x['path'],family=x['family']) for x in screen['rows'] if any(p['tokens']<x['raw'] for p in x['plans'])],paid=paid,paidWins=[x for x in paid if x.get('baseline') is not None and x['tokens']<x['baseline']],processCounts=dict(collections.Counter(x['status'] for x in load(r/'paid-processes.json'))),independent=load(r/'independent.json'),adversary=load(r/'adversary.json'),speed=load(r/'runtime-summary.json'),native='NOT_RUN',allStackNovelty='NOT_ESTABLISHED')
summary['shapeAblation']=[dict(path=x['path'],tokens=x['tokens'],baseline=b[x['path']]['tokens'],validCodec=False) for x in [load(f) for f in sorted(r.glob('ablation-[0-9][0-9].json'))]]
assert len(load(r/'paid-processes.json'))==20
assert subprocess.check_output(['git','diff','4a9e1f727c82b1b6d4034bf0a477572c4fe0bc94','--','src/lib/omega',':!src/lib/omega/kartes.ts'])==b''
(r/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({k:v for k,v in summary.items() if k not in ['tsReaders','adversary']},indent=2))
