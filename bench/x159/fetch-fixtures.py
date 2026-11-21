"""Pinned real technical-outline excerpts; no synthetic edits or renumbering."""
import subprocess,json,base64,hashlib
from pathlib import Path
rows=[]
for repo,path,name in [('aws/s2n-tls','compliance/specs/www.rfc-editor.org/rfc/rfc8446.txt','tls13'),('aws/s2n-tls','compliance/specs/www.rfc-editor.org/rfc/rfc5246.txt','tls12'),('dorkitude/skimmer','evals/corpus/raw/rfc9110.txt','http')]:
 sha=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/commits/HEAD']))['sha'];j=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={sha}']));data=base64.b64decode(j['content']);assert len(data)==j['size']
 if name=='http':a=0;b=data.index(b'\n1.  Introduction',1)+1
 else:a=data.index(b'Table of Contents');b=data.index(b'\n1.  Introduction',a)+1
 excerpt=data[a:b];target=f'bench/x159/fixtures/{name}-toc.txt';Path(target).write_bytes(excerpt)
 rows.append(dict(repo=repo,path=path,revision=sha,originalSha256=hashlib.sha256(data).hexdigest(),originalBytes=len(data),startByte=a,endByte=b,target=target,sha256=hashlib.sha256(excerpt).hexdigest(),bytes=len(excerpt),selection='complete table of contents up to body section 1; retains page headers and all whitespace; HTTP mirror itself lacks front matter; not an official RFC-original byte claim'))
Path('bench/x159/receipts/fixture-provenance.json').write_text(json.dumps(rows,indent=2));print(rows)
