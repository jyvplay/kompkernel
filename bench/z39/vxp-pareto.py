# Z39: VERITAS-P vs the frontier per lane. Frontier = min(DAEDALUS, A10) per file (Z33 definition), joined by path.
# Also reports the same comparison with DAEDALUS identity-fallback files excluded (DAE winningArm 'none'),
# and VERITAS-P vs VERITAS-Q (Z38 rows) on the same files.
import json, collections, sys
ROOT = '/home/user/kompkernel/'
def norm(p): return p[len(ROOT):] if p.startswith(ROOT) else p
P = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
D = {}
for l in open('bench/z33/receipts/daedalus-151.jsonl'):
    if l.strip():
        r = json.loads(l); D[norm(r['file'])] = r
A = {}
for l in open('bench/z33/receipts/a10-groups.jsonl'):
    if l.strip():
        r = json.loads(l); A[norm(r['file'])] = r
Q = {}
for l in open('bench/z38/receipts/vxq-151.jsonl'):
    if l.strip():
        r = json.loads(l); Q[norm(r['file'])] = r
rows = []
for q in P:
    k = norm(q['file'])
    d = D[k]
    a10 = A[k]['a10'] if k in A and A[k].get('a10_exact') else None
    dae = d['messageTokens']
    front = min(dae, a10) if a10 is not None else dae
    ident = d['winningArm'] == 'none'
    vxq = Q[k]['vxq'] if k in Q else None
    rows.append(dict(g=q['group'], f=k, vxp=q['vxp'], vxq=vxq, dae=dae, a10=a10, front=front, ident=ident, exact=q['exact'], inTokens=q['inTokens'], raw=q.get('raw', False)))
def summarize(rs):
    out = {}
    g = collections.defaultdict(lambda: dict(n=0, vxp=0, front=0, vxq=0, wins=0, dae=0))
    for r in rs:
        x = g[r['g']]; x['n'] += 1; x['vxp'] += r['vxp']; x['front'] += r['front']; x['vxq'] += (r['vxq'] or 0); x['dae'] += r['dae']; x['wins'] += r['vxp'] < r['front']
    for k, x in sorted(g.items()):
        out[k] = dict(n=x['n'], vxp=x['vxp'], frontier=x['front'], vxpVsFrontierPct=round(100 * (x['vxp'] / x['front'] - 1), 2), vxqTotal=x['vxq'], vxpVsVxqPct=round(100 * (x['vxp'] / x['vxq'] - 1), 2) if x['vxq'] else None, filesSmallerThanFrontier=x['wins'])
    t = dict(n=len(rs), vxp=sum(r['vxp'] for r in rs), frontier=sum(r['front'] for r in rs), vxq=sum((r['vxq'] or 0) for r in rs))
    t['vxpVsFrontierPct'] = round(100 * (t['vxp'] / t['frontier'] - 1), 2)
    t['vxpVsVxqPct'] = round(100 * (t['vxp'] / t['vxq'] - 1), 2) if t['vxq'] else None
    t['filesSmallerThanFrontier'] = sum(r['vxp'] < r['front'] for r in rs)
    t['exactAll'] = all(r['exact'] for r in rs)
    out['_total'] = t
    return out
nid = [r for r in rows if not r['ident']]
summary = dict(all=summarize(rows), excludingDaeIdentity=summarize(nid))
json.dump(summary, open('bench/z39/receipts/vxp-pareto-summary.json', 'w'), indent=1)
json.dump(rows, open('bench/z39/receipts/vxp-pareto-rows.json', 'w'), indent=1)
print(json.dumps(summary['all'], indent=1))
print('excluding DAE identity:', json.dumps(summary['excludingDaeIdentity']['_total']))
