#!/usr/bin/env bash
# Serial reproducer of completed gates; large exploratory failures are opt-in.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p bench/x146/receipts
for f in frontier probe parent unit composite_unit integration controls delta_control layout scalar-confirm final_gate reprice scope_unit speed codec-speed; do
 node_modules/.bin/esbuild bench/x146/$f.ts --bundle --platform=node --format=esm --outfile=bench/x146/$f.mjs
done
OMEGA_SCALAR=0 node --max-old-space-size=1800 bench/x146/frontier.mjs > bench/x146/receipts/frontier.log 2>&1
node bench/x146/probe.mjs > bench/x146/receipts/probe.jsonl
node bench/x146/unit.mjs > bench/x146/receipts/unit.json
node bench/x146/scope_unit.mjs > bench/x146/receipts/scope-unit.json
node --max-old-space-size=1800 bench/x146/parent.mjs bench/x146/heldout/node-67620.json bench/x146/heldout/vite-24152.json bench/x146/heldout/vite-24155.json > bench/x146/receipts/parent.jsonl
node --max-old-space-size=1800 bench/x146/parent.mjs bench/x146/heldout/pypi-jieba.txt > bench/x146/receipts/root-parent.jsonl
node --max-old-space-size=1800 bench/x146/parent.mjs bench/x146/heldout/pypi-httpx.txt > bench/x146/receipts/packages-parent.jsonl
node bench/x146/reprice.mjs > bench/x146/receipts/final-parent.jsonl
node bench/x146/composite_unit.mjs > bench/x146/receipts/composite-unit.json
node --max-old-space-size=1800 bench/x146/integration.mjs bench/x146/heldout/pypi-httpx.txt > bench/x146/receipts/integration.jsonl
OMEGA_SCALAR=1 node bench/x146/scalar-confirm.mjs bench/x144/heldout/vite.md > bench/x146/receipts/scalar-confirm.jsonl
node bench/x146/final_gate.mjs > bench/x146/receipts/final-gate.json
python3 bench/x146/verify.py > bench/x146/receipts/python.json
python3 bench/x146/gates.py
for f in controls delta_control layout; do node bench/x146/$f.mjs > bench/x146/receipts/$f.jsonl; done
node_modules/.bin/esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x146/leaders.mjs
node bench/x146/leaders.mjs bench/x146/receipts/frontier.jsonl > bench/x146/receipts/leaders.json
node --max-old-space-size=1800 bench/x146/speed.mjs > bench/x146/receipts/speed.jsonl
node --max-old-space-size=1800 bench/x146/codec-speed.mjs > bench/x146/receipts/codec-speed.jsonl
python3 bench/x146/summarize-speed.py
npx tsc --noEmit > bench/x146/receipts/tsc.log 2>&1
git restore tsconfig.tsbuildinfo
npm run build > bench/x146/receipts/build.log 2>&1
python3 bench/x146/summarize.py > bench/x146/receipts/summary.log
# These were NOT completed successfully in the recorded run. They are not part
# of the successful serial gate and may exhaust the heap again.
if [[ "${RUN_LARGE:-0}" == 1 ]]; then
 node --max-old-space-size=1800 bench/x146/parent.mjs bench/x146/heldout/pypi-pypinyin.txt bench/x146/heldout/pypi-rich.txt bench/x146/heldout/pypi-fastapi.txt
fi
