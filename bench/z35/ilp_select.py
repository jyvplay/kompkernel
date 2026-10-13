#!/usr/bin/env python3
# Z35: global dictionary selection as an integer program (exact-occurrence model, flat dictionary, no nesting).
# Input: token strings of the escaped body (bench/z35 dump). Output: chosen phrases and occurrence starts.
# Objective (estimated, verified later by exact wire counting in TypeScript):
#   maximize sum_{chosen occ} (w-1)  -  sum_{defined phrase} (w+2)
# Constraints: token coverage <= 1 (non-overlapping replaced spans); occurrence => phrase defined;
#   defined phrase => >= 2 replaced occurrences; <= KEYS phrases.
import json, sys, time
import pulp
from collections import defaultdict

W = int(sys.argv[1]) if len(sys.argv) > 1 else 8
TL = int(sys.argv[2]) if len(sys.argv) > 2 else 240
KEYS = 240
src, dst = sys.argv[3], sys.argv[4]
targets = sys.argv[5:] if len(sys.argv) > 5 else None
out = []
for line in open(src):
    r = json.loads(line)
    if targets and r['file'] not in targets:
        continue
    toks = r['toks']
    N = len(toks)
    occ = defaultdict(list)
    for i in range(N):
        s = ''
        for w in range(1, W + 1):
            if i + w > N:
                break
            s += toks[i + w - 1]
            if w >= 2 and '~' not in toks[i + w - 1] and '~' not in s:
                occ[(s, w)].append(i)
    # keep phrases that occur at least twice (token-aligned)
    cands = {k: v for k, v in occ.items() if len(v) >= 2}
    # a phrase string may appear with different w only if its token count differs; key by string
    byphrase = {}
    for (s, w), starts in cands.items():
        byphrase.setdefault(s, (w, []))[1].extend([(st, w) for st in starts])
    prob = pulp.LpProblem('dict', pulp.LpMaximize)
    ysel = {}
    xsel = {}
    cover = defaultdict(list)
    obj = []
    for p, (w, spans) in byphrase.items():
        y = pulp.LpVariable(f"y{len(ysel)}", cat='Binary')
        ysel[p] = y
        xs = []
        for st, ww in spans:
            x = pulp.LpVariable(f"x{len(xsel)}", cat='Binary')
            xsel[(p, st)] = x
            xs.append(x)
            prob += x <= y
            for k in range(st, st + ww):
                cover[k].append(x)
            obj.append((ww - 1) * x)
        # defined => at least 2 replaced occurrences
        prob += pulp.lpSum(xs) >= 2 * y
        obj.append(-(w + 2) * y)
    for k, xs in cover.items():
        prob += pulp.lpSum(xs) <= 1
    prob += pulp.lpSum(ysel.values()) <= KEYS
    prob += pulp.lpSum(obj)
    t0 = time.time()
    status = prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=TL, threads=2))
    dt = time.time() - t0
    chosen = defaultdict(list)
    wspan = {}
    for (p, st), x in xsel.items():
        if x.value() and x.value() > 0.5:
            ww = [w0 for (st0, w0) in byphrase[p][1] if st0 == st][0]
            chosen[p].append((st, ww))
    sel = [{'phrase': p, 'starts': sorted(st for st, _ in v), 'wspan': {str(st): ww for st, ww in v}} for p, v in chosen.items() if len(v) >= 2]
    est_saving = sum(sum(ww - 1 for _, ww in v) - (len(v) and max(ww for _, ww in v) + 2) for p, v in chosen.items() if len(v) >= 2)
    rec = {'file': r['file'], 'N': N, 'phrases_candidate': len(byphrase), 'spans_candidate': sum(len(v[1]) for v in byphrase.values()),
           'status': pulp.LpStatus[status], 'obj': pulp.value(prob.objective), 'est_saving': est_saving,
           'chosen': sel, 'solve_s': round(dt, 1), 'W': W}
    out.append(rec)
    print(json.dumps({k: v for k, v in rec.items() if k != 'chosen'}), flush=True)
json.dump(out, open(dst, 'w'))
