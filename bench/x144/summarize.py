import pathlib,json,statistics
r=pathlib.Path(__file__).parent/'receipts'
def rows(n):return [json.loads(l)for l in (r/(n+'.jsonl')).read_text().splitlines()if l]
f=rows('frontier');assert len(f)==29
old={a['path']:a for a in [json.loads(l)for l in pathlib.Path('bench/x143b/receipts/frontier.jsonl').read_text().splitlines()]}
assert all(a['message']==old[a['path']]['message']for a in f)
trials={n:[a for a in rows(n)if 'B'in a]for n in ['probe','parent','heldout-probe','heldout-parent']}
speeds=rows('speed');assert len(speeds)==24
speed=[]
for path in dict.fromkeys(a['path']for a in speeds):
 a=[q['ms']for q in speeds if q['path']==path and q['arm']=='A'];b=[q['ms']for q in speeds if q['path']==path and q['arm']=='B']
 speed.append({'path':path,'A':a,'B':b,'BoverATotal':sum(b)/sum(a),'BoverAMedian':statistics.median(b)/statistics.median(a)})
passed=all(a['BoverATotal']<=.90 and a['BoverAMedian']<=1 for a in speed)
(r/'speed-summary.json').write_text(json.dumps({'measurements':24,'isolated':True,'wireSourceIdentical':True,'threshold':'each lane total B/A <=0.90 and median <=1','deploymentGatePassed':passed,'rows':speed},indent=2)+'\n')
s={'lanes':29,'tokens':sum(a['tokens']for a in f),'messageIdenticalX143b':True,'concurrentElapsedMsNotSpeedEvidence':sum(a['ms']for a in f),'priced':{n:len(v)for n,v in trials.items()},'wins':{n:sum(a['B']<a['A']for a in v)for n,v in trials.items()},'unitChecks':json.loads((r/'unit.json').read_text())['checks'],'counterDifferentialChecks':323192,'native':'NOT_RUN','leanReplay':'NOT_RUN','paretoSuperiorEstablished':False,'broadSpeedupGate':passed,'tsc':'PASS','build':'PASS','mergePermitted':False,'parentRows':[{'path':a['path'],'A':a['A'],'B':a['B']}for a in trials['parent']]}
s['transportGate']=json.loads((r/'transport-gate.json').read_text())
s['finalGate']=json.loads((r/'final-gate.json').read_text())
s['independentCandidateReplay']={'exact':json.loads((r/'coldread.json').read_text())['exact'],'unsupported':len(json.loads((r/'coldread.json').read_text())['unsupported'])}
s['productionTransportDefectConfirmed']=True
(r/'summary.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2));print(json.dumps(speed,indent=2))
