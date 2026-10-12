#!/usr/bin/env python3
# Z35: character-level global selection (integer program). Model:
#   choose phrases P (<= KEYS) and non-overlapping occurrences of them in the escaped text.
#   estimated saving per occurrence: t(s) - 1 (t = exact o200k count of the phrase alone);
#   header cost per defined phrase: t(s) + 2.
#   Constraints: char coverage <= 1; occurrence => phrase defined; defined => >= 2 chosen occurrences.
# Output: chosen phrases with occurrence starts; the exact wire is built and counted in TypeScript.
import json, sys, time
import pulp

cands_path, out_path = sys.argv[1], sys.argv[2]
TL = int(sys.argv[3]) if len(sys.argv) > 3 else 300
KEYC = int(sys.argv[4]) if len(sys.argv) > 4 else 1  # assumed key cost in tokens per occurrence
MINT = int(sys.argv[5]) if len(sys.argv) > 5 else 2  # minimum phrase token count
KEYS = 240
cands = json.load(open(cands_path))
prob = pulp.LpProblem('charsel', pulp.LpMaximize)
ys, xs_all, obj, cover = [], [], [], {}
xmap = []
for ci, c in enumerate(cands):
    L = len(c['s'].encode('utf-16-le')) // 2  # UTF-16 units, as in JavaScript
    t = c['t']
    if t < MINT:
        continue
    y = pulp.LpVariable(f'y{ci}', cat='Binary')
    xs = []
    for k, st in enumerate(c['occ']):
        x = pulp.LpVariable(f'x{ci}_{k}', cat='Binary')
        xs.append(x)
        xmap.append((ci, st, x))
        prob += x <= y
        for p in range(st, st + L):
            cover.setdefault(p, []).append(x)
        obj.append((t - KEYC) * x)
    prob += pulp.lpSum(xs) >= 2 * y
    obj.append(-(t + 2) * y)
    ys.append((ci, y))
for p, xs in cover.items():
    if len(xs) > 1:
        prob += pulp.lpSum(xs) <= 1
prob += pulp.lpSum(y for _, y in ys) <= KEYS
prob += pulp.lpSum(obj)
t0 = time.time()
status = prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=TL, threads=2))
dt = time.time() - t0
chosen = {}
for ci, st, x in xmap:
    if x.value() and x.value() > 0.5:
        chosen.setdefault(ci, []).append(st)
sel = [{'phrase': cands[ci]['s'], 'starts': sorted(v)} for ci, v in chosen.items() if len(v) >= 2]
rec = {'status': pulp.LpStatus[status], 'objective': pulp.value(prob.objective), 'phrases': len(sel),
       'occurrences': sum(len(s['starts']) for s in sel), 'solve_s': round(dt, 1), 'vars': len(xmap)}
print(json.dumps(rec))
json.dump({'stats': rec, 'chosen': sel}, open(out_path, 'w'))
