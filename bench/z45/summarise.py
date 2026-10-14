#!/usr/bin/env python3
"""Z45: build bench/z45/receipts/SUMMARY.md from eval-lanes.jsonl + eval-canon.jsonl (+ xcheck-summary.txt)."""
import json, os, re, collections
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'receipts')

def load(name):
    p = os.path.join(R, name)
    if not os.path.exists(p): return []
    return [json.loads(l) for l in open(p, encoding='utf-8') if l.strip()]

def pair(rows):
    by = collections.OrderedDict()
    for r in rows:
        by.setdefault(r['file'], {})[r['key']] = r
    return [(f, d['daedalus'], d['anagnorisis']) for f, d in by.items() if 'daedalus' in d and 'anagnorisis' in d]

def refs_of(note):
    m = re.search(r'refs=(.*?); tiers=', note)
    return m.group(1) if m else ''

def tiers_of(note):
    m = re.search(r'tiers=(.*?); regions=', note)
    return m.group(1) if m else '-'

out = ['# Z45 receipts summary (o200k_base, OMEGA_DET=1, one-chat cost = contract + wire)', '']
for title, name in [('Shipped lanes (must be a no-op without canonical text)', 'eval-lanes.jsonl'), ('Fresh canon corpus (88 LICENSE files + 44 headered sources, files ≤ 80 KB)', 'eval-canon.jsonl')]:
    rows = pair(load(name))
    if not rows: continue
    out += [f'## {title}', '', f'`{name}` — {len(rows)} files', '', '| file | raw | DAEDALUS | ANAGNORISIS | Δ | Δ% of raw | exact | reference(s) | tier |', '|---|---:|---:|---:|---:|---:|---|---|---|']
    tot_raw = tot_d = tot_a = 0
    applied = 0; exact_all = True
    tier_count = collections.Counter(); mode_count = collections.Counter()
    for f, d, a in rows:
        short = '/'.join(f.split('/')[-2:])
        delta = a['oneChat'] - d['oneChat']
        tot_raw += a['inTokens']; tot_d += d['oneChat']; tot_a += a['oneChat']
        refs = refs_of(a['note']); tiers = tiers_of(a['note'])
        if 'applied=true' in a['note']:
            applied += 1
            for t in tiers.split(','): tier_count[t] += 1
            mode_count['reflow' if ('wrap ' in refs or 'unwrapped' in refs) else 'exact'] += 1
        exact_all = exact_all and bool(a['exact']) and bool(d['exact'])
        refs_md = refs.replace('|', '\\|') or '-'
        out.append(f"| {short} | {a['inTokens']} | {d['oneChat']} | {a['oneChat']} | {delta} | {100.0 * delta / a['inTokens']:.1f}% | {a['exact']}/{d['exact']} | {refs_md} | {tiers} |")
    out += ['', f'**Totals:** raw {tot_raw}, DAEDALUS {tot_d}, ANAGNORISIS {tot_a} (Δ {tot_a - tot_d}, {100.0 * (tot_a - tot_d) / max(1, tot_d):.1f}% of the DAEDALUS total); applied on {applied}/{len(rows)} files; all rows exact: {exact_all}.']
    if applied:
        out.append(f'References by catalogue tier: {dict(tier_count)}; by layout mode: {dict(mode_count)}.')
    out.append('')
x = os.path.join(R, 'xcheck-summary.txt')
if os.path.exists(x):
    out += ['## Independent CPython reader (bench/anagnorisis_decode.py)', '', '```', open(x, encoding='utf-8').read().rstrip(), '```', '']
open(os.path.join(R, 'SUMMARY.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('\n'.join(l for l in out if l.startswith('**Totals') or l.startswith('References') or l.startswith('## ')))
