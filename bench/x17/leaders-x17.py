#!/usr/bin/env python3
"""X17: per-lane frontier, LAKONIKOS-D and STATHMOS table, built only from receipts (no measurement here).

Sources:
  bench/x17/receipts/frontier-[AB].jsonl        frontier re-run (frontier-run.sh), one (lane, key) per line
  bench/x16/receipts/lakonikos-d-registry.jsonl LAKONIKOS-D one-chat M per lane (X16)
  bench/x17/receipts/stathmos-lanes-v1.jsonl    STATHMOS one-chat M per lane (X17), with exact flag and transform flag
Keys: dendrons = DENS-2, dendron = DENDRON, daedalus = DAEDALUS, daedalus-dual = DAEDALUS-D,
      akolouthia2 = AKOLOUTHIA-2, phalanx-a10 = A10.
Lanes are matched by file basename. A missing or non-integer frontier value is shown as TIMEOUT and is
excluded from the frontier minimum. Writes bench/x17/receipts/leaders-x17.tsv.
"""
import json, os, glob, csv

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
KEYS = ['dendrons', 'dendron', 'daedalus', 'daedalus-dual', 'akolouthia2', 'phalanx-a10']
front = {}   # basename -> {key: value}
for p in sorted(glob.glob(os.path.join(ROOT, 'bench/x17/receipts/frontier-[AB].jsonl'))):
    for line in open(p, encoding='utf8'):
        if not line.strip():
            continue
        o = json.loads(line)
        row = o['row']
        if 'file' not in row:
            continue
        base = os.path.basename(row['file'])
        v = row.get(o['key'], 'TIMEOUT')
        front.setdefault(base, {})[o['key']] = v

lkd = {}
lp = os.path.join(ROOT, 'bench/x16/receipts/lakonikos-d-registry.jsonl')
for line in open(lp, encoding='utf8'):
    if line.strip():
        r = json.loads(line)
        lkd[os.path.basename(r['file'])] = r['lakonikos-d']

sta = {}
sp = os.path.join(ROOT, 'bench/x17/receipts/stathmos-lanes-v1.jsonl')
for line in open(sp, encoding='utf8'):
    if line.strip():
        r = json.loads(line)
        sta[os.path.basename(r['lane'])] = r

CATS = [
    ('prose', ['readme', 'de-kb', 'kb-article', 'llm-answer', 'bibliography', 'email-thread', 'meeting-transcript', 'LICENSE', 'agent-history']),
    ('ops-table', ['df-h', 'psql', 'kubectl', 'chart.svg']),
    ('ops-listing', ['find-listing', 'ls-l-', 'ls-full', 'git-numstat', 'git-log', 'node-stacktraces', 'ops-git']),
    ('ops-log', ['openstack']),
    ('markup-sql', ['dump.sql']),
    ('temporal-table', ['vix', 'aapl', 'csv-8', 'sp500']),
    ('source-changelog-trace', ['miniserve', 'spring-projects']),
]

def cat_of(f):
    for c, pats in CATS:
        if any(p in f for p in pats):
            return c
    return 'other'

out = []
for f in sorted(set(front) | set(sta)):
    fr = front.get(f, {})
    ints = {k: v for k, v in fr.items() if isinstance(v, int)}
    if not ints:
        continue
    fmin = min(ints.values())
    leader = next(k for k in KEYS if k in ints and ints[k] == fmin)
    s = sta.get(f)
    sM = s['stathmosO200k'] if s else None
    l = lkd.get(f)
    out.append({
        'category': cat_of(f), 'file': f,
        **{k: fr.get(k, '-') for k in KEYS},
        'frontier_min': fmin, 'frontier_leader': leader,
        'lakonikos_d': l if l is not None else '-',
        'stathmos': sM if sM is not None else '-',
        'stathmos_exact': (s['exact'] if s else '-'),
        'stathmos_transformed': (s['transformed'] if s else '-'),
        'stathmos_minus_frontier': (sM - fmin) if sM is not None else '-',
        'stathmos_minus_lkd': (sM - l) if (sM is not None and l is not None) else '-',
    })

cols = ['category', 'file'] + KEYS + ['frontier_min', 'frontier_leader', 'lakonikos_d', 'stathmos',
        'stathmos_exact', 'stathmos_transformed', 'stathmos_minus_frontier', 'stathmos_minus_lkd']
path = os.path.join(ROOT, 'bench/x17/receipts/leaders-x17.tsv')
with open(path, 'w', newline='', encoding='utf8') as fh:
    w = csv.writer(fh, delimiter='\t')
    w.writerow(cols)
    for r in out:
        w.writerow([r[c] for c in cols])

from collections import Counter
print('lanes', len(out))
print('frontier leaders', Counter(r['frontier_leader'] for r in out))
print('stathmos below frontier min', sum(1 for r in out if isinstance(r['stathmos_minus_frontier'], int) and r['stathmos_minus_frontier'] < 0))
print('stathmos transformed', sum(1 for r in out if r['stathmos_transformed'] is True))
print('written', path)
