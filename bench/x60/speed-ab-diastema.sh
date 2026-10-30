#!/usr/bin/env bash
# Reproduce X60 Set-membership A/B against the source as of X60 start.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
BASELINE=src/lib/omega/diastema.before.ts
cleanup() { rm -f "$BASELINE"; }
trap cleanup EXIT
# d7b204a is the X60 code tip before the Set-membership optimization.
git show d7b204a:src/lib/omega/diastema.ts > "$BASELINE"
npx esbuild bench/x60/speed-plan-before.ts --bundle --platform=node --format=esm --outfile=/tmp/x60-diastema-before.mjs --log-level=error
npx esbuild bench/x60/speed-plan-after.ts --bundle --platform=node --format=esm --outfile=/tmp/x60-diastema-after.mjs --log-level=error
npx esbuild bench/x60/speed-codec-before.ts --bundle --platform=node --format=esm --outfile=/tmp/x60-di-codec-before.mjs --log-level=error
npx esbuild bench/x60/speed-codec-after.ts --bundle --platform=node --format=esm --outfile=/tmp/x60-di-codec-after.mjs --log-level=error
node /tmp/x60-diastema-before.mjs bench/z52/lanes/sysctl-proc.txt > bench/x60/receipts/diastema-plan-before.json
node /tmp/x60-diastema-after.mjs bench/z52/lanes/sysctl-proc.txt > bench/x60/receipts/diastema-plan-after.json
OMEGA_DET=1 timeout 800 node /tmp/x60-di-codec-before.mjs bench/holdout-x40/metrics.tsv > bench/x60/receipts/diastema-codec-before.json
OMEGA_DET=1 timeout 800 node /tmp/x60-di-codec-after.mjs bench/holdout-x40/metrics.tsv > bench/x60/receipts/diastema-codec-after.json
python3 - <<'PY'
import json, statistics
for path in ('bench/x60/receipts/diastema-plan-before.json', 'bench/x60/receipts/diastema-plan-after.json'):
    d = json.load(open(path))
    print(d['version'], 'plan sha=', d['sha'], 'times=', d['times'], 'median=', statistics.median(d['times']), 'exact=', d['exact'])
for path in ('bench/x60/receipts/diastema-codec-before.json', 'bench/x60/receipts/diastema-codec-after.json'):
    print(open(path).read().strip())
PY
