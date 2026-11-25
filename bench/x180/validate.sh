#!/bin/sh
set -eu
for task in test portfolio receipt-gate; do
 npx esbuild "bench/x180/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x180/$task.mjs"
 node "bench/x180/$task.mjs" > "bench/x180/receipts/$task-validation.log"
done
python3 bench/x180/independent.py
python3 bench/x180/modal.py
python3 bench/x180/native-handoff.py
node bench/x180/speed-build.mjs
for arm in A B; do
 node "bench/x180/count-$arm.mjs" > "bench/x180/receipts/count-$arm.log"
 node "bench/x180/vector-$arm.mjs" > "bench/x180/receipts/vector-$arm.log"
done
cmp bench/x180/receipts/count-A.log bench/x180/receipts/count-B.log
cmp bench/x180/receipts/vector-A.log bench/x180/receipts/vector-B.log
npx tsc --noEmit > bench/x180/receipts/tsc.log 2>&1
npm run build > bench/x180/receipts/build.log 2>&1
git restore tsconfig.tsbuildinfo
sh bench/x180/finalize.sh
