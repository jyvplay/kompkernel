#!/usr/bin/env bash
# Reproduce serially to avoid the memory contention recorded in the first build.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p bench/x144/receipts
for f in frontier probe parent heldout unit final_gate transport_gate controls delta_control image_census layout; do
 node_modules/.bin/esbuild bench/x144/$f.ts --bundle --platform=node --format=esm --outfile=bench/x144/$f.mjs
done
node --max-old-space-size=1800 bench/x144/frontier.mjs > bench/x144/receipts/frontier.log 2>&1
node bench/x144/probe.mjs > bench/x144/receipts/probe.jsonl
node --max-old-space-size=1800 bench/x144/parent.mjs > bench/x144/receipts/parent.jsonl
for name in baseline probe parent; do : > bench/x144/receipts/heldout-$name.jsonl; done
node --max-old-space-size=1800 bench/x144/heldout.mjs > bench/x144/receipts/heldout.log 2>&1
for f in controls delta_control image_census layout; do node bench/x144/$f.mjs > bench/x144/receipts/$f.jsonl; done
node bench/x144/unit.mjs > bench/x144/receipts/unit.json
node bench/x144/transport_gate.mjs > bench/x144/receipts/transport-gate.json
node bench/x144/final_gate.mjs > bench/x144/receipts/final-gate.json
python3 bench/x144/verify.py > bench/x144/receipts/coldread.json
python3 bench/x144/verify_frontier.py > bench/x144/receipts/independent-frontier.json
bash bench/x144/build-speed.sh
node bench/x144/stream_unit.mjs > bench/x144/receipts/stream-unit.log 2>&1
node --max-old-space-size=1800 bench/x144/speed.mjs > bench/x144/receipts/speed.jsonl 2> bench/x144/receipts/speed.log
node_modules/.bin/esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x134/leaders.mjs
node bench/x134/leaders.mjs bench/x144/receipts/frontier.jsonl > bench/x144/receipts/leaders.json
npx tsc --noEmit > bench/x144/receipts/tsc.log 2>&1
git restore tsconfig.tsbuildinfo
npm run build > bench/x144/receipts/build.log 2>&1
python3 bench/x144/summarize.py > bench/x144/receipts/summary.log
