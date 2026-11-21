"""Exact contiguous minimum-four-right-edge run census, not a codec benchmark."""
from pathlib import Path
import re, json
for path in ['bench/holdout-x41/ps-aux-real.txt','bench/holdout-x41/ls-l-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-tbl/kubectl-get-pods.txt']:
    lines=Path(path).read_text().split('\n')
    valid=[]
    for row in lines:
        fields=list(re.finditer(r'\S+',row))
        valid.append(tuple(m.end() for m in fields[:4]) if len(fields)>=4 and fields[0].start()==0 and '\t' not in row and '\r' not in row else None)
    runs=[];i=0
    while i<len(lines):
        j=i+1
        while j<len(lines) and valid[i] is not None and valid[j]==valid[i]:j+=1
        if valid[i] is not None and j-i>=2:runs.append({'start_1based':i+1,'rows':j-i,'first4_ends':valid[i]})
        i=j
    eligible=[x for x in runs if x['rows']>=6]
    print(json.dumps({'path':path,'line_count':len(lines),'runs_ge_2':runs,'runs_ge_6_rows':sum(x['rows'] for x in eligible)}))
