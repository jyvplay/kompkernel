"""Fresh post-repair wires, never inferred from pre-repair receipts."""
import json, hashlib
from pathlib import Path
root=Path('bench/x151/receipts')
old=[json.loads(l) for l in (root/'frontier.jsonl').read_text().splitlines()]
new=[json.loads(l) for n in ('repairedA.jsonl','repairedB.jsonl') for l in (root/n).read_text().splitlines()]
assert len(old)==len(new)==29,(len(old),len(new))
a={r['path']:r for r in old};b={r['path']:r for r in new}
assert len(a)==len(b)==29 and a.keys()==b.keys()
for path,r in b.items():
 source=Path(path).read_bytes()
 assert r['text'].encode()==r['decoded'].encode()==source,path
 assert r['tokens']==a[path]['tokens'] and r['message']==a[path]['message'],path
summary={'lanes':29,'identicalWires':29,'tokens':sum(r['tokens'] for r in new),'sourceMatched':29,'note':'exact wire identity inherits prior wire-reader coverage, not native-chat verification; timings not controlled speed evidence'}
(root/'repaired-compare.json').write_text(json.dumps(summary,indent=2)+'\n')
for name in ['generation-boundary-after.json','capacity-boundary-after.json']:
 r=json.loads((root/name).read_text()); assert r.get('afterMaxMatches',r.get('matches')) is True,name
print(json.dumps(summary))
