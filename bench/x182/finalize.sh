#!/bin/sh
set -eu
python3 bench/x182/compare-frontier.py
npx esbuild bench/x182/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x182/frontier-gate.mjs
node bench/x182/frontier-gate.mjs
python3 bench/x182/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x182/leaders.mjs
node bench/x182/leaders.mjs bench/x182/receipts/frontier.jsonl > bench/x182/receipts/leaders.json
python3 bench/x182/local-leaders.py

python3 bench/x182/category-review.py
