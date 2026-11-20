"""Independent inverse for X150 ΠΟΛΥΣΤΗΛΗ real-file fixtures.
Uses no project imports; compares the original UTF-8 bytes. Not a parent-wire
or LLM behavioral test.
"""
from pathlib import Path
import re,hashlib,json
marker=re.compile(r'^॥([0-9]+(?:,[0-9]+)+):([0-9]+) rows single-spaced, pad field k to width k, rest verbatim\.$')
paths=['bench/holdout-x41/ls-l-real.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-tbl/kubectl-get-pods.txt']
outcomes=[]
for index,path in enumerate(paths):
    coded=Path(f'bench/x150/receipts/polysteli-folded-{index}.txt').read_text()
    lines=coded.split('\n'); out=[]; i=0
    while i<len(lines):
        m=marker.fullmatch(lines[i])
        if not m:
            out.append(lines[i]); i+=1; continue
        widths=[int(w) for w in m[1].split(',')]; count=int(m[2]);i+=1
        if i+count>len(lines):raise ValueError('truncated')
        for row in lines[i:i+count]:
            fields=list(re.finditer(r'\S+',row))
            if len(fields)<len(widths):raise ValueError('fields')
            terms=[]
            for width,field in zip(widths,fields):
                value=field.group(); units=len(value.encode('utf-16-le'))//2
                if units>width:raise ValueError('width')
                terms.append(' '*(width-units)+value)
            terms.append(row[fields[len(widths)-1].end():])
            out.append(''.join(terms))
        i+=count
    decoded='\n'.join(out).encode('utf8'); source=Path(path).read_bytes()
    if decoded!=source:raise AssertionError(path)
    outcomes.append({'path':path,'bytes':len(source),'sha256':hashlib.sha256(source).hexdigest(),'byte_exact':True})
print(json.dumps(outcomes,indent=2))
