#!/bin/sh
set -eu
for task in test portfolio; do
 npx esbuild "bench/x178/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x178/$task.mjs"
 node "bench/x178/$task.mjs" > "bench/x178/receipts/$task-validation.log"
done
python3 bench/x178/independent.py
python3 bench/x178/modal.py
python3 bench/x178/native-handoff.py
python3 bench/x177/independent.py
# Timings are NOT rerun by validation. Rebuild exact benchmark arms and gates.
node bench/x178/speed-build.mjs
for arm in A B; do
 for task in count vector pair; do
  node "bench/x178/$task-$arm.mjs" > "bench/x178/receipts/$task-$arm.json"
 done
done
for task in count vector pair; do
 cmp "bench/x178/receipts/$task-A.json" "bench/x178/receipts/$task-B.json"
done
npx tsc --noEmit > bench/x178/receipts/tsc.log 2>&1
npm run build > bench/x178/receipts/build.log 2>&1
git restore tsconfig.tsbuildinfo
sh bench/x177/finalize.sh
python3 bench/x178/summarize.py
