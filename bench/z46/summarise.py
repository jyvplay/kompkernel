#!/usr/bin/env python3
"""Z46 receipts -> bench/z46/receipts/SUMMARY.md (reads the harness jsonl files; DAEDALUS rows come from the same runs)."""
import json, os, sys
R = 'bench/z46/receipts'
def load(name):
    p = os.path.join(R, name)
    return [json.loads(l) for l in open(p)] if os.path.exists(p) else []
def table(rows, title, base_rows=None):
    by = {}
    for r in rows + (base_rows or []):
        by.setdefault(r['file'], {})[r['key']] = r
    out = [f'### {title}', '', '| file | raw | DAEDALUS | ENTHYMEME | Δ | Δ% | exact | note |', '|---|---:|---:|---:|---:|---:|:--:|---|']
    tr = td = te = 0; n = 0; wins = 0; ties = 0; losses = 0
    for f, d in sorted(by.items()):
        if 'daedalus' not in d or 'enthymeme' not in d: continue
        a, b = d['daedalus'], d['enthymeme']
        n += 1; tr += a['inTokens']; td += a['oneChat']; te += b['oneChat']
        delta = b['oneChat'] - a['oneChat']
        wins += delta < 0; ties += delta == 0; losses += delta > 0
        note = b['note']
        short = note.split(';')[0] + (' ' + note.split(';')[1].strip() if 'rules=' in note else '')
        out.append(f"| {f.split('/')[-1]} | {a['inTokens']} | {a['oneChat']} | {b['oneChat']} | {delta:+d} | {delta/a['oneChat']*100:+.1f}% | {'yes' if a['exact'] and b['exact'] else 'NO'} | {short} |")
    if n:
        out.append(f"| **total ({n} files)** | **{tr}** | **{td}** | **{te}** | **{te-td:+d}** | **{(te-td)/td*100:+.1f}%** | | wins {wins} / ties {ties} / losses {losses} |")
    out.append('')
    return out, (n, tr, td, te, wins, ties, losses)
lines = ['# Z46 — ENTHYMEME receipts (o200k_base, OMEGA_DET=1, codec-eval harness; every row round-trip checked)', '']
tot = []
for name, title in [('eval-traces.jsonl', 'JVM stack traces — 10 real GitHub issue bodies (bench/z46/corpus/traces)'),
                    ('eval-toc.jsonl', 'Markdown documents with heading links — 6 real READMEs, first 24 KB (bench/z46/corpus/toc)'),
                    ('eval-lanes.jsonl', 'Shipped lanes — 22 files (prose, code, JSON, licence, real ops); DAEDALUS rows from bench/z45/receipts/eval-lanes.jsonl'),
                    ('eval-negative.jsonl', 'Negative-space lanes — PHP/.NET traces (rules must not fire or must not lose)')]:
    rows = load(name)
    base = [r for r in load('../../z45/receipts/eval-lanes.jsonl') if r['key'] == 'daedalus'] if name == 'eval-lanes.jsonl' else None
    if not rows: continue
    t, s = table(rows, title, base)
    lines += t; tot.append((title, s))
lines.append('### Exactness')
allrows = [r for n in ['eval-traces.jsonl', 'eval-toc.jsonl', 'eval-lanes.jsonl', 'eval-negative.jsonl'] for r in load(n)]
lines.append(f"{sum(1 for r in allrows if r['exact'])} of {len(allrows)} rows byte-exact; {sum(1 for r in allrows if r.get('error'))} errors.")
open(os.path.join(R, 'SUMMARY.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
