import subprocess,json
from pathlib import Path
root=Path('bench/x184/receipts');rows=[]
for i in ['00','01','02','03','04','06']:
 with (root/f'ablation-{i}.log').open('w') as f:
  try:r=subprocess.run(['node','--max-old-space-size=1000','bench/x184/shape-ablation.mjs',i],stdout=f,stderr=subprocess.STDOUT,timeout=90);status='completed' if r.returncode==0 else 'process-failed'
  except subprocess.TimeoutExpired:status='TIMEOUT'
 rows.append(dict(id=i,status=status));(root/'ablation-processes.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
