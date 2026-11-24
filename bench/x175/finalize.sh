#!/bin/sh
set -eu
python3 bench/x175/compare-frontier.py
npx esbuild bench/x175/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x175/frontier-gate.mjs
node bench/x175/frontier-gate.mjs
python3 bench/x175/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x175/leaders.mjs
node bench/x175/leaders.mjs bench/x175/receipts/frontier.jsonl > bench/x175/receipts/leaders.json
python3 bench/x175/local-leaders.py

python3 bench/x175/category-review.py
