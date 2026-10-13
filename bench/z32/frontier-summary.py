"""Z32: group summaries for A10 vs A8 (groups) and VXC/A10 vs DAEDALUS (registry frontier, one-chat tokens)."""
import json, collections, sys
R = 'bench/z32/receipts/'
A10 = {json.loads(l)['file']: json.loads(l) for l in open(R + 'a10-groups.jsonl')}
A8 = {json.loads(l)['file']: json.loads(l) for l in open('/home/user/z31/a8-groups.jsonl')}
DAE = {json.loads(l)['file']: json.loads(l) for l in open(R + 'daedalus-151.jsonl')}
VXC = {json.loads(l)['file']: json.loads(l) for l in open(R + 'vxc-perdoc-151.jsonl')}
print('== A10 vs A8 (groups, 40 files) ==')
G = collections.defaultdict(lambda: collections.Counter())
for f, r in A10.items():
    g = r['group']; a8 = A8[f]
    G[g]['a7'] += a8['a7']; G[g]['a8'] += a8['a8']; G[g]['a10'] += r['a10']; G[g]['n'] += 1
    G[g]['exact'] += bool(r['a10_exact'])
    d = r['a10'] - a8['a8']
    G[g]['b'] += d < 0; G[g]['w'] += d > 0; G[g]['e'] += d == 0
tot = collections.Counter()
for g, c in sorted(G.items()):
    tot.update(c)
    print(f"{g:13s} n={c['n']:2d} exact={c['exact']}/{c['n']} A7={c['a7']} A8={c['a8']} A10={c['a10']} A10-A8={c['a10']-c['a8']} ({(c['a10']-c['a8'])/c['a8']*100:+.2f}%) b/w/e={c['b']}/{c['w']}/{c['e']}")
print(f"ALL A7={tot['a7']} A8={tot['a8']} A10={tot['a10']} vsA8 {(tot['a10']-tot['a8'])/tot['a8']*100:+.2f}% vsA7 {(tot['a10']-tot['a7'])/tot['a7']*100:+.2f}%")
print('== VERITAS-C and DAEDALUS (registry, one-chat messageTokens; DAEDALUS includes its contract) ==')
G = collections.defaultdict(lambda: collections.Counter())
for f, v in VXC.items():
    g = v['group']; d = DAE[f]
    G[g]['dae'] += d['messageTokens']; G[g]['vxc'] += v['outTokens']; G[g]['n'] += 1
    G[g]['vxc_lt'] += v['outTokens'] < d['messageTokens']
    G[g]['exact'] += bool(v['exact'] and d['exact'])
tot = collections.Counter()
for g, c in sorted(G.items()):
    tot.update(c)
    print(f"{g:13s} n={c['n']:3d} exact={c['exact']}/{c['n']} DAE={c['dae']} VXC={c['vxc']} VXC-DAE={(c['vxc']-c['dae'])/c['dae']*100:+.2f}% VXC-smaller-docs={c['vxc_lt']}")
print(f"ALL DAE={tot['dae']} VXC={tot['vxc']} {(tot['vxc']-tot['dae'])/tot['dae']*100:+.2f}%")
