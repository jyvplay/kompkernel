# Z31: summarise A8 (VERITAS-U as VX stage in the PHALANX stack) against A7 (VERITAS-A best-of-3), from the run outputs.
# Reads: groups (both A7 and A8 per file, same run) and fresh A8 vs the A7 fresh run (overlap of the two files only).
import json, sys
G = [json.loads(l) for l in open('/home/user/z31/a8-groups.jsonl')]
F8 = {json.loads(l)['file']: json.loads(l) for l in open('/home/user/z31/a8-fresh.jsonl')}
F7 = {}
for l in open('/home/user/z31/a7f.jsonl'):
    r = json.loads(l); F7[r['file']] = r['a7T']
print('== Lane groups, o200k tokens, PHALANX-A7 vs PHALANX-A8 (same run, both decoded and checked)')
print(f"{'group':14}{'files':>6}{'A7':>9}{'A8':>9}{'A8-A7':>8}{'pct':>8}{'A8 better':>10}{'A8 worse':>9}{'equal':>7}  exact")
groups = {}
for r in G:
    groups.setdefault(r['group'], []).append(r)
tot = [0, 0, 0]
for g, rs in groups.items():
    a7 = sum(r['a7'] for r in rs); a8 = sum(r['a8'] for r in rs)
    better = sum(r['a8'] < r['a7'] for r in rs); worse = sum(r['a8'] > r['a7'] for r in rs); eq = len(rs) - better - worse
    ex = all(r['a7_exact'] and r['a8_exact'] for r in rs)
    print(f"{g:14}{len(rs):>6}{a7:>9}{a8:>9}{a8-a7:>+8}{(a8-a7)/a7*100:>+7.2f}%{better:>10}{worse:>9}{eq:>7}  {ex}")
    tot[0] += a7; tot[1] += a8; tot[2] += len(rs)
print(f"{'ALL GROUPS':14}{tot[2]:>6}{tot[0]:>9}{tot[1]:>9}{tot[1]-tot[0]:>+8}{(tot[1]-tot[0])/tot[0]*100:>+7.2f}%")
print()
print('== Per-file, lane groups (A8 - A7 tokens; negative is better for A8)')
for r in G:
    print(f"{r['group']:13} {r['a8']-r['a7']:>+6}  {r['a7']:>6} -> {r['a8']:>6}  {r['file']}")
print()
print('== Fresh corpus (111 real docs, o200k): A8 vs A7 on the documents where both ran')
ov = [f for f in F8 if f in F7]
a7s = sum(F7[f] for f in ov); a8s = sum(F8[f]['a8'] for f in ov)
better = sum(F8[f]['a8'] < F7[f] for f in ov); worse = sum(F8[f]['a8'] > F7[f] for f in ov)
print(f"overlap docs {len(ov)} of A8 run {len(F8)} / A7 run {len(F7)}; A7 {a7s}  A8 {a8s}  diff {a8s-a7s:+d} ({(a8s-a7s)/a7s*100:+.2f}%)  A8 better {better}, worse {worse}, equal {len(ov)-better-worse}")
print('exact A8 on all fresh docs run:', all(F8[f]['a8_exact'] for f in F8), ' docs run:', len(F8))
print(f"A8 total over all {len(F8)} fresh docs: {sum(r['a8'] for r in F8.values())} tokens; exact {sum(r['a8_exact'] for r in F8.values())}/{len(F8)}")
# Fresh overlap: how much of the gain is the VX stage alone (VXA best-of-3 at VX level, from vx.jsonl)?
VXL = {json.loads(l)['file']: json.loads(l)['best_T'] for l in open('/home/user/z31/vx.jsonl')}
print(f"overlap {len(ov)} docs: VXA best-of-3 VX-level {sum(VXL[f] for f in ov)}  A7 stack {a7s}  A8 stack {a8s}  (stack layers above VX on A7: {a7s - sum(VXL[f] for f in ov):+d})")
