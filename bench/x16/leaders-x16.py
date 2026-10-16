#!/usr/bin/env python3
"""X16: per-lane frontier and local-leader table, built only from X16 receipts (no measurement here).

Sources: bench/x16/receipts/frontier-[AB].jsonl (one (lane, codec) per line, from frontier-run.sh)
         bench/x16/receipts/homoios-v1.jsonl (HOMOIOS one-chat M per lane; identity arm = DAEDALUS-D plain)
Keys: dendrons = DENS-2, dendron = DENDRON, daedalus = DAEDALUS, daedalus-dual = DAEDALUS-D,
      akolouthia2 = AKOLOUTHIA-2, phalanx-a10 = A10.
A missing or non-integer value is shown as TIMEOUT (or '-' if the row never ran). Ties are labelled by the
first minimal key in KEYS order. Category labels are by file name.
"""
import json, os, glob, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
KEYS = ['dendrons', 'dendron', 'daedalus', 'daedalus-dual', 'akolouthia2', 'phalanx-a10']
data = {}
def add(f, k, v): data.setdefault(f, {})[k] = v
for p in sorted(glob.glob(os.path.join(ROOT, 'bench/x16/receipts/frontier-[AB].jsonl'))):
    for line in open(p, encoding='utf8'):
        if not line.strip(): continue
        o = json.loads(line); row = o['row']
        if 'file' not in row: continue
        if o['key'] in row: add(row['file'], o['key'], row[o['key']])
        else: add(row['file'], o['key'], 'TIMEOUT')
homo = {}
hp = os.path.join(ROOT, 'bench/x16/receipts/homoios-v1.jsonl')
if os.path.exists(hp):
    for line in open(hp, encoding='utf8'):
        if line.strip():
            r = json.loads(line); homo[r['file']] = (r['M'], r['arm'], r['identityM'])
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
        if any(p in f for p in pats): return c
    return 'other'
rows = []
for f in sorted(data):
    d = data[f]
    nums = {k: d[k] for k in KEYS if isinstance(d.get(k), int)}
    if not nums: continue
    fmin = min(nums.values())
    lead = next(k for k in KEYS if nums.get(k) == fmin)
    dd = nums.get('daedalus-dual'); 
    rows.append((cat_of(f), f, fmin, lead, nums, homo.get(f)))
print('\t'.join(['category', 'file'] + KEYS + ['frontier_min', 'leader', 'homoios_M', 'homoios_arm']))
for c, f, fmin, lead, nums, h in rows:
    cells = [str(nums.get(k, 'TIMEOUT' if k in data.get(f, {}) else '-')) for k in KEYS]
    cells = [str(data[f].get(k)) if not isinstance(data[f].get(k), int) else str(data[f][k]) for k in KEYS]
    print('\t'.join([c, os.path.basename(f)] + cells + [str(fmin), lead, str(h[0]) if h else '-', h[1] if h else '-']))
lead_counts = {}
for _, _, _, lead, _, _ in rows: lead_counts[lead] = lead_counts.get(lead, 0) + 1
print('# lanes measured:', len(rows), '| frontier leader counts:', lead_counts, file=sys.stderr)
