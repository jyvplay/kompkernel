#!/bin/sh
set -eu
python3 bench/x172/compare-frontier.py
npx esbuild bench/x172/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x172/frontier-gate.mjs
node bench/x172/frontier-gate.mjs
python3 bench/x172/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x172/leaders.mjs
node bench/x172/leaders.mjs bench/x172/receipts/frontier.jsonl > bench/x172/receipts/leaders.json
python3 bench/x172/local-leaders.py

python3 bench/x172/category-review.py
