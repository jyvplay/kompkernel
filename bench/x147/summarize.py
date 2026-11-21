import json
from pathlib import Path
r=Path('bench/x147/receipts')
read=lambda n:json.loads((r/n).read_text())
f=read('final.json');i=read('integration.json');assert f['message']==i['message']
out={'codec':'HORION','frontier':read('frontier-gate.json'),'gain':{'source':'mwaskom/seaborn-data/geyser.csv','parent':f['parentTokens'],'candidate':f['tokens'],'tokens':f['gain'],'percent':100*f['gain']/f['parentTokens']},'unitAssertions':read('unit.json')['checks'],'compositeAssertions':read('composite-unit.json')['checks'],'compactAttacks':f['patchTargetedAttacks'],'integration':{'basePhaseMs':i['baseMs'],'totalMs':i['totalMs'],'totalOverBasePhase':i['totalMs']/i['baseMs'],'cpuMs':i['cpuUserMs']+i['cpuSystemMs'],'design':i['timingDesign']},'scalarViteTokens':read('scalar-confirm.jsonl')['tokens'],'initialBuild':read('build-status.json'),'finalBuild':read('build-retry-status.json'),'acceptance':read('gates.json')}
(r/'summary.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
