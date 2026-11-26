import json,hashlib
from pathlib import Path
root=Path('bench/x188');r=root/'receipts'
rows=[json.loads(s) for s in (r/'frontier.jsonl').read_text().splitlines()]
old={x['path']:x for x in map(json.loads,Path('bench/x187/receipts/frontier.jsonl').read_text().splitlines())}
assert len(rows)==29
for x in rows:
 assert x['message']==old[x['path']]['message'] and x['tokens']==old[x['path']]['tokens']
 assert x['decoded'].encode()==Path(x['path']).read_bytes()
trial=json.loads((r/'trials.json').read_text())
wins=[dict(path=x['path'],before=x['parentTokens'],after=x['variants'][2]['tokens'],sourceExact=x['variants'][2]['sourceExact']) for x in trial['out'] if x['variants'][2].get('tokens',x['parentTokens'])<x['parentTokens']]
summary=dict(canonicalWiresIdentical=len(rows),canonicalTokens=sum(x['tokens'] for x in rows),wins=wins,sourceExactLanes=sum(x['variants'][2]['sourceExact'] is True for x in trial['out']),layerOnlyLanes=sum(x['variants'][2]['sourceExact'] is False for x in trial['out']),native='NOT_RUN',broadGainAccepted=False,allStackNoveltyEstablished=False)
(r/'summary.json').write_text(json.dumps(summary,indent=2));print(summary)
# Per-category suite-local extrema, never universal leaders.
census=json.loads((r/'parent-census.json').read_text());leaders={}
for x in census['rows']:
 name=Path(x['path']).name
 x['category']='PROSE' if name in ['email-thread.txt','kb-article.txt','llm-answer.md'] else 'CODE/STRUCT' if name in ['code-ts.txt','json-pkg.txt','unified-diff.patch'] else 'OTHER' if name=='cue-sheet.md' else 'OPS/TABULAR'
 g=leaders.setdefault(x['category'],{'absolute':x,'relative':x})
 if x['raw']-x['tokens']>g['absolute']['raw']-g['absolute']['tokens']:g['absolute']=x
 if x['tokens']/x['raw']<g['relative']['tokens']/g['relative']['raw']:g['relative']=x
(r/'leaders.json').write_text(json.dumps(leaders,indent=2))
# Native handoffs are complete messages, NOT executed evaluations.
native=root/'native';native.mkdir(exist_ok=True)
for w in wins:
 x=next(x for x in trial['out'] if x['path']==w['path']);(native/(Path(w['path']).stem+'.txt')).write_text(x['variants'][2]['message'])
(native/'status.json').write_text(json.dumps({'status':'NOT_RUN','reason':'No separate model evaluation endpoint used.','cases':wins},indent=2))
