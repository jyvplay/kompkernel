import json,pathlib,hashlib
p=pathlib.Path('bench/x139/receipts')
def rows(n):return [json.loads(l)for l in (p/(n+'.jsonl')).read_text().splitlines()]
f=rows('frontier');assert len(f)==29,'frontier incomplete'
old={r['path']:r for r in map(json.loads,pathlib.Path('bench/x138/receipts/frontier.jsonl').read_text().splitlines())}
assert all(r['message']==old[r['path']]['message'] for r in f)
assert all(r['decoded'].encode()==pathlib.Path(r['path']).read_bytes()for r in f)
probe=[r for r in rows('probe') if 'B'in r];held=[r for r in rows('heldout-apotome-repaired')if 'B'in r];joint=rows('joint-overlap')+rows('joint-heldout');control=rows('controls');delta=rows('delta')
summary={'frontier':{'lanes':29,'tokens':sum(r['tokens']for r in f),'ms':sum(r['ms']for r in f),'messagesIdenticalToX138':29},'apotome':{'canonicalPriced':len(probe),'heldoutPriced':len(held),'canonicalWins':sum(r['B']<r['A']for r in probe),'canonicalDelta':sum(r['B']-r['A']for r in probe),'acceptedSearchMoves':sum(r['moves']for r in probe+held),'probes':sum(r['probes']for r in probe+held),'decoderExceptions':sum(r['cycles']for r in probe+held)},'jointMining':{'trials':len(joint),'wins':sum(r.get('delta',0)<0 for r in joint),'batchSizes':[0,4,8,16]},'controls':{'brotliTokens':sum(r['brotliTokens']for r in control),'copyTokens':sum(r['copyTokens']for r in control),'standaloneDeltaTokens':sum(r['B']for r in delta)},'nativeVerified':False,'newDefaultWired':False,'paretoAccepted':False,'mergeAllowed':False}
(p/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
inv=json.loads((p/'novelty-inventory.json').read_text())
for r in inv['files']:r['sha256']=hashlib.sha256(pathlib.Path(r['file']).read_bytes()).hexdigest()
(p/'novelty-inventory.json').write_text(json.dumps(inv,indent=2))
(p/'native-trial.json').write_text(json.dumps({'status':'NOT RUN','reason':'No blind native-model endpoint available. Source-aware self-review and program inverses are not behavioral verification.','newCodecPriceGatePassed':False,'existingUnresolvedPackages':['bench/x136/receipts/native-trial.json','bench/x137/receipts/native-trial.json','bench/x138/receipts/native-trial.json']},indent=2))
