"""Independent emitted-wire audit. Never consumes encoder `.decoded` as evidence."""
import importlib.util,json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('cold',root/'bench/chiron_decode.py')
cd=importlib.util.module_from_spec(spec);spec.loader.exec_module(cd)
rows=[]
for line in (root/'bench/x134/receipts/frontier.jsonl').read_text().splitlines():
 a=json.loads(line);m=a['message'];source=(root/a['path']).read_bytes();i=m.find('§')
 try:
  out=cd.decode(m[i:]) if i>=0 else m
  rows.append({'path':a['path'],'directSourceExact':out.encode('utf-8')==source,'hasChiron':i>=0,'expandedBytes':len(out.encode('utf-8')),'sourceBytes':len(source)})
 except Exception as e:rows.append({'path':a['path'],'directSourceExact':False,'error':str(e)})
receipt={'reader':'bench/chiron_decode.py, existing independent CPython implementation','lanes':len(rows),'directSourceExact':sum(r['directSourceExact'] for r in rows),'rows':rows,'scope':'False is unresolved parent inversion, not automatically corruption; encoder decoded attributes are not used.'}
print(json.dumps(receipt,indent=2))
# Accepted candidates: this is an independent relative check plus a separately
# labeled source reconstruction, not an inherited encoder attribute.
accepted=[]
for line in (root/'bench/x134/receipts/accepted.jsonl').read_text().splitlines():
 a=json.loads(line);i=a['before'].find('§');j=a['after'].find('§')
 before=cd.decode(a['before'][i:]);after=cd.decode(a['after'][j:])
 assert before==after
 assert a['before'][:i]==a['after'][:j]
 accepted.append({'path':a['path'],'layerEqual':True,'prefixEqual':True,'directSourceExact':after.encode()==(root/a['path']).read_bytes()})
(root/'bench/x134/receipts/accepted-cold.json').write_text(json.dumps(accepted,indent=2)+'\n')
