#!/bin/sh
set -eu
# npm ci required. Run without competing CPU jobs for runtime measurements.
for task in test adversary readers worker; do
 npx esbuild "bench/x185/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x185/$task.mjs"
done
node bench/x185/test.mjs > bench/x185/receipts/test.log
node bench/x185/adversary.mjs > bench/x185/receipts/adversary.log
python3 bench/x185/run.py > bench/x185/receipts/run.log
python3 bench/x185/independent.py > bench/x185/receipts/independent.log
python3 bench/x185/native-handoff.py
npx esbuild bench/x164/frontier.ts --bundle --platform=node --format=esm --outfile=bench/x185/frontier.mjs
node --max-old-space-size=1400 bench/x185/frontier.mjs bench/x185/lanes.txt bench/x185/receipts/frontier.jsonl > bench/x185/receipts/frontier.log
node bench/x185/readers.mjs > bench/x185/receipts/readers.log
node bench/x185/speed-build.mjs
for arm in A B; do
 for task in count vector merge threshold; do node "bench/x185/$task-$arm.mjs" > "bench/x185/receipts/$task-$arm.log"; done
done
for task in count vector merge threshold; do cmp "bench/x185/receipts/$task-A.log" "bench/x185/receipts/$task-B.log"; done
python3 bench/x185/runtime-run.py > bench/x185/receipts/runtime.log
npx tsc --noEmit > bench/x185/receipts/tsc.log
npm run build > bench/x185/receipts/build.log
python3 bench/x185/finalize.py > bench/x185/receipts/summary.log
python3 bench/x185/runner-test.py > bench/x185/receipts/runner-test.json
npx esbuild bench/x185/price-gate.ts --bundle --platform=node --format=esm --outfile=bench/x185/price-gate.mjs
node bench/x185/price-gate.mjs > bench/x185/receipts/price-gate.json
python3 bench/x185/hashes.py
