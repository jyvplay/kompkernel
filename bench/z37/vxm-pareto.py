# Z37: VERITAS-M vs the frontier per lane. Frontier = min(DAEDALUS, A10) per file (same definition as Z33),
# with A10 only where measured (the 40 group files). Joins are by normalised path, never by basename.
import json, collections, sys
ROOT = '/home/user/kompkernel/'
def norm(p): return p[len(ROOT):] if p.startswith(ROOT) else p
M = [json.loads(l) for l in open(sys.argv[1] if len(sys.argv) > 1 else '/home/user/z37/vxm-151.jsonl') if l.strip()]
D = {norm(r['file']): r for r in map(json.loads, open('bench/z33/receipts/daedalus-151.jsonl')) if r}
A = {norm(r['file']): r for r in map(json.loads, open('bench/z33/receipts/a10-groups.jsonl')) if r}
L = collections.defaultdict(lambda: dict(n=0, vxm=0, dae=0, front=0, wins=0, a10n=0))
rows = []
for m in M:
    k = norm(m['file'])
    d = D.get(k)
    if d is None or not d.get('messageTokens'):
        continue
    dae = d['messageTokens']
    a10 = A[k]['a10'] if k in A and A[k].get('a10_exact') else None
    front = min(dae, a10) if a10 is not None else dae
    g = L[m['group']]
    g['n'] += 1; g['vxm'] += m['vxm']; g['dae'] += dae; g['front'] += front
    g['wins'] += m['vxm'] < front; g['a10n'] += a10 is not None
    rows.append({'g': m['group'], 'f': k, 'vxm': m['vxm'], 'dae': dae, 'a10': a10, 'front': front, 'exact': m['exact'], 'mode': m['mode']})
out = {}
for grp, g in sorted(L.items()):
    out[grp] = dict(n=g['n'], a10_measured=g['a10n'], vxm=g['vxm'], frontier=g['front'], dae=g['dae'],
                    vxm_vs_frontier_pct=round(100 * (g['vxm'] / g['front'] - 1), 2), files_vxm_smaller=g['wins'])
tot = dict(n=len(rows), exact=sum(r['exact'] for r in rows), vxm=sum(r['vxm'] for r in rows), frontier=sum(r['front'] for r in rows),
           files_vxm_smaller=sum(r['vxm'] < r['front'] for r in rows))
print(json.dumps({'lanes': out, 'total': tot}, indent=1))
json.dump(rows, open('/home/user/z37/vxm-pareto-rows.json', 'w'))
