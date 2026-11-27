"""Separate Python parent + MARTYS byte comparator; partial reads never pass."""
import importlib.util,json
from pathlib import Path
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
parent=load('parent','bench/x182/cue-reader.py');martys=load('martys','bench/x192/independent.py');r=Path('bench/x192/receipts');paid=[];canonical=[]
for f in sorted(r.glob('paid-[0-9][0-9].json')):
 x=json.loads(f.read_text())
 try:actual=martys.undo(parent.parent_read(x['parent']))
 except (AssertionError,ValueError,TypeError,UnicodeError) as e:paid.append(dict(file=str(f),status='unsupported',error=str(e)));continue
 assert actual.encode()==Path(x['path']).read_bytes();paid.append(dict(file=str(f),status='exact'))
front=list(map(json.loads,(r/'frontier.jsonl').read_text().splitlines()));assert len(front)==29 and len({x['path'] for x in front})==29
for x in front:
 try:actual=parent.parent_read(x['message'])
 except (AssertionError,ValueError,TypeError,UnicodeError) as e:canonical.append(dict(path=x['path'],status='unsupported',error=str(e)));continue
 assert actual.encode()==Path(x['path']).read_bytes();canonical.append(dict(path=x['path'],status='exact'))
(r/'parent-check.json').write_text(json.dumps(dict(paid=paid,canonical=canonical,native='NOT_RUN',independentPersonnel=False),indent=2));print('paid',len(paid),'canonical',len(canonical))
