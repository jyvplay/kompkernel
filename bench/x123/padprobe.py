#!/usr/bin/env python3
"""X123 padded-record-set probe. Zero encoder calls, zero token counting.

For each lane: gap-vote column boundaries over the data lines, split every row
into fixed columns, and report how much of the file is constant / above-predictable
per column. This decides whether a column-width side-stream (ΠΛΑΤΟΣ) is worth
building at all.
"""
import sys, json
from collections import Counter

LANES = [
    'bench/holdout-x41/ls-l-real.txt',
    'bench/holdout-x41/ps-aux-real.txt',
    'bench/holdout-x41/apt-real.txt',
    'bench/holdout-x42/dpkg-l.txt',
    'bench/holdout-x42/findmnt.txt',
    'bench/holdout-x41/ls-real.txt',
    'bench/holdout-x41/ps-real.txt',
    'bench/holdout-x42/ps-ef.txt',
    'bench/holdout-tbl/kubectl-get-pods.txt',
    'bench/holdout-tbl/df-h.txt',
    'bench/holdout-x41/df-real.txt',
    'bench/holdout-x41/du-real.txt',
    'bench/holdout-x42b/vmstat.txt',
    'bench/holdout-x42b/free-m.txt',
    'bench/holdout-x42/lsblk.txt',
    'bench/holdout-work/llm-answer.md',
]


def gapvote(rows, thresh):
    n = max(len(r) for r in rows)
    cnt = [0] * n
    for r in rows:
        for i, ch in enumerate(r):
            if ch == ' ':
                cnt[i] += 1
    m = len(rows)
    return [i for i in range(n) if cnt[i] >= thresh * m]


def cols_of(bounds, width):
    """Turn boundary positions into [start,end) column spans."""
    spans = []
    prev = 0
    for b in bounds:
        if b > prev:
            spans.append((prev, b))
        prev = b + 1
    if prev < width:
        spans.append((prev, width))
    return spans


def split_row(r, spans):
    out = []
    for (a, b) in spans:
        out.append(r[a:b] if a < len(r) else '')
    return out


def probe(path, thresh=0.85, minrows=6):
    text = open(path, encoding='utf-8', errors='replace').read()
    lines = text.split('\n')
    # candidate data lines: non-empty, no leading '#'
    cand = [i for i, l in enumerate(lines) if l.strip() and not l.startswith('#')]
    if len(cand) < minrows:
        return None
    rows = [lines[i] for i in cand]
    bounds = gapvote(rows, thresh)
    if len(bounds) < 2:
        return None
    spans = cols_of(bounds, max(len(r) for r in rows))
    if len(spans) < 3:
        return None
    # a row must actually fit the skeleton: no column except the last may contain
    # an internal space at a non-boundary position... instead verify by rejoin
    grid = [split_row(r, spans) for r in rows]
    # drop columns that are entirely empty
    keep = [c for c in range(len(spans)) if any(g[c] != '' for g in grid)]
    if len(keep) < 3:
        return None
    spans = [spans[c] for c in keep]
    grid = [[g[c] for c in keep] for g in grid]
    ncols = len(spans)
    total = sum(len(r) for r in rows)
    stats = []
    const_chars = 0
    above_chars = 0
    for c in range(ncols):
        vals = [g[c] for g in grid]
        distinct = len(set(vals))
        mass = sum(len(v) for v in vals)
        above = sum(1 for i in range(1, len(vals)) if vals[i] == vals[i - 1])
        stats.append({'col': c, 'span': spans[c], 'distinct': distinct,
                      'mass': mass, 'above': above,
                      'example': vals[0][:24]})
        if distinct == 1:
            const_chars += mass
        if above >= len(vals) - 2:
            above_chars += mass
    return {'path': path, 'rows': len(rows), 'cols': ncols,
            'bounds': bounds, 'spans': spans, 'totalChars': total,
            'constChars': const_chars, 'aboveChars': above_chars,
            'stats': stats, 'sample': grid[:3]}


out = []
for p in LANES:
    r = probe(p)
    if r is None:
        print(f'{p}: no skeleton')
        continue
    print(f"\n=== {p}  rows={r['rows']} cols={r['cols']} chars={r['totalChars']} "
          f"constMass={r['constChars']} ({100*r['constChars']/r['totalChars']:.1f}%) "
          f"aboveMass={r['aboveChars']} ({100*r['aboveChars']/r['totalChars']:.1f}%)")
    print('   bounds', r['bounds'])
    for s in r['stats']:
        print(f"   col{s['col']:2} span{s['span']} dist={s['distinct']:4} above={s['above']:4} "
              f"mass={s['mass']:6} ex={s['example']!r}")
    out.append(r)
json.dump(out, open('bench/x123/receipts/padprobe.json', 'w'), indent=1)
