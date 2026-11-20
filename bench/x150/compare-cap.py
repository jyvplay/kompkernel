"""Check that the post-boundary-patch opt-in rerun ships the same wires."""
import json
from pathlib import Path
root=Path('bench/x150/receipts')
a=[json.loads(x) for x in (root/'frontier-repaired-polysteli.jsonl').read_text().splitlines()]
b=[json.loads(x) for x in (root/'frontier-after-cap.jsonl').read_text().splitlines()]
assert len(a)==len(b)==3
rows=[]
for old,new in zip(a,b):
    assert old['path']==new['path']
    assert Path(new['path']).read_bytes()==new['decoded'].encode('utf8')
    rows.append({'path':new['path'],'oldTokens':old['tokens'],'newTokens':new['tokens'],
                 'wireIdentical':old['message']==new['message'],'decodedFieldMatchesSource':True})
(root/'compare-cap.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(rows,indent=2))
