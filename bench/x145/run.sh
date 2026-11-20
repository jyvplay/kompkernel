#!/usr/bin/env bash
# Serial reproducer. Full frontier sweeps can take tens of minutes.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p bench/x145/receipts
for f in frontier frontier-scalar probe unit attacks memo integration controls delta_control layout speed final_gate; do
 node_modules/.bin/esbuild bench/x145/$f.ts --bundle --platform=node --format=esm --outfile=bench/x145/$f.mjs
done
OMEGA_SCALAR=0 node --max-old-space-size=1800 bench/x145/frontier.mjs > bench/x145/receipts/frontier.log 2>&1
OMEGA_SCALAR=1 node --max-old-space-size=1800 bench/x145/frontier-scalar.mjs > bench/x145/receipts/frontier-scalar.log 2>&1
for f in unit attacks memo; do node bench/x145/$f.mjs > bench/x145/receipts/$f.json; done
for f in probe controls delta_control layout; do node bench/x145/$f.mjs > bench/x145/receipts/$f.jsonl; done
OMEGA_SCALAR=1 node bench/x145/integration.mjs bench/x144/heldout/vite.md > bench/x145/receipts/integration.jsonl
OMEGA_SCALAR=1 node bench/x145/integration.mjs bench/x145/heldout/clsx.md bench/x145/heldout/tailwind-merge.md > bench/x145/receipts/heldout.jsonl
OMEGA_SCALAR=0 node bench/x145/integration.mjs bench/x145/heldout/clsx.md bench/x145/heldout/tailwind-merge.md > bench/x145/receipts/heldout-baseline.jsonl
python3 bench/x145/verify.py > bench/x145/receipts/python.json
node bench/x145/final_gate.mjs > bench/x145/receipts/final-gate.json
node_modules/.bin/esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x145/leaders.mjs
node bench/x145/leaders.mjs bench/x145/receipts/frontier.jsonl > bench/x145/receipts/leaders.json
node bench/x145/leaders.mjs bench/x145/receipts/frontier-scalar.jsonl > bench/x145/receipts/leaders-scalar.json
npx tsc --noEmit > bench/x145/receipts/tsc.log 2>&1
git restore tsconfig.tsbuildinfo
npm run build > bench/x145/receipts/build.log 2>&1
node --max-old-space-size=1800 bench/x145/speed.mjs > bench/x145/receipts/speed.jsonl
node --max-old-space-size=1800 bench/x145/speed.mjs BAAB > bench/x145/receipts/speed-reverse.jsonl
python3 bench/x145/summarize-speed.py
python3 bench/x145/summarize.py > bench/x145/receipts/summary.log
