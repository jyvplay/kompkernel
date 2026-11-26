import json,hashlib
from pathlib import Path
r=Path('bench/x189/receipts')
def lines(p):return [json.loads(s) for s in Path(p).read_text().splitlines()]
front=lines(r/'frontier.jsonl');old={x['path']:x for x in lines('bench/x188/receipts/frontier.jsonl')}
assert len(front)==29 and len({x['path'] for x in front})==29
for x in front:
 assert x['message']==old[x['path']]['message'] and x['tokens']==old[x['path']]['tokens'],x['path']
 assert x['decoded'].encode()==Path(x['path']).read_bytes()
rows=lines(r/'trials.jsonl');ranking=lines(r/'ranking.jsonl');assert len(rows)==174 and len(ranking)==116
wins=[{k:x.get(k) for k in ['path','family','ranking','parentTokens','tokens','winner']} for x in rows+ranking if x.get('tokens',x['parentTokens'])<x['parentTokens']]
by={}
for x in front:
 trials=[t for t in rows+ranking if t['path']==x['path'] and t['status']=='exact']
 best=min(trials,key=lambda t:t['tokens']) if trials else None
 by[x['path']]=dict(parent=x['tokens'],best=best['tokens'] if best else x['tokens'],status='exact' if best else 'unsupported',family=best['family'] if best else None)
summary=dict(frontier=dict(identicalWires=29,tokens=sum(x['tokens'] for x in front)),cells=len(rows)+len(ranking),sourceExactCells=sum(x['status']=='exact' for x in rows+ranking),unsupportedCells=sum(x['status']=='unsupported' for x in rows+ranking),probes=sum(x.get('probes',0) for x in rows+ranking),wins=wins,barrierWins=[x for x in wins if x['winner']['barrier']],bestByLane=by,broadAccepted=False,native='NOT_RUN',novelty='NOT_ESTABLISHED',speed=json.loads((r/'runtime-summary.json').read_text()))
(r/'summary.json').write_text(json.dumps(summary,indent=2))
census=json.loads((r/'parent-census.json').read_text());groups={}
for x in census['rows']:
 name=Path(x['path']).name;category='PROSE' if name in ['email-thread.txt','kb-article.txt','llm-answer.md'] else 'CODE/STRUCT' if name in ['code-ts.txt','json-pkg.txt','unified-diff.patch'] else 'OTHER' if name=='cue-sheet.md' else 'OPS/TABULAR'
 row={k:x[k] for k in ['path','raw','tokens']};row.update(saved=x['raw']-x['tokens'],savedPercent=100*(x['raw']-x['tokens'])/x['raw']);groups.setdefault(category,[]).append(row)
leaders={k:dict(lanes=len(xs),raw=sum(x['raw'] for x in xs),tokens=sum(x['tokens'] for x in xs),absolute=max(xs,key=lambda x:x['saved']),relative=max(xs,key=lambda x:x['savedPercent']),rows=xs) for k,xs in groups.items()}
(r/'leaders.json').write_text(json.dumps(leaders,indent=2))
native=Path('bench/x189/native');native.mkdir(exist_ok=True)
for path in {x['path'] for x in wins}:
 best=min((x for x in rows+ranking if x['path']==path and x['status']=='exact'),key=lambda x:x['tokens'])
 (native/(Path(path).stem+'.txt')).write_text(best['message'])
(native/'status.json').write_text(json.dumps(dict(status='NOT_RUN',note='Complete messages; not a separate-model behavioral test.'),indent=2))
print(json.dumps({k:v for k,v in summary.items() if k not in ['bestByLane','wins']},indent=2));print('wins',wins)
