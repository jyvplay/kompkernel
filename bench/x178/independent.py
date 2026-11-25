"""Independent linear-scan inverse. No import of the TypeScript codec."""
import json,importlib.util
from pathlib import Path

def undo_block(trace, table):
    rows=[list(r) for r in table];output=[]
    for row in reversed(trace):
        x=rows[row].pop()
        for r in range(row-1,-1,-1):
            eligible=[j for j,v in enumerate(rows[r]) if v<x]
            assert eligible
            k=eligible[-1];rows[r][k],x=x,rows[r][k]
        output.insert(0,x)
    assert not any(rows)
    return output

def undo(folded, mode):
    fields=[]
    for line in folded.split('\n'):
        digits,table=json.loads(line);width=len(str(len(table)-1));assert len(digits)%width==0
        trace=[int(digits[i:i+width]) for i in range(0,len(digits),width)];fields.extend(undo_block(trace,table))
    return (' ' if mode=='space' else '\n').join(fields)
checks=0
for r in json.loads(Path('bench/x178/receipts/unit-pairs.json').read_text()):
    assert undo_block(r['trace'],r['rows'])==r['fields'];checks+=1
for r in json.loads(Path('bench/x178/receipts/screen.json').read_text())['rows']:
    for p in r.get('plans',[]):
        assert undo(p['folded'],p['mode']).encode()==Path(r['path']).read_bytes();checks+=1
spec=importlib.util.spec_from_file_location('bounded','bench/x170/bounded-parent.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
paid=0;unsupported=[]
for file in Path('bench/x178/receipts').glob('trial-*.json'):
    r=json.loads(file.read_text())
    for p in r['candidates']:
        try:folded=reader.parent_read(p['parent'])
        except ValueError as e:unsupported.append(dict(path=r['path'],error=str(e)));continue
        assert undo(folded,p['mode']).encode()==Path(r['path']).read_bytes();checks+=1;paid+=1
out=dict(checks=checks,paidExact=paid,unsupported=unsupported,native='NOT_RUN')
Path('bench/x178/receipts/independent.json').write_text(json.dumps(out,indent=2));print(out)
