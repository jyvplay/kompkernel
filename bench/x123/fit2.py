#!/usr/bin/env python3
"""X123 ΠΛΑΤΟΣ model fitter, relaxed.

Model: a record line is  v_0 SP* v_1 SP* ... v_{n-1}  where v_{n-1} is the rest
of the line (it may contain spaces) and, for c < n-1, v_c sits in a column that
is either LEFT-anchored (every row's v_c starts at the same offset A_c) or
RIGHT-anchored (every row's v_c ends at the same offset B_c).  Nothing is assumed
about the width of the gap: the gap between v_{c-1} and v_c is whatever the two
anchors imply, so a variable-length left-anchored column simply pushes the next
column along, which is what `ps` output actually does.

Everything is verified: a fit is accepted only when every row reconstructs
byte-exactly.
"""
import re, json, sys

MIN_ROWS = 8
PAT = {}


def pat_for(n):
    if n not in PAT:
        PAT[n] = re.compile(r'^(' + r')\s+('.join([r'\S+'] * (n - 1)) + r')\s+(\S.*)$')
    return PAT[n]


def rebuild(row, A, B, side):
    """side[c] = 'L' or 'R' for c < n-1."""
    n = len(row)
    out = []
    for c in range(n):
        if c:
            pe = (A[c - 1] + len(row[c - 1])) if side[c - 1] == 'L' else B[c - 1]
            cs = A[c] if (c < n - 1 and side[c] == 'L') else (B[c] - len(row[c]) if c < n - 1 else pe + 1)
            out.append(' ' * (cs - pe))
        out.append(row[c])
    return ''.join(out)


def fit(lines, idx, n):
    pat = pat_for(n)
    rows, S, E = [], [], []
    for i in idx:
        m = pat.match(lines[i])
        if not m:
            return None
        rows.append(list(m.groups()))
        S.append([m.start(k + 1) for k in range(n)])
        E.append([m.end(k + 1) for k in range(n)])
    m0 = len(rows)
    A, B, side = [None] * (n - 1), [None] * (n - 1), ['L'] * (n - 1)
    for c in range(n - 1):
        cs = len(set(S[r][c] for r in range(m0))) == 1
        ce = len(set(E[r][c] for r in range(m0))) == 1
        if cs:
            A[c] = S[0][c]; side[c] = 'L'
        if ce:
            B[c] = E[0][c]
            if not cs:
                side[c] = 'R'
        if A[c] is None and B[c] is None:
            return None
        if A[c] is None:
            # right-anchored: A only needed for the gap of the NEXT column, and
            # there the previous column's END is what matters, so A is unused.
            A[c] = B[c]
    for k in range(m0):
        if rebuild(rows[k], A, B, side) != lines[idx[k]]:
            return None
    return rows, A, B, side


def longest_fit(lines, run, n):
    pat = pat_for(n)
    segs, cur = [], []
    for i in run:
        if pat.match(lines[i]):
            cur.append(i)
        else:
            if len(cur) >= MIN_ROWS:
                segs.append(cur)
            cur = []
    if len(cur) >= MIN_ROWS:
        segs.append(cur)
    best = None
    for seg in segs:
        for d0 in (0, 1, 2):
            s = seg[d0:]
            if len(s) < MIN_ROWS:
                continue
            f = fit(lines, s, n)
            if f and (best is None or len(s) > len(best[4])):
                best = (f[0], f[1], f[2], f[3], s)
    return best


def solve(path):
    text = open(path, encoding='utf-8', errors='replace').read()
    eol = '\r\n' if '\r\n' in text else '\n'
    lines = text.split(eol)
    cand = [i for i, l in enumerate(lines) if l.strip() and not l.startswith('#')]
    if len(cand) < MIN_ROWS:
        return None
    runs, cur = [], [cand[0]]
    for i in cand[1:]:
        if i == cur[-1] + 1:
            cur.append(i)
        else:
            runs.append(cur); cur = [i]
    runs.append(cur)
    best = None
    for n in range(14, 2, -1):
        for run in runs:
            if len(run) < MIN_ROWS:
                continue
            f = longest_fit(lines, run, n)
            if not f:
                continue
            rows, A, B, side, idx = f
            mass = sum(len(lines[i]) for i in idx) - sum(len(' '.join(r)) for r in rows)
            key = (mass, len(rows))
            if best is None or key > best[0]:
                best = (key, dict(path=path, lines=lines, eol=eol, idx=idx, rows=rows,
                                  n=n, A=A, B=B, side=side, mass=mass))
    return None if best is None else best[1]


if __name__ == '__main__':
    lanes = [l.strip() for l in open('bench/x109/lanes29.txt') if l.strip()]
    out = []
    for p in lanes:
        s = solve(p)
        if s is None:
            print(f'{p.split("/")[-1]:26} NO FIT')
            continue
        m = dict(lane=p.split('/')[-1], path=p, rows=len(s['rows']), cols=s['n'],
                 mass=s['mass'], side=''.join(s['side']),
                 blockChars=sum(len(s['lines'][i]) for i in s['idx']))
        out.append(m)
        print(f"{m['lane']:26} rows={m['rows']:4} cols={m['cols']:2} "
              f"padMass={m['mass']:5} ({100*m['mass']/max(1,m['blockChars']):.1f}%) side={m['side']}")
    json.dump(out, open('bench/x123/receipts/fit2.json', 'w'), indent=1)
    print('Σ padMass', sum(m['mass'] for m in out))
