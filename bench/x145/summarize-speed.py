import json,pathlib
r=pathlib.Path(__file__).parent/'receipts';out=[]
for name in ['speed','speed-reverse']:
 a=[json.loads(l)for l in (r/(name+'.jsonl')).read_text().splitlines()];assert len(a)==12
 for p in dict.fromkeys(x['path']for x in a):
  g={arm:[x for x in a if x['path']==p and x['arm']==arm]for arm in ['A','B']};out.append({'schedule':name,'path':p,'BoverAWall':sum(x['ms']for x in g['B'])/sum(x['ms']for x in g['A']),'BoverACpu':sum(x['cpuMs']for x in g['B'])/sum(x['cpuMs']for x in g['A']),'A':g['A'][0]['tokens'],'B':g['B'][0]['tokens']})
s={'measurements':24,'order':'ABBA then fresh-process BAAB per lane; no confidence interval','isolated':True,'rows':out,'broadTenPercent':all(x['BoverAWall']<=.9 for x in out),'paretoTimingGate':all(x['BoverAWall']<=1 for x in out),'warning':'First-call/JIT/tokenizer cache bias; no search work eliminated by SCALAR. Require both schedule gates, not pooled apparent speedup.'};(r/'speed-summary.json').write_text(json.dumps(s,indent=2)+'\n')
