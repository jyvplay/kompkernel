#!/bin/sh
set -eu
for task in test portfolio lcp-test receipt-gate; do
 npx esbuild "bench/x179/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x179/$task.mjs"
 node "bench/x179/$task.mjs" > "bench/x179/receipts/$task-validation.log"
done
python3 bench/x179/independent.py
python3 bench/x179/modal.py
python3 bench/x179/native-handoff.py
node bench/x179/speed-build.mjs
for arm in A B; do
 node "bench/x179/count-$arm.mjs" > "bench/x179/receipts/count-$arm.json"
 node "bench/x179/vector-$arm.mjs" > "bench/x179/receipts/vector-$arm.json"
done
cmp bench/x179/receipts/count-A.json bench/x179/receipts/count-B.json
cmp bench/x179/receipts/vector-A.json bench/x179/receipts/vector-B.json
npx tsc --noEmit > bench/x179/receipts/tsc.log 2>&1
npm run build > bench/x179/receipts/build.log 2>&1
git restore tsconfig.tsbuildinfo
sh bench/x179/finalize.sh
python3 bench/x179/summarize.py
