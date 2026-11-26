import json,hashlib
from pathlib import Path
root=Path('bench/x186');out=root/'native';out.mkdir(exist_ok=True);rows=[]
for i in [0,1,2,3,4,5,6]:
 x=json.loads((root/f'receipts/paid-{i:02}.json').read_text());p=out/f'prompt-{i:02}.txt';p.write_text(x['message']);rows.append(dict(prompt=str(p),source=x['path'],expectedSha256=hashlib.sha256(Path(x['path']).read_bytes()).hexdigest(),status='NOT_RUN',protocol='New basic single user chat, no tools/skills/system additions or source access. Save exact response bytes; compare against source hash. Record model/version/configuration.'))
(out/'manifest.json').write_text(json.dumps(rows,indent=2))
