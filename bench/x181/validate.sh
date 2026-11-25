#!/bin/sh
set -eu
for task in test portfolio readers receipt-gate cache-attack; do
 npx esbuild "bench/x181/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x181/$task.mjs"
 node "bench/x181/$task.mjs" > "bench/x181/receipts/$task-validation.log"
done
python3 bench/x181/independent.py
python3 bench/x181/modal.py
python3 bench/x181/native-handoff.py
node bench/x181/speed-build.mjs
for arm in A B; do
 for task in count vector pair; do node "bench/x181/$task-$arm.mjs" > "bench/x181/receipts/$task-$arm.log"; done
done
for task in count vector pair; do cmp "bench/x181/receipts/$task-A.log" "bench/x181/receipts/$task-B.log"; done
npx tsc --noEmit > bench/x181/receipts/tsc.log 2>&1
npm run build > bench/x181/receipts/build.log 2>&1
git restore tsconfig.tsbuildinfo
sh bench/x181/finalize.sh
