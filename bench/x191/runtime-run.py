import subprocess,json,time,os,signal,sys
from pathlib import Path
pids=list(map(int,sys.argv[1:]));rows=[]
lanes=['bench/holdout-work/kb-article.txt','bench/holdout/json-pkg.txt','bench/holdout-x41/ps-real.txt','bench/holdout-work/email-thread.txt','bench/holdout-work/unified-diff.patch','bench/holdout-x41/node-help.txt']
paused=[]
resume=[]
for p in pids:
 command=Path(f'/proc/{p}/cmdline').read_bytes().split(b'\0')
 assert command[0].split(b'/')[-1]==b'node', ('must pause actual node, not shell',p,command)
for p in pids:
 if Path(f'/proc/{p}/stat').read_text().split()[2]!='T':resume.append(p)
 os.kill(p,signal.SIGSTOP)
 for _ in range(100):
  state=Path(f'/proc/{p}/stat').read_text().split()[2]
  if state=='T':break
  time.sleep(.01)
 assert state=='T'
 paused.append(dict(pid=p,command=Path(f'/proc/{p}/cmdline').read_bytes().replace(b'\0',b' ').decode(),state=state))
Path('bench/x191/receipts/paused-'+('C' if 'runtime-C' in __file__ else 'B')+'.json').write_text(json.dumps(paused,indent=2))
try:
 for lane in lanes:
  for arm in 'ABBA':
   start=time.monotonic();r=subprocess.run(['node','--max-old-space-size=900',f'bench/x191/speed-{arm}.mjs',lane],capture_output=True,text=True)
   row=dict(arm=arm,path=lane,wallMs=1000*(time.monotonic()-start),exit=r.returncode,stderr=r.stderr)
   if r.returncode==0:row.update(json.loads(r.stdout.strip().splitlines()[-1]))
   rows.append(row);Path('bench/x191/receipts/runtime.json').write_text(json.dumps(rows,indent=2));print(lane,arm,r.returncode,row.get('cpuMs'),flush=True)
finally:
 for p in resume:
  try:os.kill(p,signal.SIGCONT)
  except ProcessLookupError:pass
assert all(r['exit']==0 for r in rows)
for lane in lanes:assert len({r['hash'] for r in rows if r['path']==lane})==1
summary={k:sum(r[k] for r in rows if r['arm']=='B')/sum(r[k] for r in rows if r['arm']=='A') for k in ['cpuMs','wallMs']}
summary['laneRatios']={lane:{k:sum(r[k] for r in rows if r['arm']=='B' and r['path']==lane)/sum(r[k] for r in rows if r['arm']=='A' and r['path']==lane) for k in ['cpuMs','wallMs']} for lane in lanes}
summary['accepted']=all(summary[k]<=.9 for k in ['cpuMs','wallMs']) and all(v<=1 for r in summary['laneRatios'].values() for v in r.values());summary['identicalWires']=len(rows)
Path('bench/x191/receipts/runtime-summary.json').write_text(json.dumps(summary,indent=2));print(summary)
