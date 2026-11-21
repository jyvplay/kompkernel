"""Isolated cold-process whole-encoder ABBA test. Run only after other jobs exit.
Predeclared gate: exact wires in every call, >=10% lower aggregate process wall
AND encoder CPU, and no per-lane regression in either metric. Passing would still
require full-frontier candidate regression before production adoption.
"""
import subprocess,time,json
from pathlib import Path
lanes=['bench/holdout-work/kb-article.txt','bench/holdout-x41/ps-real.txt','bench/holdout/json-pkg.txt'];rows=[]
p=Path('bench/x161/receipts/cache-speed.jsonl');p.write_text('')
for lane in lanes:
 for arm in 'ABBA':
  start=time.monotonic();r=subprocess.run(['node',f'bench/x161/cache-{arm}.mjs',lane],capture_output=True,text=True,check=True)
  row=json.loads(r.stdout);row.update(arm=arm,processWallMs=(time.monotonic()-start)*1000);rows.append(row)
  with p.open('a') as f:f.write(json.dumps(row)+'\n')
summary=[]
for lane in lanes:
 group=[r for r in rows if r['path']==lane];assert len({r['hash'] for r in group})==1
 a=[r for r in group if r['arm']=='A'];b=[r for r in group if r['arm']=='B']
 summary.append({'path':lane,'cpuRatio':sum(r['cpuMs'] for r in b)/sum(r['cpuMs'] for r in a),'wallRatio':sum(r['processWallMs'] for r in b)/sum(r['processWallMs'] for r in a),'identicalWires':4})
a=[r for r in rows if r['arm']=='A'];b=[r for r in rows if r['arm']=='B']
cpu=sum(r['cpuMs'] for r in b)/sum(r['cpuMs'] for r in a);wall=sum(r['processWallMs'] for r in b)/sum(r['processWallMs'] for r in a)
result={'lanes':summary,'aggregateCpuRatio':cpu,'aggregateWallRatio':wall,'gatePassed':cpu<=.9 and wall<=.9 and all(r['cpuRatio']<=1 and r['wallRatio']<=1 for r in summary),'scope':'12 cold-process whole-encoder calls, 3 fixed lanes, ABBA; not a universal speed theorem'}
Path('bench/x161/receipts/cache-speed-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
