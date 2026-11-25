import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('r','bench/x182/cue-reader.py');r=importlib.util.module_from_spec(s);s.loader.exec_module(r)
k=r.KEY+'\n'
assert r.parent_read(k+'S3 sep "|" r=0..2 body:-\nx 01+2*r ; a|b*\n')=='x 01|a\nx 03|b\nx 05|a\n'
assert r.parent_read(k+'S2 sep " " r=0..1 body:H\n00:00:02@+3s')=='H\n00:00:02\n00:00:05'
checks=2
for text in ['S2 sep " " r=0..9 body:-\n=a','S4 sep " " r=0..3 body:-\na|b','S2 sep " " r=0..1 body:-\n23:59:59@+1s','S2 sep " " r=0..1 body:-\n1.2+0.1*r','S2 sep " " r=0..1 body:-\n='+'🙂'*13000]:
 try:r.parent_read(k+text)
 except ValueError:checks+=1
 else:raise AssertionError(text)
Path('bench/x182/receipts/cue-attacks.json').write_text(json.dumps(dict(checks=checks)))
print(checks,'independent column-program attacks')
