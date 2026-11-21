"""Independent cardinality-reader attacks; tests actual grammar, not flags."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('arkesis_reader',Path(__file__).with_name('independent.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
checks=0
for w in [1,2,4]:
 for char in ['\u0085','\u2028','\u2029','🚀','{12 [0',':,"','\\u0061']:
  raw=json.dumps(char,ensure_ascii=False);folded='{3 "x":1e309 "x":-0 "s":'+raw
  expected='{\n'+' '*w+'"x": 1e309,\n'+' '*w+'"x": -0,\n'+' '*w+'"s": '+raw+'\n}\n'
  assert m.undo(folded,w)==expected.encode();checks+=1
for bad in ['{1 "a":','[2 1','[1 1 2','[01 1','[10001','{1 true:1','[1 "unterminated','[1 1e','{1 "a": NaN','[1 '*130+'0','{2 "x":0']:
 try:m.undo(bad,2)
 except (ValueError,RecursionError):checks+=1
 else:raise AssertionError(bad)
Path('bench/x154/receipts/independent-attacks.json').write_text(json.dumps({'checks':checks,'passed':True,'scope':'arity mismatch, truncated/deep payload, malformed lexical tokens, duplicate keys, lexical numbers and Unicode separators'},indent=2)+'\n');print(checks)
