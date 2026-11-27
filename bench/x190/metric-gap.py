"""Execute three inspected comparator functions from a pinned external source.
Not a model run, full RTCE replication, or critique of its task-specific metric.
"""
import ast,math,json,hashlib
from pathlib import Path
file=Path('.cache/x190/research/rtce-check_io_pred_acc_mp.py')
manifest=json.loads(Path('bench/x190/receipts/research-sources.json').read_text());entry=next(x for x in manifest if x['file']==str(file));assert hashlib.sha256(file.read_bytes()).hexdigest()==entry['sha256']
module=ast.parse(file.read_text());names={'normalize','maybe_literal_eval','deep_equal'};nodes=[n for n in module.body if isinstance(n,ast.FunctionDef) and n.name in names];assert len(nodes)==3
namespace={'ast':ast,'math':math};exec(compile(ast.Module(body=nodes,type_ignores=[]),str(file),'exec'),namespace)
rows=[]
for a,b in [("'a b'",'a b'),('[1, 2]','(1, 2)'),('1.0000','1.0005')]:
 accepted=namespace['deep_equal'](a,b);exact=a.encode()==b.encode();assert accepted and not exact
 rows.append(dict(left=a,right=b,externalDeepEqualDefault=accepted,rawByteEqual=exact))
Path('bench/x190/receipts/metric-gap.json').write_text(json.dumps(dict(source=entry,functions=sorted(names),checks=rows,scope='Default comparator function only. No assertion about configuration/results of the published benchmark.'),indent=2));print(rows)
