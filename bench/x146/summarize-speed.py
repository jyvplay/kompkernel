import json,pathlib
r=pathlib.Path(__file__).parent/'receipts'
a=[json.loads(l)for l in (r/'speed.jsonl').read_text().split('\n')if l];out=[]
for p in dict.fromkeys(x['path']for x in a):
 for stage in ['ABBA','BAAB']:
  g={arm:[x for x in a if x['path']==p and x['arm']==arm and x['stage']==stage]for arm in ['A','B']};assert all(len(v)==2 for v in g.values());out.append({'path':p,'stage':stage,'BoverAWall':sum(x['ms']for x in g['B'])/sum(x['ms']for x in g['A']),'BoverACpu':sum(x['cpuMs']for x in g['B'])/sum(x['cpuMs']for x in g['A'])})
s={'calls':len(a),'measured':16,'warmups':4,'isolated':True,'rows':out,'significantTenPercentGate':all(x['BoverAWall']<=.9 for x in out),'noRegressionGate':all(x['BoverAWall']<=1 for x in out),'scope':'prolepsis config snapshot; NOT EKDYSIS runtime'};(r/'speed-summary.json').write_text(json.dumps(s,indent=2)+'\n')
a=[json.loads(l)for l in (r/'codec-speed.jsonl').read_text().split('\n')if l];g={k:[x for x in a if x['stage']=='ABBA'and x['arm']==k]for k in ['A','B']};assert all(len(v)==2 for v in g.values());s={'calls':len(a),'measured':4,'warmups':2,'isolated':True,'BoverAWall':sum(x['ms']for x in g['B'])/sum(x['ms']for x in g['A']),'BoverACpu':sum(x['cpuMs']for x in g['B'])/sum(x['cpuMs']for x in g['A']),'baselineTokens':1040,'ekdysisTokens':1024};(r/'codec-speed-summary.json').write_text(json.dumps(s,indent=2)+'\n')
