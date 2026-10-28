#!/usr/bin/env python3
"""X53 probe7 v11 (final geometry): header anchors + aligns + gaps, push-right.
L: start = max(hs_j, prev_end + g_{j-1}); R: end = max(he_j, prev_end + g_{j-1} + len).
gaps fitted deterministically per transition; aligns by DFS; render verified."""
import sys, re

def parse_v11(lines):
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

    def fit_gap(j, a):
        # returns gap g (into column j) or None; uses observed prev ends E[:,j-1]
        if j == 0:
            return 0 if all((S[i][0] == hs[0]) if a == 'L' else (E[i][0] == he[0]) for i in range(m)) else None
        if a == 'L':
            needs = [S[i][j] - E[i][j - 1] for i in range(m)]
            pushed = [needs[i] for i in range(m) if S[i][j] > hs[j]]
            g = max(pushed) if pushed else min(needs)
            if g < 1 or g > min(needs): return None
            if all(S[i][j] == max(hs[j], E[i][j - 1] + g) for i in range(m)): return g
            return None
        else:
            needs = [E[i][j] - E[i][j - 1] - LEN[i][j] for i in range(m)]
            pushed = [needs[i] for i in range(m) if E[i][j] > he[j]]
            g = max(pushed) if pushed else min(needs)
            if g < 1 or g > min(needs): return None
            if all(E[i][j] == max(he[j], E[i][j - 1] + g + LEN[i][j]) for i in range(m)): return g
            return None

    sys.setrecursionlimit(100000)
    def dfs(j, aligns, gaps):
        if j == n: return aligns, gaps
        for a in (['L'] if j == n - 1 else ['L', 'R']):
            g = fit_gap(j, a)
            if g is None: continue
            r = dfs(j + 1, aligns + [a], gaps + ([g] if j > 0 else []))
            if r: return r
        return None

    res = dfs(0, [], [])
    if not res: return None
    aligns, gaps = res

    def render(cell_rows):
        out = []
        for cells in cell_rows:
            buf = ''; prev_end = 0
            for j in range(n):
                c = cells[j]
                if aligns[j] == 'R':
                    end = max(he[j], (prev_end + gaps[j - 1] + len(c)) if j > 0 else he[j])
                    start = end - len(c)
                else:
                    start = max(hs[j], (prev_end + gaps[j - 1]) if j > 0 else hs[j])
                    end = start + len(c)
                buf += ' ' * (start - len(buf)) + c
                prev_end = end
            out.append(buf)
        return out

    if render(allrows) != lines: return None
    return hdr, allrows[1:], aligns, gaps, hs, he, render

if __name__ == '__main__':
    for path in sys.argv[1:]:
        text = open(path, encoding='utf-8', errors='replace').read()
        lines = text.split('\n')
        while lines and lines[-1] == '': lines.pop()
        p = parse_v11(lines)
        print(path, ('OK aligns=%s gaps=%s' % (''.join(p[2]), p[3])) if p else 'FAIL')
