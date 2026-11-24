#!/bin/sh
set -eu
for task in repair-gate test attacks gate portfolio; do
 npx esbuild "bench/x176/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x176/$task.mjs"
 node "bench/x176/$task.mjs" > "bench/x176/receipts/$task-validation.log"
done
python3 bench/x176/independent.py
python3 bench/x176/modal.py
python3 bench/x176/native-handoff.py
# Rebuild and check current speed code, but do not repeat long timing in this script.
node bench/x176/speed-build.mjs
for arm in A B; do
 node "bench/x176/count-$arm.mjs" > "bench/x176/receipts/count-$arm.json"
 node "bench/x176/vector-$arm.mjs" > "bench/x176/receipts/vector-$arm.json"
done
cmp bench/x176/receipts/count-A.json bench/x176/receipts/count-B.json
cmp bench/x176/receipts/vector-A.json bench/x176/receipts/vector-B.json
# Recheck X175 current code and saved primary parents; the tournament is checked below.
for task in test gate sparse-test; do
 npx esbuild "bench/x175/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x175/$task.mjs"
 node "bench/x175/$task.mjs" > "bench/x175/receipts/$task-validation.log"
done
python3 bench/x175/independent.py
npx tsc --noEmit > bench/x176/receipts/tsc.log 2>&1
npm run build > bench/x176/receipts/build.log 2>&1
git restore tsconfig.tsbuildinfo
sh bench/x176/finalize.sh
python3 bench/x176/summarize.py
