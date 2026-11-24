"""Lexical novelty triage across module inventory, not semantic originality proof."""
import re,json,hashlib
from pathlib import Path
terms=['necklace','Lyndon','rotation','conjugacy','cyclic','permutation','lifting','canonicalization']
rows=[]
for p in sorted(Path('src/lib/omega').glob('*.ts')):
 if p.name=='strofos.ts':continue
 b=p.read_bytes();s=b.decode();hits={t:[i+1 for i,l in enumerate(s.splitlines()) if re.search(t,l,re.I)][:15] for t in terms};hits={k:v for k,v in hits.items() if v}
 rows.append(dict(path=str(p),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),hits=hits))
# New source location check against tracked prior textual artifacts only.
import subprocess
base='bd0943724eaca663c2edd3323b317c2014774f68';fresh={}
for term in ['2401.14341','38940123','btae217','phd.martayan.org','2606.03570']:
 r=subprocess.run(['git','grep','-Il','-F',term,base,'--','docs','bench','src'],capture_output=True,text=True)
 assert r.returncode in [0,1],r.stderr
 fresh[term]=r.stdout.splitlines()
out=dict(modules=len(rows),rows=rows,priorReferences=fresh,scope='All module files lexically scanned, including original backups and catalog. Focused semantic inspection of adjacent mechanisms; not exhaustive human proof or universal novelty.');Path('bench/x175/receipts/inventory.json').write_text(json.dumps(out,indent=2));print({k:v for k,v in fresh.items()});print('modules',len(rows))
