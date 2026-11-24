#!/bin/sh
set -eu
python3 bench/x174/compare-frontier.py
npx esbuild bench/x174/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x174/frontier-gate.mjs
node bench/x174/frontier-gate.mjs
python3 bench/x174/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x174/leaders.mjs
node bench/x174/leaders.mjs bench/x174/receipts/frontier.jsonl > bench/x174/receipts/leaders.json
python3 bench/x174/local-leaders.py

python3 bench/x174/category-review.py
