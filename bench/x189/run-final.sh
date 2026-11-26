#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npx esbuild bench/x189/trials.ts --bundle --platform=node --format=esm --outfile=bench/x189/trials.mjs
npx esbuild bench/x189/test.ts --bundle --platform=node --format=esm --outfile=bench/x189/test.mjs
node bench/x189/test.mjs > bench/x189/receipts/unit.log
node bench/x189/trials.mjs bench/x189/receipts/frontier.jsonl > bench/x189/receipts/trials.jsonl
: > bench/x189/receipts/ranking.jsonl
for ranking in chars boundary; do
 for family in remine factor; do
  node bench/x189/trials.mjs bench/x189/receipts/frontier.jsonl "$family" '' "$ranking" >> bench/x189/receipts/ranking.jsonl
 done
done
python3 bench/x189/independent.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x189/leaders.mjs
node bench/x189/leaders.mjs bench/x189/receipts/frontier.jsonl > bench/x189/receipts/parent-census.json
python3 bench/x189/runtime-run.py
