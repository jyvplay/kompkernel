import pathlib,json,hashlib,statistics
p=pathlib.Path(__file__).resolve().parent/'receipts'
def rows(n):return [json.loads(l)for l in (p/(n+'.jsonl')).read_text().splitlines()]
a=rows('frontier');b=[json.loads(l)for l in (p.parents[1]/'x141/receipts/frontier.jsonl').read_text().splitlines()]
assert len(a)==len(b)==29
assert all(x['path']==y['path']and x['message']==y['message']for x,y in zip(a,b))
s={'frontier':{'lanes':len(a),'tokens':sum(x['tokens']for x in a),'ms':sum(x['ms']for x in a),'identicalToX141':True}}
for n in ['probe','parent','heldout-probe','heldout-parent']:
 r=[x for x in rows(n)if 'B'in x];s[n]={'priced':len(r),'wins':sum(x['B']<x['A']for x in r),'bestDelta':min((x['B']-x['A']for x in r),default=None)}
for n in ['unit','coldread','independent-frontier','final-gate']:
 s[n]=json.loads((p/(n+'.json')).read_text());s[n].pop('rows',None)
if (p/'speed.jsonl').exists():
 r=rows('speed');out=[]
 for path in dict.fromkeys(x['path']for x in r):
  arms={a:[x['ms']for x in r if x['path']==path and x['arm']==a]for a in ['A','B']}
  assert all(len(v)==4 for v in arms.values())
  out.append({'path':path,**arms,'BoverATotal':sum(arms['B'])/sum(arms['A']),'BoverAMedian':statistics.median(arms['B'])/statistics.median(arms['A'])})
 speed={'measurements':len(r),'isolated':True,'sourceExact':all(x['sourceExact']for x in r),'messageIdentical':all(x['messageIdentical']for x in r),'rows':out,'significantBroadSpeedupEstablished':False,'productionHookInstalled':False}
 (p/'speed-summary.json').write_text(json.dumps(speed,indent=2)+'\n');s['speed']=speed
s['apiGate']=json.loads((p/'api-gate.json').read_text())
s['typecheck']='PASS' if (p/'tsc.txt').exists() and not (p/'tsc.txt').read_text() else 'INSPECT'
s.update(nativeVerified=False,codecParetoVerified=False,mergeReady=False)
(p/'summary.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
