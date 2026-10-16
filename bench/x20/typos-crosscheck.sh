#!/usr/bin/env bash
# X20: cross-check the TYPOS wires with the independent CPython reader.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
bash bench/x20/run.sh bench/x20/typos-emit.ts "$@" || exit 1
python3 bench/typos_decode.py bench/x20/receipts/typos-messages.json bench/x20/receipts/typos-py.json || exit 1
python3 - <<'PY'
import json
exp = json.load(open('bench/x20/receipts/typos-expected.json', encoding='utf-8'))
got = json.load(open('bench/x20/receipts/typos-py.json', encoding='utf-8'))
meta = json.load(open('bench/x20/receipts/typos-meta.json', encoding='utf-8'))
bad = 0
for i, (e, g) in enumerate(zip(exp, got)):
    ok = g['decoded'] == e
    if not ok:
        bad += 1
        print('MISMATCH', meta[i]['lane'], 'rule', g['rule'])
    else:
        print('ok  %-46s rule=%-9s shapes=%s' % (meta[i]['lane'].split('/')[-1], g['rule'], ','.join(g['shapes'])))
print('CPython reader: %d/%d exact' % (len(exp) - bad, len(exp)))
PY
