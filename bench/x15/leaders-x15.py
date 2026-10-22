#!/usr/bin/env python3
"""X15: per-lane frontier and local-leader table, built ONLY from X15 receipts (no measurement here).

Sources (all written by bench/x15 runners in this turn):
  bench/x15/receipts/frontier-A.jsonl, frontier-B.jsonl     flat rows, first 11 lanes, all 8 keys
  bench/x15/receipts/frontier-keyed-A.jsonl, -B.jsonl       one (lane, codec) per line, remaining lanes
  bench/x15/receipts/diaphora-v1.jsonl                       DIAPHORA one-chat M per lane (identity on all)

Keys: dendrons = DENS-2, dendron = DENDRON, daedalus = DAEDALUS, daedalus-dual = DAEDALUS-D,
      phalanx-a10 = A10, akolouthia2 = AKOLOUTHIA-2, hora = HORA, hemera = HEMERA.
A key with no row for a lane is shown as '-' (not measured or timed out). Category labels are by file name.
"""
import json, os, glob
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
KEYS = ['dendrons', 'dendron', 'daedalus', 'daedalus-dual', 'phalanx-a10', 'akolouthia2', 'hora', 'hemera']
FRONTIER = ['dendrons', 'dendron', 'daedalus', 'daedalus-dual', 'phalanx-a10', 'akolouthia2']  # hora/hemera reported separately

data = {}   # file -> key -> M (int) or 'TIMEOUT'
def add(file, key, val):
    data.setdefault(file, {})[key] = val

for f in sorted(glob.glob(os.path.join(ROOT, 'bench/x15/receipts/frontier-[AB].jsonl'))):
    for line in open(f, encoding='utf8'):
        if not line.strip(): continue
        r = json.loads(line)
        for k in KEYS:
            if k in r: add(r['file'], k, r[k])
for f in sorted(glob.glob(os.path.join(ROOT, 'bench/x15/receipts/frontier-keyed-[AB].jsonl'))):
    for line in open(f, encoding='utf8'):
        if not line.strip(): continue
        o = json.loads(line)
        row = o['row']
        if 'file' not in row:
            continue
        k = o['key']
        if k in row:
            add(row['file'], k, row[k])
        else:
            add(row['file'], k, 'TIMEOUT')

diaphora = {}
p = os.path.join(ROOT, 'bench/x15/receipts/diaphora-v1.jsonl')
if os.path.exists(p):
    for line in open(p, encoding='utf8'):
        if line.strip():
            r = json.loads(line); diaphora[r['file']] = (r['M'], r['arm'])

CATS = [
    ('prose', ['readme', 'de-kb', 'kb-article', 'llm-answer', 'bibliography', 'email-thread', 'meeting-transcript']),
    ('ops-table', ['df-h', 'psql', 'kubectl', 'chart.svg']),
    ('ops-listing', ['find-listing', 'ls-l-', 'ls-full', 'git-numstat', 'git-log', 'node-stacktraces']),
    ('ops-log', ['openstack']),
    ('markup-sql', ['dump.sql']),
    ('temporal-table', ['vix', 'aapl', 'csv-8', 'sp500']),
    ('source-changelog-trace', ['miniserve', 'spring-projects']),
]
def cat_of(f):
    for c, pats in CATS:
        if any(p in f for p in pats): return c
    return 'other'

def num(v): return v if isinstance(v, int) else None

rows = []
for f in sorted(data):
    d = data[f]
    nums = {k: num(d[k]) for k in KEYS if num(d.get(k)) is not None}
    fr = {k: nums[k] for k in FRONTIER if k in nums}
    fmin = min(fr.values()) if fr else None
    leader = min(fr, key=lambda k: fr[k]) if fr else None
    ident = nums.get('daedalus')
    hem = nums.get('hemera'); hor = nums.get('hora')
    dia = diaphora.get(f, (None, None))
    rows.append({
        'file': f.split('/')[-1], 'category': cat_of(f), 'daedalus_plain': ident,
        'frontier_min': fmin, 'frontier_leader': leader,
        'dens2': d.get('dendrons'), 'dendron': d.get('dendron'), 'daedalus_d': d.get('daedalus-dual'),
        'a10': d.get('phalanx-a10'), 'akolouthia2': d.get('akolouthia2'), 'hora': hor, 'hemera': hem,
        'hemera_minus_frontier': (hem - fmin) if (hem is not None and fmin is not None) else None,
        'diaphora_M': dia[0], 'diaphora_arm': dia[1],
        'timeouts': [k for k in KEYS if d.get(k) == 'TIMEOUT'],
    })

out_json = os.path.join(ROOT, 'bench/x15/receipts/leaders-x15.json')
json.dump(rows, open(out_json, 'w'), indent=1)
hdr = ['file', 'category', 'daedalus_plain', 'frontier_min', 'frontier_leader', 'dens2', 'dendron', 'daedalus_d', 'a10',
       'akolouthia2', 'hora', 'hemera', 'hemera_minus_frontier', 'diaphora_M', 'timeouts']
lines = ['\t'.join(hdr)]
for r in rows:
    lines.append('\t'.join('-' if r[h] is None else (','.join(r[h]) if isinstance(r[h], list) and r[h] else ('-' if r[h] == [] else str(r[h]))) for h in hdr))
open(os.path.join(ROOT, 'bench/x15/receipts/leaders-x15.tsv'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
print(f'\n{len(rows)} lanes; wrote leaders-x15.json and .tsv')
