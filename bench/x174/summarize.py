import json
from pathlib import Path
p=Path('bench/x174/receipts')
def read(n):return json.loads((p/(n+'.json')).read_text())
screen=read('screen');trials=[json.loads(f.read_text()) for f in sorted(p.glob('trial-*.json'))]
assert len(trials)==6
import hashlib
validation=read('validation');assert validation['status']=='PASS'
for file,digest in validation['sourceHashes'].items():assert hashlib.sha256(Path(file).read_bytes()).hexdigest()==digest
summary=dict(codec='KYMATIA',accepted=False,productionChanged=False,native='NOT_RUN',kernel='NOT_RUN',unit={k:screen[k] for k in ['checks','arrays']},sources=len(screen['rows']),plans=sum(len(r['plans']) for r in screen['rows']),rawWins=sum(any(c['tokens']<r['raw'] for c in r['plans']) for r in screen['rows']),independent=read('independent'),selectorChecks=read('gate')['checks'],refusalGate=read('refusal-gate'),frontier=read('frontier-compare')['summary'],frontierIndependent=read('replay-independent'),speedHash=read('runtime-summary'),speedUtf8=read('runtime-C-summary'),utf8Oracle=read('utf8-gate'),portfolioChecks=read('portfolio')['checks'],strideChecks=read('stride')['checks'],tournament=read('tournament-summary'),tournamentGate=read('tournament-gate'),paidParent=[dict(path=r['path'],base=r['base']['tokens'],candidates=[c['tokens'] for c in r['candidates']],selected=r['result']['tokens']) for r in trials],build='PASS',tsc='PASS',finalize='PASS',notes=['Native and theorem kernel never executed.','One tournament parent reader output mismatch was refused; Python marks that envelope unsupported.','Canonical elapsed timings include deliberate process suspension and are not speed evidence.','The claimed speed acceptance thresholds are not met by either experiment.','No broad or niche frontier compression win is claimed.'])
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print({k:summary[k] for k in ['codec','accepted','sources','plans','rawWins','selectorChecks','build','tsc','finalize']})
