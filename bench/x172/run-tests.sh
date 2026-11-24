#!/bin/sh
set -eu
for file in test portfolio weighted-test chunk-gate gate; do
  npx esbuild bench/x172/$file.ts --bundle --platform=node --format=esm --outfile=bench/x172/$file.mjs
  node bench/x172/$file.mjs > bench/x172/receipts/$file.log
done
python3 bench/x172/independent.py
python3 bench/x172/modal.py
python3 bench/x172/attractor.py
python3 bench/x172/native-handoff.py
