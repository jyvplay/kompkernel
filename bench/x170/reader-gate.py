import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('reader','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
rows=[];checks=0
for line in Path('bench/x169/receipts/frontier.jsonl').read_text().splitlines():
 r=json.loads(line)
 try:restored=reader.parent_read(r['message'])
 except ValueError as e:rows.append(dict(path=r['path'],status='unsupported',error=str(e)));continue
 assert restored.encode()==Path(r['path']).read_bytes(),r['path'];checks+=1;rows.append(dict(path=r['path'],status='exact'))
for n in range(1,7):
 key=f'¶k=v expand repeatedly After ~, a number has . before its last {n} digits. print only.\n'
 for d in ['1234567','0000000','12345678901234567890']:
  assert reader.parent_read(key+'§аx¶-~'+d+'\r\n')=='-'+d[:-n]+'.'+d[-n:]+'\r\n';checks+=1
 for body in ['~','~x','~'+'1'*n]:
  try:reader.parent_read(key+'§аx¶'+body)
  except ValueError:checks+=1
  else:raise AssertionError('ambiguous short marker accepted')
for m in ['¶unknown\n§аx¶а','Body first. unsupported','spec: unknown']:
 try:reader.parent_read(m)
 except ValueError:checks+=1
 else:raise AssertionError('unsupported returned as literal')
assert reader.parent_read('plain\r\ntext')=='plain\r\ntext';checks+=1
out=dict(checks=checks,exact=sum(r['status']=='exact' for r in rows),unsupported=sum(r['status']=='unsupported' for r in rows),rows=rows,scope='fresh gate on X169 frozen wires; X170 fresh-wire replay gate separate',native='NOT_RUN');Path('bench/x170/receipts/reader-gate.json').write_text(json.dumps(out,indent=2));print({k:v for k,v in out.items() if k!='rows'})
