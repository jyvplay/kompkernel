import json,collections,hashlib
from pathlib import Path
files=list(Path('.cache/x181').glob('*.cpuprofile'));assert len(files)==1,files
p=files[0];data=json.loads(p.read_text());nodes={n['id']:n for n in data['nodes']};counts=collections.Counter(data['samples']);total=sum(counts.values());rows=[]
for id,n in counts.most_common(30):
 f=nodes[id]['callFrame'];rows.append(dict(function=f['functionName'],url=f['url'],line=f['lineNumber']+1,samples=n,percent=100*n/total))
out=dict(rawFile=str(p),rawSha256=hashlib.sha256(p.read_bytes()).hexdigest(),samples=total,intervalMicroseconds=10000,scope='Whole fresh replay sampled self attribution; overlaps paid diagnostics. Not isolated wall/CPU or causal speed evidence.',top=rows)
Path('bench/x181/receipts/profile-summary.json').write_text(json.dumps(out,indent=2));print(out)
