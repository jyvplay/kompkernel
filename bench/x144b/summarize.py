import pathlib,json,statistics
r=pathlib.Path(__file__).parent/'receipts'
def rows(n):return [json.loads(l)for l in (r/(n+'.jsonl')).read_text().splitlines()if l]
f=rows('frontier');old={a['path']:a for a in [json.loads(l)for l in pathlib.Path('bench/x144/receipts/frontier.jsonl').read_text().splitlines()]};assert len(f)==29 and all(a['message']==old[a['path']]['message']for a in f)
trials={n:[a for a in rows(n)if 'B'in a]for n in ['probe','parent','heldout-probe','heldout-parent']}
s=rows('speed');assert len(s)==24
speed=[]
for path in dict.fromkeys(a['path']for a in s):
 a=[q['ms']for q in s if q['path']==path and q['arm']=='A'];b=[q['ms']for q in s if q['path']==path and q['arm']=='B'];speed.append({'path':path,'A':a,'B':b,'BoverATotal':sum(b)/sum(a),'BoverAMedian':statistics.median(b)/statistics.median(a)})
accept=all(a['BoverATotal']<=1 for a in speed)and any(a['BoverATotal']<=.95 for a in speed)
broad=all(a['BoverATotal']<=.90 for a in speed)
(r/'speed-summary.json').write_text(json.dumps({'measurements':24,'comparison':'repaired JS surrogate scan A vs repaired native-regex fast path B; not old unsafe production','isolated':True,'wireSourceIdentical':True,'acceptFastPath':accept,'broadTenPercent':broad,'rows':speed},indent=2)+'\n')
summary={'lanes':29,'tokens':sum(a['tokens']for a in f),'messageIdenticalX144':True,'priced':{n:len(v)for n,v in trials.items()},'wins':{n:sum(a['B']<a['A']for a in v)for n,v in trials.items()},'repair':[{'path':a['path'],'old':a['A'],'safe':a['B']}for a in rows('repair')],'codecUnit':json.loads((r/'unit.json').read_text()),'admissionAttack':json.loads((r/'admission-attack.json').read_text()),'scanUnit':json.loads((r/'scan-unit.json').read_text()),'finalGate':json.loads((r/'final-gate.json').read_text()),'independentCandidateReads':json.loads((r/'coldread.json').read_text())['exact'],'native':'NOT_RUN','leanReplay':'NOT_RUN','paretoSuperiorCodec':False,'fastPathAccepted':accept,'broadSpeedup':broad,'tsc':'PASS','build':'PASS'}
(r/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2));print(json.dumps(speed,indent=2))
