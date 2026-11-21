import importlib.util,json
from pathlib import Path

def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
p=load('parent','bench/x157/parent-reader.py');h=load('hap','bench/x160/independent.py')
key='Decode first. Expand !diff P H M lines to:\ndiff --git a/P b/P\nindex H M\n--- a/P\n+++ b/P\nSubstitute literally; otherwise preserve; print only.\n'
rows=[]
for name in ['isolation','constructed']:
 b=json.loads(Path(f'bench/x160/receipts/{name}-base.json').read_text());c=json.loads(Path(f'bench/x160/receipts/{name}-candidate.json').read_text());source=Path(c['path']).read_bytes()
 assert c['message'].startswith(key)
 assert h.undo(p.parent_read(c['message'][len(key):]))==source
 assert p.parent_read(b['message']).encode()==source
 rows.append(dict(name=name,completeMessages=2,sourceBytesEqual=True))
Path('bench/x160/receipts/full-independent.json').write_text(json.dumps({'rows':rows,'native':False,'scope':'independent Python message-only parser vs original fixture bytes'},indent=2))
