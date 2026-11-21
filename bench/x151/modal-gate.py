"""Reject unit-only, child-only or missing-reader evidence as frontier success."""
import json
from pathlib import Path
rows=[]
for name in ('ps-aux','kubectl'):
 r=json.loads(Path(f'bench/x151/receipts/{name}-carrier.json').read_text())
 gain=None if r['candidateTokens'] is None else r['incumbentTokens']-r['candidateTokens']
 accepted=gain is not None and gain>10 and r['applied']
 assert not accepted, 'unexpected gain: independently reverify before changing this gate'
 rows.append({'lane':r['path'],'completeWireGain':gain,'tokenGatePassed':accepted,'nativeSingleChat':'NOT_RUN','paretoAccepted':False})
Path('bench/x151/receipts/modal-gate.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(rows))
