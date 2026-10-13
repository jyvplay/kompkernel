#!/usr/bin/env python3
# Z34: per-lane table for a VXx eval jsonl against DAEDALUS (messageTokens incl. contract) and A10 (groups only).
# Frontier = min over the registry members that have a receipt for the file. Paths normalized (DAE receipts are absolute).
import json, sys, collections
PREF = '/home/user/kompkernel/'
def norm(f): return f[len(PREF):] if f.startswith(PREF) else f
def load(p):
    return {norm(json.loads(l)['file']): json.loads(l) for l in open(p) if l.strip()}
ev = load(sys.argv[1])
dae = load('bench/z33/receipts/daedalus-151.jsonl')
a10 = load('bench/z33/receipts/a10-groups.jsonl')
L = collections.defaultdict(lambda: dict(n=0, vxr=0, dae=0, a10=0, front=0, win=0, lose=0))
for f, r in ev.items():
    g = r['group']; v = r['search']
    d = dae[f]['messageTokens'] if f in dae else None
    a = a10[f]['a10'] if f in a10 else None
    cands = [x for x in (d, a) if x]
    fr = min(cands)
    row = L[g]
    row['n'] += 1; row['vxr'] += v; row['dae'] += d or 0; row['a10'] += a or 0; row['front'] += fr
    row['win'] += v < fr; row['lose'] += v > fr
tot = collections.Counter()
print(f"{'lane':13}{'n':>4}{'VXR':>9}{'DAE':>9}{'A10':>9}{'front':>9}{'VXR/front':>11}  win/lose vs frontier")
for g, r in sorted(L.items()):
    print(f"{g:13}{r['n']:>4}{r['vxr']:>9}{r['dae']:>9}{r['a10']:>9}{r['front']:>9}{(r['vxr']/r['front']-1)*100:>+10.2f}%  {r['win']}/{r['lose']}")
    for k in ('n','vxr','dae','a10','front','win','lose'): tot[k] += r[k]
print(f"{'ALL':13}{tot['n']:>4}{tot['vxr']:>9}{tot['dae']:>9}{'':>9}{tot['front']:>9}{(tot['vxr']/tot['front']-1)*100:>+10.2f}%  {tot['win']}/{tot['lose']}")
