#!/usr/bin/env python3
"""X123 ΠΛΑΤΟΣ feasibility transform: column-width model for space-padded record sets.

Writes, for each lane, three files under /tmp/platos/:
  <lane>.orig   the untouched lane
  <lane>.depad  the record block de-padded (fields joined by ONE space)
  <lane>.del    the record block de-padded with every CONSTANT column deleted

Every variant is verified byte-exact against the original by re-padding, so a
variant file that exists is a proven-invertible transform.  Nothing here counts
tokens; the TS bench bench/x123/platos-probe.ts does that.
"""
import os, re, json

OUT = '/tmp/platos'
os.makedirs(OUT, exist_ok=True)

LANES = [
    'bench/holdout-x41/ls-l-real.txt',
    'bench/holdout-x41/ls-real.txt',
    'bench/holdout-x41/ps-aux-real.txt',
    'bench/holdout-x41/ps-real.txt',
    'bench/holdout-x42/ps-ef.txt',
    'bench/holdout-x42/dpkg-l.txt',
    'bench/holdout-x42/findmnt.txt',
    'bench/holdout-tbl/kubectl-get-pods.txt',
    'bench/holdout-tbl/df-h.txt',
    'bench/holdout-x41/df-real.txt',
    'bench/holdout-x42b/vmstat.txt',
    'bench/holdout-x42b/free-m.txt',
    'bench/holdout-x41/du-real.txt',
    'bench/holdout-x42/lsblk.txt',
    'bench/holdout-tbl/psql-output.txt',
    'bench/holdout-x41/apt-real.txt',
    'bench/holdout-x42b/uptime-w.txt',
]

MIN_ROWS = 8


def pat_for(n):
    return re.compile(r'^(' + r')\s+('.join([r'\S+'] * (n - 1)) + r')\s+(\S.*)$')


def fit_model(lines, idx, n):
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
    cs = [len(set(S[r][c] for r in range(m0))) == 1 for c in range(n)]
    ce = [len(set(E[r][c] for r in range(m0))) == 1 for c in range(n)]
    A, B, aligns = [0] * (n - 1), [0] * (n - 1), ['L'] * (n - 1)
    A[0] = 0
    for c in range(n - 1):
        if ce[c]:
            B[c] = E[0][c]
        elif c + 1 < n and cs[c + 1]:
            B[c] = S[0][c + 1] - 1
        else:
            return None
        if B[c] < A[c]:
            return None
        if cs[c] and S[0][c] == A[c]:
            aligns[c] = 'L'
        elif ce[c] and E[0][c] == B[c]:
            aligns[c] = 'R'
        else:
            return None
        if c + 1 <= n - 2:
            A[c + 1] = B[c] + 1
    widths = [B[c] - A[c] for c in range(n - 1)]
    if any(w <= 0 for w in widths):
        return None
    return rows, widths, aligns


def rebuild(row, widths, aligns):
    out = []
    n = len(row)
    for c in range(n - 1):
        v = row[c]
        out.append(v.ljust(widths[c]) if aligns[c] == 'L' else v.rjust(widths[c]))
        out.append(' ')
    out.append(row[n - 1])
    return ''.join(out)


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
        for drop in (0, 1, 2):
            s = seg[drop:] if drop else seg
            s = s[:-1] if drop == 2 and len(s) > MIN_ROWS else s
            if len(s) < MIN_ROWS:
                continue
            f = fit_model(lines, s, n)
            if not f:
                continue
            rows, widths, aligns = f
            if all(rebuild(rows[k], widths, aligns) == lines[s[k]] for k in range(len(rows))):
                if best is None or len(rows) > len(best[2]):
                    best = (rows, widths, aligns, s)
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
            rows, widths, aligns, idx = f
            const = [c for c in range(n - 1) if len(set(r[c] for r in rows)) == 1]
            mass = sum(len(rows[0][c]) + 1 for c in const) * len(rows)
            key = (mass, len(rows) * n)
            if best is None or key > best[0]:
                best = (key, dict(path=path, lines=lines, eol=eol, idx=idx, rows=rows,
                                  n=n, widths=widths, aligns=aligns, const=const, mass=mass))
    return None if best is None else best[1]


def write_variants(sol):
    name = os.path.basename(sol['path'])
    lines, eol, idx, rows = sol['lines'], sol['eol'], sol['idx'], sol['rows']
    n, widths, aligns, const = sol['n'], sol['widths'], sol['aligns'], sol['const']
    depad, dele = list(lines), list(lines)
    keep = [c for c in range(n) if c not in const]
    for k, i in enumerate(idx):
        depad[i] = ' '.join(rows[k])
        dele[i] = ' '.join(rows[k][c] for c in keep)
    open(f'{OUT}/{name}.orig', 'w').write(eol.join(lines))
    open(f'{OUT}/{name}.depad', 'w').write(eol.join(depad))
    open(f'{OUT}/{name}.del', 'w').write(eol.join(dele))
    return dict(lane=name, rows=len(rows), cols=n, constCols=const,
                constVals=[rows[0][c] for c in const],
                constMass=sol['mass'], widths=widths, aligns=''.join(aligns),
                blockChars=sum(len(lines[i]) for i in idx),
                depadChars=sum(len(depad[i]) for i in idx),
                delChars=sum(len(dele[i]) for i in idx))


out = []
for p in LANES:
    s = solve(p)
    if s is None:
        print(f'{os.path.basename(p):26} NO FIT')
        continue
    m = write_variants(s)
    out.append(m)
    print(f"{m['lane']:26} rows={m['rows']:4} cols={m['cols']:2} const={m['constCols']} "
          f"vals={[v[:12] for v in m['constVals']]} mass={m['constMass']:6} "
          f"block={m['blockChars']:6} depad={m['depadChars']:6} del={m['delChars']:6} "
          f"w={m['widths']} a={m['aligns']}")
json.dump(out, open('bench/x123/receipts/depad.json', 'w'), indent=1)
