#!/usr/bin/env python3
# Z35: character-level candidate generation for the global selection test.
# Candidates: substrings of the escaped text, length LMIN..LMAX, with >= 2 non-overlapping occurrences.
# Output: candidates.json = [{'s': str, 'occ': [start,...]}] (occurrences greedily non-overlapping, left to right).
import json, sys
text_path, out_path = sys.argv[1], sys.argv[2]
LMIN = int(sys.argv[3]) if len(sys.argv) > 3 else 4
LMAX = int(sys.argv[4]) if len(sys.argv) > 4 else 40
raw = open(text_path, encoding='utf-8').read()
t = raw.replace('~', '~~')  # escaped body, same as escBody
# JavaScript string indices are UTF-16 code units: index the body in code units, not code points.
U = t.encode('utf-16-le')
N = len(U) // 2
cands = []
for L in range(LMIN, LMAX + 1):
    d = {}
    for i in range(N - L + 1):
        b = U[2 * i:2 * (i + L)]
        try:
            s = b.decode('utf-16-le')
        except UnicodeDecodeError:
            continue  # splits a surrogate pair
        if '~' in s:
            continue
        d.setdefault(b, []).append(i)
    for b, occ in d.items():
        s = b.decode('utf-16-le')
        L = len(b) // 2
        if len(occ) < 2:
            continue
        # non-overlapping occurrences
        nov = []
        last = -10**9
        for i in occ:
            if i >= last + L:
                nov.append(i)
                last = i
        if len(nov) >= 2:
            cands.append({'s': s, 'occ': nov})
json.dump(cands, open(out_path, 'w'))
print(json.dumps({'file': text_path, 'N_units': N, 'candidates': len(cands), 'occurrences': sum(len(c['occ']) for c in cands)}))
