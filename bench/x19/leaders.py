#!/usr/bin/env python3
"""Build the X19 local-leader table: every codec that has a per-lane measurement in this
repository, joined on the 28-lane corpus, aggregated by structural category.

Inputs
  bench/x16/receipts/leaders-x16.tsv      X16 frontier (DENS-2, DENDRON, DAEDALUS, DAEDALUS-D,
                                          AKOLOUTHIA-2, PHALANX-A10) + frontier_min + category
  bench/z59/hemera-lanes.jsonl            HEMERA (X14) per-lane M
  bench/x19/receipts/stigme-lanes-vN.jsonl   STIGME: `ident` = min(LAKONIKOS, LAKONIKOS-D,
                                          AKOLOUTHIA-2) on the raw text, `M` = with the clause

Output: bench/x19/receipts/leaders-x19.tsv  (per lane) and a printed per-category summary.
"""
import csv
import json
import os
import sys
from collections import defaultdict

STIGME = sys.argv[1] if len(sys.argv) > 1 else 'bench/x19/receipts/stigme-lanes-v3.jsonl'
OUT = 'bench/x19/receipts/leaders-x19.tsv'


def load_front():
    rows = {}
    with open('bench/x16/receipts/leaders-x16.tsv') as f:
        for r in csv.DictReader(f, delimiter='\t'):
            rows[r['file']] = r
    return rows


def load_hemera():
    rows = {}
    try:
        with open('bench/z59/hemera-lanes.jsonl') as f:
            for line in f:
                r = json.loads(line)
                rows[os.path.basename(r['file'])] = r['M']
    except OSError:
        pass
    return rows


def load_stigme():
    rows = {}
    with open(STIGME) as f:
        for line in f:
            r = json.loads(line)
            rows[r['file']] = r
    return rows


def main():
    front = load_front()
    hem = load_hemera()
    stig = load_stigme()

    codecs = ['dendrons', 'dendron', 'daedalus', 'daedalus-dual', 'akolouthia2',
              'phalanx-a10', 'hemera', 'stigme']
    pretty = {'dendrons': 'DENS-2', 'dendron': 'DENDRON', 'daedalus': 'DAEDALUS',
              'daedalus-dual': 'DAEDALUS-D', 'akolouthia2': 'AKOLOUTHIA-2',
              'phalanx-a10': 'A10', 'hemera': 'HEMERA', 'stigme': 'STIGME'}

    per_lane = []
    for fn, fr in front.items():
        vals = {}
        for c in codecs:
            if c == 'hemera':
                if fn in hem:
                    vals[c] = hem[fn]
            elif c == 'stigme':
                if fn in stig:
                    vals[c] = stig[fn]['M']
            else:
                v = fr.get(c, '')
                if v and not v.startswith('TIMEOUT') and v != 'ERR':
                    vals[c] = int(v)
        if not vals:
            continue
        best = min(vals.values())
        winners = sorted([pretty[c] for c, v in vals.items() if v == best])
        # margin to the runner-up
        others = sorted(set(vals.values()))
        margin = (others[1] - others[0]) if len(others) > 1 else 0
        per_lane.append({
            'category': fr['category'], 'file': fn, 'best': best,
            'leader': '/'.join(winners), 'margin': margin,
            'x16_leader': pretty.get(fr['leader'], fr['leader']),
            'x16_min': int(fr['frontier_min']),
            'vals': vals,
        })

    with open(OUT, 'w') as f:
        cols = ['category', 'file'] + [pretty[c] for c in codecs] + \
               ['best', 'leader', 'margin', 'x16_min', 'x16_leader']
        f.write('\t'.join(cols) + '\n')
        for r in sorted(per_lane, key=lambda r: (r['category'], r['file'])):
            cells = [r['category'], r['file']]
            for c in codecs:
                v = r['vals'].get(c)
                cells.append(str(v) if v is not None else '')
            cells += [str(r['best']), r['leader'], str(r['margin']),
                      str(r['x16_min']), r['x16_leader']]
            f.write('\t'.join(cells) + '\n')

    print(f'per-lane table: {OUT}  ({len(per_lane)} lanes)\n')
    print(f"{'category':26s} {'lanes':>5s} {'best_sum':>9s} {'x16_sum':>8s} {'gain':>6s}  leaders")
    by_cat = defaultdict(list)
    for r in per_lane:
        by_cat[r['category']].append(r)
    tot_b = tot_x = 0
    for cat in sorted(by_cat):
        rows = by_cat[cat]
        b = sum(r['best'] for r in rows)
        x = sum(r['x16_min'] for r in rows)
        tot_b += b
        tot_x += x
        cnt = defaultdict(int)
        for r in rows:
            for w in r['leader'].split('/'):
                cnt[w] += 1 / len(r['leader'].split('/'))
        lead = ', '.join(f'{k} {v:.0f}' for k, v in sorted(cnt.items(), key=lambda kv: -kv[1]))
        print(f"{cat:26s} {len(rows):5d} {b:9d} {x:8d} {x - b:6d}  {lead}")
    print(f"{'TOTAL':26s} {len(per_lane):5d} {tot_b:9d} {tot_x:8d} {tot_x - tot_b:6d}")


if __name__ == '__main__':
    main()
