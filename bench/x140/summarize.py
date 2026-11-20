import pathlib,json,statistics,hashlib
root=pathlib.Path(__file__).resolve().parents[2];p=root/'bench/x140/receipts'
def rows(name):return [json.loads(l)for l in (p/(name+'.jsonl')).read_text().splitlines()]
f=rows('frontier');assert len(f)==29
old={r['path']:r for r in map(json.loads,(root/'bench/x139/receipts/frontier.jsonl').read_text().splitlines())}
for r in f:
 assert r['message']==old[r['path']]['message']
 assert r['decoded'].encode()==(root/r['path']).read_bytes()
probe=[r for r in rows('probe')if 'B'in r];held=rows('heldout-probe');joint=rows('joint')+rows('heldout-joint');interior=rows('interior');pre=rows('precondition')+rows('heldout-precondition');speed=rows('speed');assert len(speed)==16
sp=[]
for path in sorted(set(r['path']for r in speed)):
 a=[r['ms']for r in speed if r['path']==path and r['arm']=='A'];b=[r['ms']for r in speed if r['path']==path and r['arm']=='B']
 sp.append({'path':path,'samplesPerArm':len(a),'aMedianMs':statistics.median(a),'bMedianMs':statistics.median(b),'totalRatioBoverA':sum(b)/sum(a),'medianRatioBoverA':statistics.median(b)/statistics.median(a)})
s={'frontier':{'lanes':29,'tokens':sum(r['tokens']for r in f),'ms':sum(r['ms']for r in f),'messagesIdenticalToX139':29,'timingConcurrentNotCausal':True},'eikon':{'canonicalPriced':len(probe),'heldoutPriced':len(held),'canonicalWins':sum(r['B']<r['A']for r in probe),'canonicalDelta':sum(r['B']-r['A']for r in probe),'acceptedMoves':sum(r['moves']for r in probe+held),'images':sum(r['images']for r in probe+held)},'joint':{'trials':len(joint),'imageWins':sum(r['imageTokens']<r['A']for r in joint),'ordinaryWins':sum(r['ordinaryTokens']<r['A']for r in joint),'images':sum(r['images']for r in joint)},'interior':{'trials':len(interior),'wins':sum(r['B']<r['A']for r in interior),'moves':sum(r['moves']for r in interior)},'sourcePreconditioning':{'fullParentTrials':len(pre),'wins':sum(r['B']<r['A']for r in pre),'independentExact':sum(r['independent']for r in pre)},'speed':sp,'nativeVerified':False,'paretoAccepted':False,'defaultCodecWired':False,'speedHookRetainedInProduction':False,'mergeAllowed':False}
(p/'summary.json').write_text(json.dumps(s,indent=2));print(json.dumps(s,indent=2))
(p/'native-trial.json').write_text(json.dumps({'status':'NOT RUN','reason':'No blind model endpoint used; no EIKON real-source price winner. Program/source-aware reconstruction does not meet native gate.'},indent=2))
files=[]
for f in sorted((root/'src/lib/omega').glob('*.ts')):files.append({'file':str(f.relative_to(root)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(p/'source-manifest.json').write_text(json.dumps({'scope':'all top-level omega TS at final report; hashes are not semantic novelty proof','count':len(files),'files':files},indent=2))
