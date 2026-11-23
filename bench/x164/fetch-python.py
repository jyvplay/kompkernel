import subprocess,json,base64,hashlib
from pathlib import Path
items=[('pydantic/pydantic','pydantic/_internal/_generics.py'),('pydantic/pydantic','pydantic/_internal/_typing_extra.py'),('pandas-dev/pandas','pandas/core/indexers/utils.py'),('pandas-dev/pandas','pandas/core/reshape/encoding.py'),('scikit-learn/scikit-learn','sklearn/utils/_tags.py'),('pytest-dev/pytest','src/_pytest/mark/structures.py'),('astral-sh/ruff','scripts/generate_mkdocs.py'),('python/cpython','Lib/graphlib.py')];rows=[];revs={}
for repo,path in items:
 try:
  if repo not in revs:
   info=json.loads(subprocess.check_output(['gh','api','repos/'+repo]));revs[repo]=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/commits/{info["default_branch"]}']))['sha']
  r=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/contents/{path}?ref={revs[repo]}']));assert r['encoding']=='base64';b=base64.b64decode(r['content']);name=repo.split('/')[1]+'-'+path.rsplit('/',1)[1];Path('bench/x164/python/'+name).write_bytes(b);rows.append({'repo':repo,'revision':revs[repo],'path':path,'file':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});print(name,len(b))
 except subprocess.CalledProcessError:print('UNAVAILABLE',repo,path)
Path('bench/x164/receipts/python-provenance.json').write_text(json.dumps(rows,indent=2))
