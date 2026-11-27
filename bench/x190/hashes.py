import hashlib,json,subprocess,sys
from pathlib import Path
p=Path('bench/x190/receipts/hashes.json')
if '--verify' in sys.argv:
 data=json.loads(p.read_text())
 for file,h in data.items():assert hashlib.sha256(Path(file).read_bytes()).hexdigest()==h,file
 print('verified',len(data));raise SystemExit
files=[Path(x) for x in subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],text=True).splitlines() if x.startswith('bench/x190/') or x in ['src/lib/omega/dipigi.ts','docs/codecs.md','docs/codec-abbreviations.md']]
data={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files) if f!=p and f.is_file()}
p.write_text(json.dumps(data,indent=2)+'\n');print('hashed',len(data))
