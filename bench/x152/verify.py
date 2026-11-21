import json,sys,hashlib
from pathlib import Path
from independent import read,parent_read
root=Path('bench/x152/receipts');results=[]
for name in ('parent','chalk','vscode','fused'):
 for r in map(json.loads,(root/(name+'.jsonl')).read_text().splitlines()):
  source=Path(r['path']).read_bytes();decoded=read(r['message']);assert decoded==source
  results.append({'group':name,'path':r['path'],'mode':r['mode'],'byteExact':True,'sha256':hashlib.sha256(source).hexdigest()})
for name in ('chalk','vscode'):
 r=json.loads((root/(name+'.jsonl.baseline.json')).read_text());assert parent_read(r['message']).encode()==r['text'].encode()
checks=json.loads((root/'gate.json').read_text());speed=json.loads((root/'speed-summary.json').read_text())
assert checks['bestGain']>10
accepted=checks['nativeSingleChat']=='PASS' and speed['gatePassed'];assert not accepted
# A fixed regression detector for the modal shortcut: program readability is
# true, yet native behavior is absent. The approval predicate MUST stay false.
summary={'independentMessages':len(results),'byteExact':len(results),'baselineReads':2,'nativeSingleChat':'NOT_RUN','speedGatePassed':speed['gatePassed'],'fullAcceptance':accepted,'modalShortcutDetected':True}
(root/'independent-summary.json').write_text(json.dumps({'summary':summary,'rows':results},indent=2)+'\n');print(json.dumps(summary))
