#!/bin/sh
set -eu
python3 bench/x180/compare-frontier.py
npx esbuild bench/x180/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x180/frontier-gate.mjs
node bench/x180/frontier-gate.mjs
python3 bench/x180/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x180/leaders.mjs
node bench/x180/leaders.mjs bench/x180/receipts/frontier.jsonl > bench/x180/receipts/leaders.json
python3 bench/x180/local-leaders.py

python3 bench/x180/category-review.py
