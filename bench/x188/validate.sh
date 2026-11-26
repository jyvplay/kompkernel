#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
for name in test adversary portfolio-test; do
 npx esbuild "bench/x188/$name.ts" --bundle --platform=node --format=esm --outfile="bench/x188/$name.mjs"
done
node bench/x188/test.mjs bench/x188/receipts/frontier.jsonl
node bench/x188/adversary.mjs
node bench/x188/portfolio-test.mjs
python3 bench/x188/independent.py
python3 bench/x188/finalize.py
npx tsc --noEmit
