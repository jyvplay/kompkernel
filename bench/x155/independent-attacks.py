"""Replay the independent FIFO-reader attack corpus and malformed streams."""
import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('reader',Path(__file__).with_name('independent.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
rows=json.loads(Path('bench/x155/receipts/compact-attacks.json').read_text())['rows']
for r in rows:assert m.undo(r['folded'],r['width'],True)==r['source'].encode()
bad=['{ a  b\n0\n0','{ "x"oops\n0','{ a\n=\\','{ a\n="','[2\n=onlyone','[0\n=orphan','{ a\n=literal\nextra','[01\n0','[10001','[1\n1\n2']
for text in bad:
 try:m.undo(text,2,True)
 except ValueError:pass
 else:raise AssertionError(text)
Path('bench/x155/receipts/independent-attacks.json').write_text(json.dumps({'positiveChecks':len(rows),'negativeChecks':len(bad),'checks':len(rows)+len(bad),'passed':True})+'\n')
print(len(rows)+len(bad))
