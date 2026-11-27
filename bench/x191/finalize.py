import json
from pathlib import Path
r=Path('bench/x191/receipts')
def lines(p):return [json.loads(s) for s in Path(p).read_text().splitlines()]
front=lines(r/'frontier.jsonl');old={x['path']:x for x in lines('bench/x190/receipts/frontier.jsonl')};assert len(front)==29
for x in front:
 assert x['message']==old[x['path']]['message'] and x['tokens']==old[x['path']]['tokens']
 assert x['decoded'].encode()==Path(x['path']).read_bytes()
base={x['path']:x['tokens'] for x in front};paid=[]
for f in sorted(r.glob('paid-[0-9][0-9].json')):
 x=json.loads(f.read_text());paid.append(dict(file=str(f),path=x['path'],mode=x['mode'],tokens=x['tokens'],parentTokens=base.get(x['path']),status=x['status'],branched=x['branched']))
summary=dict(frontier=dict(identicalWires=29,tokens=sum(base.values())),paid=paid,processes=json.loads((r/'paid-processes.json').read_text()),wins=[x for x in paid if x['status']=='exact' and x['parentTokens'] is not None and x['tokens']<x['parentTokens']],broadAccepted=False,native='NOT_RUN',novelty='NOT_ESTABLISHED',speed=json.loads((r/'runtime-summary.json').read_text()))
(r/'summary.json').write_text(json.dumps(summary,indent=2))
leaders=json.loads(Path('bench/x190/receipts/leaders.json').read_text())
for group in leaders.values():
 for row in group['rows']:assert base[row['path']]==row['tokens']
(r/'leaders.json').write_text(json.dumps(leaders,indent=2))
print(json.dumps(summary,indent=2))
