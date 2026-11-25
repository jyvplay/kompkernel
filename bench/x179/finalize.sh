#!/bin/sh
set -eu
python3 bench/x179/compare-frontier.py
npx esbuild bench/x179/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x179/frontier-gate.mjs
node bench/x179/frontier-gate.mjs
python3 bench/x179/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x179/leaders.mjs
node bench/x179/leaders.mjs bench/x179/receipts/frontier.jsonl > bench/x179/receipts/leaders.json
python3 bench/x179/local-leaders.py

python3 bench/x179/category-review.py
