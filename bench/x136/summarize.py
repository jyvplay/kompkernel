import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2];p=root/'bench/x136/receipts'
def rows(name):return [json.loads(l)for l in (p/name).read_text().splitlines()if l.startswith('{')]
a=rows('frontier.jsonl');b=rows('patched-frontier.jsonl');assert len(a)==len(b)==29
old={r['path']:r for r in rows('../../x135/receipts/frontier.jsonl')}
A={r['path']:r for r in a}
layout=rows('default-layout.jsonl');cold=json.loads((p/'coldread.json').read_text());verified={r['path']for r in cold['defaultRows']if r['sourceExact']}
accepted={r['path']:r for r in layout if r['admitted']and r['path']in verified}
candidate=[]
for r in b:
 q=dict(r)
 if r['path']in accepted:
  c=accepted[r['path']];q.update(message=c['message'],tokens=c['B'],notes='X136 frozen verified candidate; NOT a wired stack run',ms=None)
 candidate.append(q)
(p/'candidate-frontier.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in candidate))
if accepted:
 win=next(iter(accepted.values()));(p/'candidate-message.txt').write_text(win['message'])
 (p/'native-trial.json').write_text(json.dumps({'status':'NOT RUN','path':win['path'],'sourceSHA256':hashlib.sha256((root/win['path']).read_bytes()).hexdigest(),'messageSHA256':hashlib.sha256(win['message'].encode()).hexdigest(),'requirement':'Single bare chat input; raw byte-exact output; no tools/skills/system help; independent unseen-source evaluator.'},indent=2)+'\n')
controls=rows('controls.jsonl');heap=json.loads((p/'bpe-heap.json').read_text());scan=json.loads((p/'bpe-scan.json').read_text())
s={'freshBaseline':{'lanes':29,'tokens':sum(r['tokens']for r in a),'ms':sum(r['ms']for r in a),'sameX135Messages':sum(r['message']==old[r['path']]['message']for r in a)},'patchedBaseline':{'lanes':29,'tokens':sum(r['tokens']for r in b),'ms':sum(r['ms']for r in b),'sameFreshMessages':sum(r['message']==A[r['path']]['message']for r in b),'inheritedBad':sum(r['decoded']!=r['text']for r in b)},'frozenCandidateTokens':sum(r['tokens']for r in candidate),'acceptedTokenCandidates':[{k:v for k,v in r.items()if k not in('message','folded')}for r in accepted.values()],'layoutTrials':[{k:v for k,v in r.items()if k not in('message','folded')}for r in layout],'ablation':[{k:v for k,v in r.items()if k!='message'}for r in rows('ablation.jsonl')],'controls':{'brotliTokens':sum(r['brotliTokens']for r in controls),'copyTokens':sum(r['copyTokens']for r in controls),'lanes':len(controls)},'counter':{'oldFailures':sum(not r['exact']for r in json.loads((p/'long-before.json').read_text())),'boundaryTests':20,'newDifferentialChecks':heap['checks'],'scanOverHeapTime':scan['fastMs']/heap['fastMs'],'scope':'constructed counter workloads, concurrent sandbox activity; NOT whole-stack speedup'},'unit':json.loads((p/'unit.json').read_text()),'nativeModelVerified':False,'paretoDominanceEstablished':False,'timingCaveat':'Two full runs are not a controlled paired benchmark; patched run overlapped short layout/ablation jobs and tests.'}
s['endToEnd']=[{k:v for k,v in r.items()if k!='message'}for r in rows('endtoend.jsonl')]
(p/'summary.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
