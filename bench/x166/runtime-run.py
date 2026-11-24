"""Cold ABBA full-stack experiment. Pause the named concurrent replay while timing."""
import subprocess,json,time,os,signal,sys
from pathlib import Path
pid=int(sys.argv[1]); rows=[]
lanes=['bench/holdout-work/kb-article.txt','bench/holdout/code-ts.txt','bench/holdout-x41/ps-aux-real.txt']
for lane in lanes:assert Path(lane).is_file(),lane
# Optional repair mode preserves successful unaffected arms; never treats ENOENT as timing.
if '--repair-prose' in sys.argv:
 rows=[r for r in json.loads(Path('bench/x166/receipts/runtime-initial.json').read_text()) if r['exit']==0]
 assert len(rows)==8 and {r['path'] for r in rows}==set(lanes[1:])
run_lanes=lanes[:1] if rows else lanes
os.kill(pid,signal.SIGSTOP)
try:
 for lane in run_lanes:
  for arm in 'ABBA':
   start=time.monotonic();r=subprocess.run(['node','--max-old-space-size=1200',f'bench/x166/speed-{arm}.mjs',lane],capture_output=True,text=True)
   row={'arm':arm,'path':lane,'wallMs':1000*(time.monotonic()-start),'exit':r.returncode,'stderr':r.stderr}
   if r.returncode==0:row.update(json.loads(r.stdout.strip().splitlines()[-1]))
   rows.append(row);Path('bench/x166/receipts/runtime.json').write_text(json.dumps(rows,indent=2));print(lane,arm,r.returncode,row.get('cpuMs'),flush=True)
finally:
 try:os.kill(pid,signal.SIGCONT)
 except ProcessLookupError:pass
if any(r['exit'] for r in rows):raise SystemExit('incomplete runtime test')
for lane in lanes:
 r=[r for r in rows if r['path']==lane];assert len({x['hash'] for x in r})==1
summary={k:sum(r[k] for r in rows if r['arm']=='B')/sum(r[k] for r in rows if r['arm']=='A') for k in ['cpuMs','wallMs']}
summary['laneRatios']={lane:{k:sum(r[k] for r in rows if r['arm']=='B' and r['path']==lane)/sum(r[k] for r in rows if r['arm']=='A' and r['path']==lane) for k in ['cpuMs','wallMs']} for lane in lanes}
summary['accepted']=all(summary[k]<=.9 for k in ['cpuMs','wallMs']) and all(v<=1 for r in summary['laneRatios'].values() for v in r.values())
summary['identicalWires']=len(rows);Path('bench/x166/receipts/runtime-summary.json').write_text(json.dumps(summary,indent=2));print(summary)
