#!/usr/bin/env python3
"""X14: per-lane frontier and local-leader table, built ONLY from receipts (no new measurements).
Sources:
  bench/z57/receipts/frontier-fl-part-a{a,b}.jsonl   (17 lanes, X12; keys daedalus, daedalus-dual,
      phalanx-a10, dendron, dendrons, gramma, akolouthia2)
  bench/z57/receipts/frontier-newlanes.jsonl         (ls-l-omega, ls-l-bin, X12)
  bench/z59/frontier-dates.jsonl                     (aapl, vix, csv-8, X14; + paradeigma)
  bench/z59/receipts/paradeigma-subset.jsonl         (6 lanes, X13/X14; paradeigma)
  bench/z59/hemera-lanes.jsonl                       (HEMERA one-chat M per lane, X14)
Category labels are assigned by file name (stated in the output)."""
import glob, json, os, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
def load(pattern):
    rows = {}
    for f in sorted(glob.glob(os.path.join(ROOT, pattern))):
        for line in open(f, encoding='utf8'):
            line = line.strip()
            if not line.startswith('{'):
                continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            if 'file' in r:
                rows.setdefault(r['file'], {}).update({k: v for k, v in r.items() if k != 'file'})
    return rows
data = {}
for pat in ['bench/z57/receipts/frontier-fl-part-a*.jsonl', 'bench/z57/receipts/frontier-newlanes.jsonl',
            'bench/z59/frontier-dates.jsonl', 'bench/z59/receipts/paradeigma-subset.jsonl']:
    for k, v in load(pat).items():
        data.setdefault(k, {}).update(v)
hemera = load('bench/z59/hemera-lanes.jsonl')
CATS = [
    ('prose', ['readme', 'de-kb', 'kb-article', 'llm-answer', 'bibliography', 'email-thread', 'meeting-transcript']),
    ('ops-table', ['df-h', 'psql', 'kubectl', 'chart.svg']),
    ('ops-listing', ['find-listing', 'ls-l-', 'git-numstat', 'git-log', 'node-stacktraces']),
    ('ops-log', ['openstack', 'node-stacktraces']),
    ('markup-sql', ['dump.sql']),
    ('temporal-table', ['vix', 'aapl', 'csv-8', 'sp500']),
]
FRONT = ['daedalus', 'daedalus-dual', 'phalanx-a10', 'dendron', 'dendrons', 'gramma', 'akolouthia2', 'paradeigma']
def cat_of(f):
    for name, keys in CATS:
        if any(k in f for k in keys):
            return name
    return 'other'
rows_out = []
for f in sorted(data):
    d = data[f]
    cands = {k: d[k] for k in FRONT if isinstance(d.get(k), int)}
    if not cands:
        continue
    best_key = min(cands, key=lambda k: cands[k])
    best = cands[best_key]
    h = hemera.get(f)
    hM = h['M'] if h and isinstance(h.get('M'), int) else None
    rows_out.append({'file': f, 'category': cat_of(f), 'raw': d.get('raw'), 'daedalus': d.get('daedalus'),
                     'daedalus-dual': d.get('daedalus-dual'), 'A10': d.get('phalanx-a10'), 'DENDRON': d.get('dendron'),
                     'DENS-2': d.get('dendrons'), 'AKOLOUTHIA-2': d.get('akolouthia2'), 'PARADEIGMA': d.get('paradeigma'),
                     'frontier_min': best, 'frontier_leader': best_key,
                     'hemera_M': hM, 'hemera_arm': h.get('arm') if h else None,
                     'hemera_vs_frontier': (hM - best) if hM is not None else None})
json.dump(rows_out, open(os.path.join(ROOT, 'bench/z59/receipts/leaders.json'), 'w'), indent=1)
print('file\tcategory\tdaedalus\tA10\tDENS-2\tDENDRON\tAKOLOUTHIA-2\tPARADEIGMA\tfrontier_min(leader)\themera_M(arm)\themera-frontier')
for r in rows_out:
    hm = f"{r['hemera_M']}({r['hemera_arm']})" if r['hemera_M'] is not None else '-'
    print('\t'.join(str(x) for x in [os.path.basename(r['file']), r['category'], r['daedalus'], r['A10'], r['DENS-2'],
          r['DENDRON'], r['AKOLOUTHIA-2'], r['PARADEIGMA'], f"{r['frontier_min']}({r['frontier_leader']})", hm,
          r['hemera_vs_frontier'] if r['hemera_vs_frontier'] is not None else '-']))
