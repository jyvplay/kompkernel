#!/bin/sh
set -eu
python3 bench/x173/compare-frontier.py
npx esbuild bench/x173/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x173/frontier-gate.mjs
node bench/x173/frontier-gate.mjs
python3 bench/x173/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x173/leaders.mjs
node bench/x173/leaders.mjs bench/x173/receipts/frontier.jsonl > bench/x173/receipts/leaders.json
python3 bench/x173/local-leaders.py

python3 bench/x173/category-review.py
