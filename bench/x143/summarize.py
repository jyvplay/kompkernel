import pathlib,json,statistics
p=pathlib.Path(__file__).resolve().parent/'receipts'
def rows(n):return [json.loads(l)for l in (p/(n+'.jsonl')).read_text().splitlines()]
a=rows('frontier');b=[json.loads(l)for l in (p.parents[1]/'x142/receipts/frontier.jsonl').read_text().splitlines()]
assert len(a)==len(b)==29
assert all(x['path']==y['path']and x['message']==y['message']for x,y in zip(a,b))
s={'frontier':{'lanes':29,'tokens':sum(x['tokens']for x in a),'ms':sum(x['ms']for x in a),'identicalToX142':True}}
for n in ['probe','parent','heldout-probe','heldout-parent']:
 r=[x for x in rows(n)if 'B'in x];s[n]={'priced':len(r),'wins':sum(x['B']<x['A']for x in r),'bestDelta':min((x['B']-x['A']for x in r),default=None)}
for n in ['unit','coldread','independent-frontier','final-gate','tail-unit','repair-gate','encoding-audit']:
 s[n]=json.loads((p/(n+'.json')).read_text());s[n].pop('rows',None)
r=rows('speed');assert len(r)==24;out=[]
for path in dict.fromkeys(x['path']for x in r):
 arms={a:[x['ms']for x in r if x['path']==path and x['arm']==a]for a in ['A','B']};assert all(len(v)==4 for v in arms.values())
 out.append({'path':path,**arms,'BoverATotal':sum(arms['B'])/sum(arms['A']),'BoverAMedian':statistics.median(arms['B'])/statistics.median(arms['A'])})
speed={'measurements':24,'isolated':True,'sourceExact':all(x['sourceExact']for x in r),'messageIdentical':all(x['messageIdentical']for x in r),'rows':out,'productionHookInstalled':False}
(p/'speed-summary.json').write_text(json.dumps(speed,indent=2)+'\n');s['speed']=speed
s.update(nativeVerified=False,codecParetoVerified=False,mergeReady=False)
(p/'summary.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
