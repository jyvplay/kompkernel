"""Receipt-only report; run after the rotation process exits."""
import json
from pathlib import Path
p=Path(__file__).parent/'receipts'
def rows(name): return [json.loads(l) for l in (p/name).read_text().splitlines() if l.startswith('{')]
b=rows('frontier.jsonl'); a={r['path']:r for r in rows('../../x134/receipts/frontier.jsonl')}
r=rows('rotation.jsonl'); pk=rows('packages.log'); controls=json.loads((p/'controls.json').read_text()); audit=json.loads((p/'steli-audit.json').read_text())
s={'baseline':{'lanes':len(b),'tokens':sum(x['tokens'] for x in b),'wallMs':sum(x['ms'] for x in b),'inheritedBad':sum(x['decoded']!=x['text'] for x in b),'unchangedMessages':sum(x['message']==a[x['path']]['message'] for x in b)},'rotation':{'trials':len(r),'lanes':len(set(x['path'] for x in r)),'minDelta':min(x['delta'] for x in r),'maxDelta':max(x['delta'] for x in r),'gains':sum(x['delta']<0 for x in r),'wallMs':sum(x['ms'] for x in r),'independentExact':audit['rotationSourceExact']},'packages':{'lanes':len(pk),'probes':sum(x['probes'] for x in pk),'delta':sum(x['delta'] for x in pk),'wallMs':sum(x['ms'] for x in pk)},'independentBaseline':{'chiron':audit['chironOnly'],'chironSteli':audit['withSteli'],'total':audit['lanes']},'gzipControl':{'lanes':len(controls['entropy']),'tokens':sum(x['gzipMessageTokens'] for x in controls['entropy']),'machineExact':sum(x['machineExact'] for x in controls['entropy'])},'unit':json.loads((p/'unit.json').read_text()),'nativeLLMVerified':False,'paretoAdvanceEstablished':False}
(p/'summary.json').write_text(json.dumps(s,indent=2)+'\n')
print(json.dumps(s,indent=2))
