# X12: frontier table from receipts (no re-measurement). Prints one row per lane.
import json, glob, sys
rows = []
for f in sorted(glob.glob('bench/z57/receipts/frontier-*.jsonl')):
    rows += [json.loads(l) for l in open(f) if l.strip()]
keys = ['daedalus', 'daedalus-dual', 'phalanx-a10', 'dendron', 'dendrons', 'gramma', 'akolouthia2']
print('| lane | raw | DAEDALUS | DAEDALUS-D | A10 | DENDRON | DENS-2 | GRAMMA | AKOLOUTHIA-2 | frontier-min | saving vs DAEDALUS (tokens, + = frontier smaller) |')
print('|---|---|---|---|---|---|---|---|---|---|---|')
for r in rows:
    name = r['file'].split('/')[-1]
    best = min(r[k] for k in keys)
    print(f"| {name} | {r['raw']} | " + ' | '.join(str(r[k]) for k in keys) + f" | {r['frontierMin']} | {r['daedalus']-best:+d} |")
print(f"\nlanes: {len(rows)}")
