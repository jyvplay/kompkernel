"""Produce an actual git --no-index -U0 diff of all files changed by pinned commit.
No invented edits, truncation or normalization. Source staging is disposable.
"""
import json,subprocess,base64,hashlib,sys
from pathlib import Path
repo='python/cpython';sha=sys.argv[1] if len(sys.argv)>1 else '9770e32ce07110f0c8c7a381604ec9a490028eed';stem=sys.argv[2] if len(sys.argv)>2 else 'cpython-U0'
def api(p):return json.loads(subprocess.check_output(['gh','api',p]))
r=api(f'repos/{repo}/commits/{sha}');parent=r['parents'][0]['sha'];work=Path('.cache/x157-diff')/sha;rows=[]
for f in r['files']:
 if f['status'] not in ('modified','added'):raise ValueError(f['status'])
 for folder,ref in [('a',parent),('b',sha)]:
  if folder=='a' and f['status']=='added':continue
  blob=api(f"repos/{repo}/contents/{f['filename']}?ref={ref}");data=base64.b64decode(blob['content']);assert len(data)==blob['size'];assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==blob['sha'];p=work/folder/f['filename'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);rows.append({'path':f['filename'],'ref':ref,'sha256':hashlib.sha256(data).hexdigest()})
p=subprocess.run(['git','diff','--no-index','--no-ext-diff','--unified=0','a','b'],cwd=work,capture_output=True);assert p.returncode==1,p.stderr
Path(f'bench/x157/fixtures/{stem}.diff').write_bytes(p.stdout)
Path(f'bench/x157/receipts/{stem}-provenance.json').write_text(json.dumps({'repo':repo,'commit':sha,'parent':parent,'command':'git diff --no-index --no-ext-diff --unified=0 a b','allChangedFiles':len(r['files']),'inputs':rows,'outputSha256':hashlib.sha256(p.stdout).hexdigest(),'bytes':len(p.stdout),'note':'real pinned revision diff with zero context, not fabricated changes; format selected before full-parent pricing'},indent=2))
print(len(p.stdout),p.stdout.count(b'\n@@ '))
