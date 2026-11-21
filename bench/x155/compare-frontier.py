"""Join the actual completed fresh workers; compare with X154 source and wire."""
import json, hashlib
from pathlib import Path
old=[json.loads(x) for x in Path('bench/x154/receipts/frontier.jsonl').read_text().splitlines()]
new=[]
for name in ('frontierA.jsonl','frontierB.jsonl'):
    new.extend(json.loads(x) for x in Path('bench/x155/receipts',name).read_text().splitlines())
if len(old)!=29 or len(new)!=29: raise AssertionError((len(old),len(new)))
prior={r['path']:r for r in old}; fresh={r['path']:r for r in new}
if len(prior)!=29 or len(fresh)!=29 or set(prior)!=set(fresh): raise AssertionError('wrong paths')
rows=[]
for prev in old:
    now=fresh[prev['path']]; source=Path(prev['path']).read_bytes()
    if now['text'].encode()!=source or now['decoded'].encode()!=source:raise AssertionError(prev['path'])
    rows.append({'path':prev['path'],'oldTokens':prev['tokens'],'newTokens':now['tokens'],
                 'messageIdentical':prev['message']==now['message'],
                 'sourceSha256':hashlib.sha256(source).hexdigest(),
                 'wireSha256':hashlib.sha256(now['message'].encode()).hexdigest()})
Path('bench/x155/receipts/frontier.jsonl').write_text(''.join(json.dumps(fresh[r['path']],ensure_ascii=True)+'\n' for r in old))
summary={'lanes':len(rows),'oldTotal':sum(r['oldTokens'] for r in rows),'newTotal':sum(r['newTokens'] for r in rows),
         'identicalWires':sum(r['messageIdentical'] for r in rows),'different':[r for r in rows if not r['messageIdentical']],
         'sourceReadEqual':len(rows),'note':'decoded field is parent self-report, not an independent wire parser'}
Path('bench/x155/receipts/frontier-compare.json').write_text(json.dumps({'summary':summary,'rows':rows},indent=2))
print(json.dumps(summary,indent=2))
