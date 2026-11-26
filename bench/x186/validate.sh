#!/bin/sh
set -eu
# npm ci required. Run without competing CPU jobs for runtime measurements.
for task in test adversary readers worker; do
 npx esbuild "bench/x186/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x186/$task.mjs"
done
node bench/x186/test.mjs > bench/x186/receipts/test.log
node bench/x186/adversary.mjs > bench/x186/receipts/adversary.log
python3 bench/x186/run.py > bench/x186/receipts/run.log
python3 bench/x186/independent.py > bench/x186/receipts/independent.log
python3 bench/x186/native-handoff.py
npx esbuild bench/x164/frontier.ts --bundle --platform=node --format=esm --outfile=bench/x186/frontier.mjs
node --max-old-space-size=1400 bench/x186/frontier.mjs bench/x186/lanes.txt bench/x186/receipts/frontier.jsonl > bench/x186/receipts/frontier.log
node bench/x186/readers.mjs > bench/x186/receipts/readers.log
node bench/x186/speed-build.mjs
for arm in A B; do
 for task in count vector merge threshold recency; do node "bench/x186/$task-$arm.mjs" > "bench/x186/receipts/$task-$arm.log"; done
done
for task in count vector merge threshold recency; do cmp "bench/x186/receipts/$task-A.log" "bench/x186/receipts/$task-B.log"; done
python3 bench/x186/runtime-run.py > bench/x186/receipts/runtime.log
npx tsc --noEmit > bench/x186/receipts/tsc.log
npm run build > bench/x186/receipts/build.log
python3 bench/x186/finalize.py > bench/x186/receipts/summary.log
npx esbuild bench/x186/price-gate.ts --bundle --platform=node --format=esm --outfile=bench/x186/price-gate.mjs
node bench/x186/price-gate.mjs > bench/x186/receipts/price-gate.json
npx esbuild bench/x186/diagnostic.ts --bundle --platform=node --format=esm --outfile=bench/x186/diagnostic.mjs
node bench/x186/diagnostic.mjs > bench/x186/receipts/diagnostic.log
python3 bench/x186/hashes.py
