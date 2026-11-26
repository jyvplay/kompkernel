#!/bin/sh
set -eu
# npm ci required. Run without competing CPU jobs for runtime measurements.
for task in test adversary readers worker; do
 npx esbuild "bench/x187/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x187/$task.mjs"
done
node bench/x187/test.mjs > bench/x187/receipts/test.log
node bench/x187/adversary.mjs > bench/x187/receipts/adversary.log
python3 bench/x187/run.py > bench/x187/receipts/run.log
python3 bench/x187/forced-run.py > bench/x187/receipts/forced-run.log
python3 bench/x187/independent.py > bench/x187/receipts/independent.log
python3 bench/x187/native-handoff.py
npx esbuild bench/x164/frontier.ts --bundle --platform=node --format=esm --outfile=bench/x187/frontier.mjs
node --max-old-space-size=1400 bench/x187/frontier.mjs bench/x187/lanes.txt bench/x187/receipts/frontier.jsonl > bench/x187/receipts/frontier.log
node bench/x187/readers.mjs > bench/x187/receipts/readers.log
node bench/x187/speed-build.mjs
for arm in A B; do
 for task in count vector merge threshold ascii; do node "bench/x187/$task-$arm.mjs" > "bench/x187/receipts/$task-$arm.log"; done
done
for task in count vector merge threshold ascii; do cmp "bench/x187/receipts/$task-A.log" "bench/x187/receipts/$task-B.log"; done
python3 bench/x187/runtime-run.py > bench/x187/receipts/runtime.log
npx tsc --noEmit > bench/x187/receipts/tsc.log
npm run build > bench/x187/receipts/build.log
python3 bench/x187/finalize.py > bench/x187/receipts/summary.log
npx esbuild bench/x187/price-gate.ts --bundle --platform=node --format=esm --outfile=bench/x187/price-gate.mjs
node bench/x187/price-gate.mjs > bench/x187/receipts/price-gate.json
npx esbuild bench/x187/modal.ts --bundle --platform=node --format=esm --outfile=bench/x187/modal.mjs
node bench/x187/modal.mjs
node bench/x187/padding-probe.js
node bench/x187/rotation-probe.js
node bench/x187/count-probe.js
npx esbuild bench/x187/special-token.ts --bundle --platform=node --format=esm --outfile=bench/x187/special-token.mjs
node bench/x187/special-token.mjs
python3 bench/x187/hashes.py
