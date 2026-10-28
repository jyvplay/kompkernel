#!/usr/bin/env python3
"""X53 probe6 v8: header-anchored geometry with fitted R-widths.
Anchors from header line: hs_j (word start, for L), he_j (word end, for R).
R column j has width W_j >= he_j-hs_j; base field start = he_j - W_j.
Per line shift starts 0; after each field, shift grows so next field starts
exactly g_j spaces after this cell's end. DFS fit + byte-exact render verify."""
import sys, re, math
from fractions import Fraction

def parse_aligned(lines):
    if len(lines) < 3: return None
    if any(l != l.rstrip() for l in lines): return None
    hm = list(re.finditer(r'\S+', lines[0]))
    hdr = [x.group() for x in hm]
    n = len(hdr)
    if n < 3: return None
    hs = [x.start() for x in hm]; he = [x.end() for x in hm]
    spans = []
    for ln in lines:
        ms = list(re.finditer(r'\S+', ln))
        if len(ms) < n: return None
        cells = [(ms[j].group(), ms[j].start(), ms[j].end()) for j in range(n - 1)]
        cells.append((ln[ms[n - 1].start():], ms[n - 1].start(), len(ln)))
        spans.append(cells)
    if [c[0] for c in spans[0]] != hdr: return None
    m = len(lines)
    allrows = [[c[0] for c in spans[i]] for i in range(m)]
    S = [[spans[i][j][1] for j in range(n)] for i in range(m)]
    E = [[spans[i][j][2] for j in range(n)] for i in range(m)]
    LEN = [[len(allrows[i][j]) for j in range(n)] for i in range(m)]
    sys.setrecursionlimit(100000)

    def base_start(j, a, W):
        return hs[j] if a == 'L' else he[j] - W

    def F_of(j, a, W):
        if a == 'L': return [S[i][j] for i in range(m)]
        return [E[i][j] - max(W, LEN[i][j]) for i in range(m)]

    def dfs(j, shifts, prev_ends, aligns, gaps, Ws):
        if j == n: return aligns, gaps, Ws
        if j == n - 1:
            cands = [('L', 0)]
        else:
            maxlen = max(LEN[i][j] for i in range(m))
            lo = he[j] - hs[j]
            cands = [('L', 0)] + [('R', W) for W in range(lo, max(lo, maxlen) + 33)]
        for a, W in cands:
            F = F_of(j, a, W)
            bs = base_start(j, a, W)
            new_shifts = [F[i] - bs for i in range(m)]
            if j == 0:
                if any(s != 0 for s in new_shifts): continue
                r = dfs(1, new_shifts, [E[i][0] for i in range(m)], aligns + [a], gaps, Ws + [W])
                if r: return r
            else:
                g = min(F[i] - prev_ends[i] for i in range(m))
                if g < 1: continue
                if not all(new_shifts[i] == max(0, prev_ends[i] + g - bs) for i in range(m)): continue
                r = dfs(j + 1, new_shifts, [E[i][j] for i in range(m)], aligns + [a], gaps + [g], Ws + [W])
                if r: return r
        return None

    res = dfs(0, [0] * m, [0] * m, [], [], [])
    if not res: return None
    aligns, gaps, Ws = res

    def render(cell_rows):
        out = []
        for cells in cell_rows:
            buf = ''; shift = 0; prev_end = 0
            for j in range(n):
                bs = base_start(j, aligns[j], Ws[j])
                if j > 0: shift = max(0, prev_end + gaps[j - 1] - bs)
                start = bs + shift
                c = cells[j]
                if aligns[j] == 'R' and j < n - 1:
                    end = start + max(Ws[j], len(c))
                    buf += ' ' * (end - len(c) - len(buf)) + c
                    prev_end = end
                else:
                    buf += ' ' * (start - len(buf)) + c
                    prev_end = start + len(c)
            out.append(buf)
        return out

    if render(allrows) != lines: return None
    return hdr, allrows[1:], aligns, gaps, Ws, hs, he, render

def solve_pct(pairs, digits=1, mode='trunc'):
    unit = Fraction(1, 10 ** digits)
    lo, hi = Fraction(0), Fraction(10**15)
    for a, c in pairs:
        mm = Fraction(c)
        if a == 0:
            if mm != 0: return None
            continue
        if mode == 'trunc':
            lo = max(lo, Fraction(100 * a) / (mm + unit))
            if mm > 0: hi = min(hi, Fraction(100 * a) / mm)
        else:
            lo = max(lo, Fraction(100 * a) / (mm + unit / 2))
            if mm - unit / 2 > 0: hi = min(hi, Fraction(100 * a) / (mm - unit / 2))
        if lo >= hi: return None
    first = math.floor(lo) + 1
    if first >= hi: return None
    return [first + k for k in range(min(5, math.ceil(hi) - first))], (float(lo), float(hi))

if __name__ == '__main__':
    for path in sys.argv[1:]:
        text = open(path, encoding='utf-8', errors='replace').read()
        lines = text.split('\n')
        while lines and lines[-1] == '': lines.pop()
        p = parse_aligned(lines)
        if not p:
            print(path, 'PARSE FAIL'); continue
        hdr, rows, aligns, gaps, Ws, hs, he, _ = p
        print(f'{path}: cols={len(hdr)} rows={len(rows)} aligns={"".join(aligns)} gaps={gaps} Ws={Ws}')
        found = []
        for j, h in enumerate(hdr):
            if not all(re.fullmatch(r'-?\d+\.\d', r[j]) for r in rows): continue
            for k, h2 in enumerate(hdr):
                if k == j: continue
                try: pairs = [(int(r[k]), r[j]) for r in rows]
                except Exception: continue
                for mode in ('trunc', 'round'):
                    sol = solve_pct(pairs, 1, mode)
                    if sol: found.append((h, h2, mode, sol)); break
        for f in found: print('  derived:', f)
        if found:
            j = hdr.index(found[0][0])
            red = [' '.join(c for x, c in enumerate(hdr) if x != j)]
            for r in rows: red.append(' '.join(c for x, c in enumerate(r) if x != j))
            outp = '/tmp/taxis-reduced-' + path.split('/')[-1]
            open(outp, 'w', encoding='utf-8').write('\n'.join(red) + '\n')
            print('  reduced ->', outp)
