#!/usr/bin/env python3
"""X20: build the per-lane leader table from receipts only (no measurement here).

inputs
  bench/x20/receipts/frontier-A.jsonl, frontier-B.jsonl   one row per (lane, codec)
  bench/x20/receipts/typos-28-final.jsonl                 one row per lane for TYPOS
  bench/x20/receipts/typos-28.jsonl                       superseded run, used only if the
                                                          final run is missing a lane
output
  bench/x20/receipts/leaders-x20.tsv
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FRONTIER_KEYS = ['dendrons', 'dendron', 'daedalus', 'daedalus-dual', 'akolouthia2', 'phalanx-a10']
CHAIN_KEYS = ['lakonikos-d', 'stathmos']

cells = {}   # lane -> key -> value ('-' for timeout/inexact)
for name in ('frontier-A.jsonl', 'frontier-B.jsonl'):
    p = os.path.join(ROOT, 'bench/x20/receipts', name)
    if not os.path.exists(p):
        continue
    for line in open(p, encoding='utf-8'):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        row = d.get('row') or {}
        lane = row.get('file')
        if not lane:
            continue
        key = d['key']
        v = row.get(key)
        cells.setdefault(lane, {})[key] = v if isinstance(v, int) else '-'

typos = {}
for name in ('typos-28-final.jsonl', 'typos-28.jsonl'):
    p = os.path.join(ROOT, 'bench/x20/receipts', name)
    if not os.path.exists(p):
        continue
    for line in open(p, encoding='utf-8'):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        if d.get('TOTAL') or 'lane' not in d:
            continue
        if d['lane'] not in typos:
            typos[d['lane']] = d


def category(lane):
    b = os.path.basename(lane)
    if lane.startswith('bench/holdout-lang') or lane.startswith('bench/holdout-work') or b in (
            'readme.txt', 'llm-answer.md'):
        return 'prose'
    if b.endswith('.csv'):
        return 'temporal-table'
    if lane.startswith('bench/holdout-tbl') or b.startswith('ops-df') or b.startswith('df-'):
        return 'ops-table'
    if lane.startswith('bench/holdout-ops') or b.startswith('ops-') or b.startswith('git-') or b.startswith('find-') or b.startswith('ls-'):
        return 'ops-listing'
    if lane.startswith('bench/holdout-mk') or b.endswith('.log') or b.endswith('.sql') or b.endswith('.svg'):
        return 'markup-log'
    return 'other'


lanes = sorted(cells)
cols = FRONTIER_KEYS + CHAIN_KEYS + ['typos']
out = ['\t'.join(['lane', 'category', 'raw'] + [c.replace('daedalus-dual', 'DAED-D').replace('phalanx-a10', 'A10').replace('akolouthia2', 'AKOL-2') for c in cols] + ['frontierMin', 'frontierLeader', 'stackMin', 'stackLeader', 'typosVsFrontier', 'typosVsStack'])]
tally = {}
for lane in lanes:
    row = cells[lane]
    vals = []
    for c in cols:
        v = row.get(c, '-')
        if c == 'typos':
            t = typos.get(lane)
            v = t['typos'] if t and t.get('exact') else '-'
        vals.append(v)
    nums = [(c, v) for c, v in zip(cols, vals) if isinstance(v, int)]
    fr = [(c, v) for c, v in nums if c in FRONTIER_KEYS]
    fmin = min(v for _, v in fr) if fr else None
    flead = [c for c, v in fr if v == fmin][0] if fr else '-'
    smin = min(v for _, v in nums) if nums else None
    slead = [c for c, v in nums if v == smin][0] if nums else '-'
    tv = next((v for c, v in nums if c == 'typos'), None)
    df = (tv - fmin) if (tv is not None and fmin is not None) else ''
    ds = (tv - smin) if (tv is not None and smin is not None) else ''
    if tv is not None and fmin is not None:
        tally.setdefault(slead, 0)
        tally[slead] = tally.get(slead, 0) + 1
    out.append('\t'.join([lane, category(lane), str(row.get('raw', '-'))] + [str(v) for v in vals] +
                         [str(fmin), flead, str(smin), slead, str(df), str(ds)]))

path = os.path.join(ROOT, 'bench/x20/receipts/leaders-x20.tsv')
with open(path, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(out) + '\n')
print('\n'.join(out))
print()
print('leader tally over measured lanes:', json.dumps(tally, sort_keys=True))
