#!/bin/sh
set -eu
for task in test portfolio readers receipt-gate price-attribution; do
 npx esbuild "bench/x182/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x182/$task.mjs"
 node "bench/x182/$task.mjs" > "bench/x182/receipts/$task-validation.log"
done
python3 bench/x182/independent.py
python3 bench/x182/cue-attacks.py
python3 bench/x182/modal.py
python3 bench/x182/native-handoff.py
node bench/x182/speed-build.mjs
for arm in A B; do
 for task in count vector merge; do node "bench/x182/$task-$arm.mjs" > "bench/x182/receipts/$task-$arm.log"; done
done
for task in count vector merge; do cmp "bench/x182/receipts/$task-A.log" "bench/x182/receipts/$task-B.log"; done
npx tsc --noEmit > bench/x182/receipts/tsc.log 2>&1
npm run build > bench/x182/receipts/build.log 2>&1
git restore tsconfig.tsbuildinfo
sh bench/x182/finalize.sh
