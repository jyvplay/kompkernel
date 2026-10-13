# Z38: VERITAS-Q vs the frontier per lane. Frontier = min(DAEDALUS, A10) per file (Z33 definition). Joins by path.
# Also reports the same comparison with the DAEDALUS identity-fallback files excluded (DAE winningArm 'none').
import json, collections, sys
ROOT = '/home/user/kompkernel/'
def norm(p): return p[len(ROOT):] if p.startswith(ROOT) else p
Q = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
D = {}
for l in open('bench/z33/receipts/daedalus-151.jsonl'):
    if l.strip():
        r = json.loads(l); D[norm(r['file'])] = r
A = {}
for l in open('bench/z33/receipts/a10-groups.jsonl'):
    if l.strip():
        r = json.loads(l); A[norm(r['file'])] = r
rows = []
for q in Q:
    k = norm(q['file'])
    d = D[k]
    a10 = A[k]['a10'] if k in A and A[k].get('a10_exact') else None
    dae = d['messageTokens']
    front = min(dae, a10) if a10 is not None else dae
    ident = dae >= d['inTokens']
    rows.append(dict(g=q['group'], f=k, vxq=q['vxq'], dae=dae, a10=a10, front=front, ident=ident, exact=q['exact'], legend=q['legend'], inTokens=q['inTokens']))
def summarize(rs):
    out = {}
    g = collections.defaultdict(lambda: dict(n=0, vxq=0, front=0, wins=0))
    for r in rs:
        x = g[r['g']]; x['n'] += 1; x['vxq'] += r['vxq']; x['front'] += r['front']; x['wins'] += r['vxq'] < r['front']
    for k, x in sorted(g.items()):
        out[k] = dict(n=x['n'], vxq=x['vxq'], frontier=x['front'], pct=round(100 * (x['vxq'] / x['front'] - 1), 2), filesSmaller=x['wins'])
    t = dict(n=len(rs), vxq=sum(r['vxq'] for r in rs), frontier=sum(r['front'] for r in rs))
    t['pct'] = round(100 * (t['vxq'] / t['frontier'] - 1), 2)
    t['filesSmaller'] = sum(r['vxq'] < r['front'] for r in rs)
    return out, t
all_out, all_t = summarize(rows)
nid_out, nid_t = summarize([r for r in rows if not r['ident']])
print(json.dumps({'exact': sum(r['exact'] for r in rows), 'n': len(rows), 'legend': dict(collections.Counter(r['legend'] for r in rows)), 'all': {'lanes': all_out, 'total': all_t}, 'excludingDaeIdentity': {'lanes': nid_out, 'total': nid_t}}, indent=1))
json.dump(rows, open('/home/user/z38/vxq-pareto-rows.json', 'w'))
