import json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[2];d=root/'bench/x134/receipts'
def rows(f):return [json.loads(l) for l in (d/f).read_text().splitlines() if l.strip()]
a=rows('frontier.jsonl');assert len(a)==29
old=[int(re.search(r' B=\s*(\d+)',l)[1]) for l in (root/'bench/x133/receipts/x133-verify29b.log').read_text().splitlines() if re.search(r' B=\s*(\d+)',l) and 'raw=' in l and not l.startswith('SIGMA')]
assert len(old)==29
summary={'baseline':{'lanes':len(a),'tokens':sum(r['tokens']for r in a),'ms':sum(r['ms']for r in a),'previousTokens':sum(old),'drift':[{'path':r['path'],'previous':o,'current':r['tokens']}for r,o in zip(a,old)if r['tokens']!=o],'timingNote':'uncontrolled single run, some overlap with post-processing; not a speed comparison'},'experiments':{}}
for f in ['probe','evict','specialize','latin','beam']:
 rs=rows(f+'.log');summary['experiments'][f]={'lanes':len(rs),'delta':sum(r['delta']for r in rs),'ms':sum(r['ms']for r in rs),'wins':[{'path':r['path'],'delta':r['delta']}for r in rs if r['delta']<0]}
rs=rows('orthogonal.log');summary['controls']={k:sum(r[k]-r['A']for r in rs)for k in ['reverse','casePlane','linePermutation']}
summary['independentSourceDecode']=json.loads((d/'coldread.json').read_text())['directSourceExact']
summary['acceptedIndependent']=json.loads((d/'accepted-cold.json').read_text())
summary['decision']='DRAFT ONLY: material-gain, whole-stack-speed and blind-model gates unmet; no default wiring or merge.'
(d/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
