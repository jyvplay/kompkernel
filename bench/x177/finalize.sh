#!/bin/sh
set -eu
python3 bench/x177/compare-frontier.py
npx esbuild bench/x177/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x177/frontier-gate.mjs
node bench/x177/frontier-gate.mjs
python3 bench/x177/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x177/leaders.mjs
node bench/x177/leaders.mjs bench/x177/receipts/frontier.jsonl > bench/x177/receipts/leaders.json
python3 bench/x177/local-leaders.py

python3 bench/x177/category-review.py
