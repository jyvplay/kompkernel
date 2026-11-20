#!/usr/bin/env bash
# Serial reproducer assembled from executed commands; needs npm ci first.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p bench/x144b/receipts
for f in frontier probe parent heldout unit repair admission_attack final_gate controls delta_control image_census layout; do
 node_modules/.bin/esbuild bench/x144b/$f.ts --bundle --platform=node --format=esm --outfile=bench/x144b/$f.mjs
done
node --max-old-space-size=1800 bench/x144b/frontier.mjs > bench/x144b/receipts/frontier.log 2>&1
node bench/x144b/probe.mjs > bench/x144b/receipts/probe.jsonl
node --max-old-space-size=1800 bench/x144b/parent.mjs > bench/x144b/receipts/parent.jsonl
for n in baseline probe parent; do : > bench/x144b/receipts/heldout-$n.jsonl; done
node --max-old-space-size=1800 bench/x144b/heldout.mjs > bench/x144b/receipts/heldout.log 2>&1
node bench/x144b/repair.mjs > bench/x144b/receipts/repair.jsonl
node bench/x144b/unit.mjs > bench/x144b/receipts/unit.json
node bench/x144b/admission_attack.mjs > bench/x144b/receipts/admission-attack.json
node bench/x144b/final_gate.mjs > bench/x144b/receipts/final-gate.json
python3 bench/x144b/verify.py > bench/x144b/receipts/coldread.json
for f in controls delta_control image_census layout; do node bench/x144b/$f.mjs > bench/x144b/receipts/$f.jsonl; done
bash bench/x144b/build-speed.sh
node bench/x144b/scan_unit.mjs > bench/x144b/receipts/scan-unit.json
node --max-old-space-size=1800 bench/x144b/speed.mjs > bench/x144b/receipts/speed.jsonl
node_modules/.bin/esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x134/leaders.mjs
node bench/x134/leaders.mjs bench/x144b/receipts/frontier.jsonl > bench/x144b/receipts/leaders.json
npx tsc --noEmit > bench/x144b/receipts/tsc.log 2>&1
git restore tsconfig.tsbuildinfo
npm run build > bench/x144b/receipts/build.log 2>&1
python3 bench/x144b/summarize.py > bench/x144b/receipts/summary.log
