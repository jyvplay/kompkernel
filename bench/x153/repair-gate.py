"""Permanent targeted replay of the independent reader's Unicode-line repair."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('x153reader',Path(__file__).with_name('independent.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
checks=0
for char in ['\u0085','\u2028','\u2029','🚀']:
 for eol in ['\n','\r\n']:
  source=('{\n "s":"a'+char+'b",\n "a": [\n 1\n ]\n}\n').replace('\n',eol)
  folded=('{\n "s":"a'+char+'b",\n "a": [\n 1\n \n\n').replace('\n',eol)
  assert m.read(m.HOLE+folded)==source.encode();checks+=1
Path('bench/x153/receipts/python-line-after.json').write_text(json.dumps({'checks':checks,'passed':True})+'\n')
print(checks)
