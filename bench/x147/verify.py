"""Independent decimal/CSV inverse; compares against frozen API source, not encoder report."""
import base64, json, hashlib
from decimal import Decimal
from pathlib import Path
root=Path('bench/x147')
api=json.loads((root/'receipts/geyser-api.json').read_text())
source=base64.b64decode(api['content'])
assert source==(root/'heldout/geyser.csv').read_bytes()
probe=json.loads((root/'receipts/probe.json').read_text())
reads=0
for p in probe['plans']:
    # Contract is first line, configuration second, remaining bytes are CSV.
    _,meta,reduced=p['message'].split('\n',2)
    t,h,a,k,lo,hi=json.loads(meta)
    lines=(reduced[:-1] if reduced.endswith('\n') else reduced).split('\n')
    out=[]
    for i,line in enumerate(lines):
        row=line.split(',')
        row.insert(t,h if i==0 else lo if Decimal(row[a])<Decimal(k) else hi)
        out.append(','.join(row))
    result=('\n'.join(out)+ ('\n' if reduced.endswith('\n') else '')).encode()
    assert result==source
    reads+=1
print(json.dumps({'sourceSHA256':hashlib.sha256(source).hexdigest(),'independentSourceReads':reads,'native':'NOT_RUN'}))
import importlib.util,re
module=importlib.util.spec_from_file_location('cd','bench/chiron_decode.py')
cd=importlib.util.module_from_spec(module);module.loader.exec_module(cd)
def parent(m):
    h='¶ k=v. expand repeatedly; print only.\n'
    assert m.startswith(h)
    return cd.decode(m[len(h):])
assert parent(probe['parent']).encode()==source
final=json.loads((root/'receipts/final.json').read_text())
key,payload=final['message'].split('\n',1)
m=re.fullmatch(r'Decode CSV below; append (\w+): (\w+) if (\w+)<(-?[0-9.]+), else (\w+)\. Preserve other bytes; print only\.',key)
assert m
h,lo,name,k,hi=m.groups();reduced=parent(payload)
lines=reduced[:-1].split('\n') if reduced.endswith('\n') else reduced.split('\n')
headers=lines[0].split(',');a=headers.index(name)
out=[lines[0]+','+h]
for line in lines[1:]:out.append(line+','+(lo if Decimal(line.split(',')[a])<Decimal(k) else hi))
assert ('\n'.join(out)+ ('\n' if reduced.endswith('\n') else '')).encode()==source
print(json.dumps({'independentCompositeReads':1,'independentParentReads':1,'native':'NOT_RUN'}))
