#!/bin/sh
set -eu
python3 bench/x181/compare-frontier.py
npx esbuild bench/x181/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x181/frontier-gate.mjs
node bench/x181/frontier-gate.mjs
python3 bench/x181/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x181/leaders.mjs
node bench/x181/leaders.mjs bench/x181/receipts/frontier.jsonl > bench/x181/receipts/leaders.json
python3 bench/x181/local-leaders.py

python3 bench/x181/category-review.py
