#!/usr/bin/env python3
"""X53 probe4: verify %MEM=round1(100*RSS/T) on real ps lanes; emit reduced files."""
import sys
from fractions import Fraction

def parse_ps(path):
    lines = open(path, encoding='utf-8', errors='replace').read().split('\n')
    hdr = lines[0].split()
    rows = []
    for ln in lines[1:]:
        if not ln.strip(): continue
        parts = ln.split(None, len(hdr) - 1)
        if len(parts) == len(hdr): rows.append(parts)
    return hdr, rows

def solve_total(pairs):
    # pairs: (rss:int, mem:'6.6') -> T interval (Fraction) with round-half-up to 0.1
    lo, hi = Fraction(0), Fraction(10**18)
    for rss, mem in pairs:
        m = Fraction(mem)
        if rss == 0:
            if m != 0: return None
            continue
        # m-0.05 <= 100*rss/T < m+0.05  (careful m=0.0 lower bound clamp)
        a = m - Fraction(1, 20); b = m + Fraction(1, 20)
        if b <= 0: return None
        lo = max(lo, Fraction(100 * rss) / b)
        if a > 0: hi = min(hi, Fraction(100 * rss) / a)
        if lo >= hi: return None
    return (lo, hi)

for path in sys.argv[1:]:
    hdr, rows = parse_ps(path)
    try:
        im, ir = hdr.index('%MEM'), hdr.index('RSS')
    except ValueError:
        print(path, 'no %MEM/RSS'); continue
    pairs = []
    ok = True
    for r in rows:
        try: pairs.append((int(r[ir]), r[im]))
        except Exception: ok = False
    sol = solve_total(pairs) if ok else None
    print(f'{path}: rows={len(rows)} solved={sol is not None}', end='')
    if sol:
        lo, hi = sol
        # candidate integer T
        import math
        cand = [t for t in range(math.floor(lo) + 1, math.ceil(hi))][:3]
        print(f' T in ({float(lo):.1f},{float(hi):.1f}) ints~{cand}')
        # emit reduced: drop %MEM col, single-space join, keep header minus col
        red = [' '.join(h for j, h in enumerate(hdr) if j != im)]
        for r in rows: red.append(' '.join(c for j, c in enumerate(r) if j != im))
        outp = '/tmp/reduced-' + path.split('/')[-1]
        open(outp, 'w', encoding='utf-8').write('\n'.join(red) + '\n')
        print('  reduced ->', outp)
    else:
        print()
