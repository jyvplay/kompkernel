"""Generalized leaders: fixture savings vs raw, plus token-class census.
Uses X134's inherited category classification; this is not a per-codec
ablation or proof of globally optimal choice.
"""
import json
from pathlib import Path
p=Path('bench/x173/receipts/leaders.json')
data=json.loads(p.read_text()); result={}
for category,group in data['groups'].items():
    rows=[r for r in data['rows'] if r['category']==category]
    def entry(r):return {'path':r['path'],'raw':r['raw'],'tokens':r['tokens'],'saved':r['raw']-r['tokens'],'savedPercent':round(100*(r['raw']-r['tokens'])/r['raw'],2)}
    result[category]={'lanes':len(rows),'aggregateRaw':group['raw'],'aggregateTokens':group['tokens'],
       'largestAbsoluteSaving':entry(max(rows,key=lambda r:r['raw']-r['tokens'])),
       'largestRelativeSaving':entry(max(rows,key=lambda r:(r['raw']-r['tokens'])/r['raw'])),
       'tapeBodyTokenClassLeader':group['leader'],'tapeLanes':group['tapeLanes']}
Path('bench/x173/receipts/local-leaders.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
