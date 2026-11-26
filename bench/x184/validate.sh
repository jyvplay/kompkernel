#!/bin/sh
set -eu
# Requires npm ci. Do not run another CPU benchmark concurrently.
for task in test adversary readers worker; do
 npx esbuild "bench/x184/$task.ts" --bundle --platform=node --format=esm --outfile="bench/x184/$task.mjs"
done
node bench/x184/test.mjs > bench/x184/receipts/test.log
node bench/x184/adversary.mjs > bench/x184/receipts/adversary.log
python3 bench/x184/run.py > bench/x184/receipts/run.log
python3 bench/x184/independent.py > bench/x184/receipts/independent.log
python3 bench/x184/native-handoff.py
npx esbuild bench/x184/shape-ablation.ts --bundle --platform=node --format=esm --outfile=bench/x184/shape-ablation.mjs
python3 bench/x184/ablation-run.py > bench/x184/receipts/ablation.log
npx esbuild bench/x164/frontier.ts --bundle --platform=node --format=esm --outfile=bench/x184/frontier.mjs
node --max-old-space-size=1400 bench/x184/frontier.mjs bench/x184/lanes.txt bench/x184/receipts/frontier.jsonl > bench/x184/receipts/frontier.log
node bench/x184/readers.mjs > bench/x184/receipts/readers.log
node bench/x184/speed-build.mjs
for arm in A B; do
 for task in count vector merge stream; do node "bench/x184/$task-$arm.mjs" > "bench/x184/receipts/$task-$arm.log"; done
done
for task in count vector merge stream; do cmp "bench/x184/receipts/$task-A.log" "bench/x184/receipts/$task-B.log"; done
python3 bench/x184/runtime-run.py > bench/x184/receipts/runtime.log
npx tsc --noEmit > bench/x184/receipts/tsc.log
npm run build > bench/x184/receipts/build.log
python3 bench/x184/finalize.py > bench/x184/receipts/summary.log

python3 bench/x184/hashes.py
