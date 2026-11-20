#!/usr/bin/env bash
# Serial replay using frozen source artifacts. Combined script is syntax-checked;
# individual gates were executed separately, not this entire script as one run.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p bench/x147/receipts
for f in frontier probe child unit composite-unit controls final-gate integration frontier-gate; do
  node_modules/.bin/esbuild bench/x147/$f.ts --bundle --platform=node --format=esm --outfile=bench/x147/$f.mjs
done
OMEGA_SCALAR=0 node --max-old-space-size=1800 bench/x147/frontier.mjs > bench/x147/receipts/frontier.log 2>&1
node bench/x147/unit.mjs
node bench/x147/composite-unit.mjs
node bench/x147/controls.mjs
node --max-old-space-size=1800 bench/x147/probe.mjs > bench/x147/receipts/probe.log 2>&1
node --max-old-space-size=1800 bench/x147/child.mjs > bench/x147/receipts/child.log 2>&1
node bench/x147/final-gate.mjs
node --max-old-space-size=1800 bench/x147/integration.mjs > bench/x147/receipts/integration.log 2>&1
node bench/x147/frontier-gate.mjs
python bench/x147/verify.py > bench/x147/receipts/python.jsonl
python bench/x147/gates.py
node_modules/.bin/esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x147/leaders.mjs
node bench/x147/leaders.mjs bench/x147/receipts/frontier.jsonl > bench/x147/receipts/leaders.json
npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=1536 npm run build
