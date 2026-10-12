# Z37: per-file join of the 151-file VXR receipt and DAEDALUS receipt by repository-relative path.
# Z36's join keyed on basename, but only 77 basenames exist across 151 paths, so it mis-paired files.
# Paths are normalised by stripping the absolute repo prefix. Zero denominators are reported, never divided.
import json, collections
ROOT = '/home/user/kompkernel/'
def norm(p): return p[len(ROOT):] if p.startswith(ROOT) else p
V = [json.loads(l) for l in open('bench/z34/receipts/vxr-eval-151.jsonl') if l.strip()]
D = {}
for l in open('bench/z33/receipts/daedalus-151.jsonl'):
    if l.strip():
        r = json.loads(l); D[norm(r['file'])] = r
joined, missing, zero = [], [], []
for v in V:
    d = D.get(norm(v['file']))
    if d is None:
        missing.append(v['file']); continue
    if not d.get('messageTokens'):
        zero.append(v['file']); continue
    joined.append((v['group'], norm(v['file']), v.get('search'), d['messageTokens']))
print(json.dumps({'vxr_rows': len(V), 'daedalus_rows': len(D), 'joined': len(joined),
                  'missing_in_daedalus': len(missing), 'zero_denominator_skipped': len(zero)}))
g = collections.defaultdict(lambda: [0, 0, 0])
for grp, n, vx, dae in joined:
    if vx is None: continue
    g[grp][0] += vx; g[grp][1] += dae; g[grp][2] += 1
for grp, (a, b, c) in sorted(g.items()):
    print(json.dumps({'group': grp, 'n': c, 'vxr_sum': a, 'dae_sum': b, 'vxr_over_dae': round(a / b, 4) if b else None}))
