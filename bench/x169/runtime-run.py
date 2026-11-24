import subprocess,json,time,os,signal,sys
from pathlib import Path
pids=list(map(int,sys.argv[1:]));rows=[]
lanes=['bench/holdout-work/kb-article.txt','bench/holdout/json-pkg.txt','bench/holdout-x41/ps-real.txt']
for p in pids:os.kill(p,signal.SIGSTOP)
try:
 for lane in lanes:
  for arm in 'ADDA':
   start=time.monotonic();r=subprocess.run(['node','--max-old-space-size=900',f'bench/x169/speed-{arm}.mjs',lane],capture_output=True,text=True)
   row=dict(arm=arm,path=lane,wallMs=1000*(time.monotonic()-start),exit=r.returncode,stderr=r.stderr)
   if r.returncode==0:row.update(json.loads(r.stdout.strip().splitlines()[-1]))
   rows.append(row);Path('bench/x169/receipts/runtime.json').write_text(json.dumps(rows,indent=2));print(lane,arm,r.returncode,row.get('cpuMs'),flush=True)
finally:
 for p in pids:
  try:os.kill(p,signal.SIGCONT)
  except ProcessLookupError:pass
assert all(r['exit']==0 for r in rows)
for lane in lanes:assert len({r['hash'] for r in rows if r['path']==lane})==1
summary={k:sum(r[k] for r in rows if r['arm']=='D')/sum(r[k] for r in rows if r['arm']=='A') for k in ['cpuMs','wallMs']}
summary['laneRatios']={lane:{k:sum(r[k] for r in rows if r['arm']=='D' and r['path']==lane)/sum(r[k] for r in rows if r['arm']=='A' and r['path']==lane) for k in ['cpuMs','wallMs']} for lane in lanes}
summary['accepted']=all(summary[k]<=.9 for k in ['cpuMs','wallMs']) and all(v<=1 for r in summary['laneRatios'].values() for v in r.values());summary['identicalWires']=len(rows)
Path('bench/x169/receipts/runtime-summary.json').write_text(json.dumps(summary,indent=2));print(summary)
