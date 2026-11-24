#!/bin/sh
set -eu
python3 bench/x171/compare-frontier.py
npx esbuild bench/x171/frontier-gate.ts --bundle --platform=node --format=esm --outfile=bench/x171/frontier-gate.mjs
node bench/x171/frontier-gate.mjs
python3 bench/x171/verify-replays.py
npx esbuild bench/x134/leaders.ts --bundle --platform=node --format=esm --outfile=bench/x171/leaders.mjs
node bench/x171/leaders.mjs bench/x171/receipts/frontier.jsonl > bench/x171/receipts/leaders.json
python3 bench/x171/local-leaders.py
