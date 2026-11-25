#!/bin/sh
set -eu
npx esbuild bench/x183/test.ts --bundle --platform=node --format=esm --outfile=bench/x183/test.mjs
node bench/x183/test.mjs > bench/x183/receipts/test.log
python3 bench/x183/independent.py
npx esbuild bench/x183/worker.ts --bundle --platform=node --format=esm --outfile=bench/x183/worker.mjs
python3 bench/x183/run.py > bench/x183/receipts/run.log
npx esbuild bench/x164/frontier.ts --bundle --platform=node --format=esm --outfile=bench/x183/frontier.mjs
node --max-old-space-size=1400 bench/x183/frontier.mjs bench/x183/lanes.txt bench/x183/receipts/frontier.jsonl > bench/x183/receipts/frontier.log
npx esbuild bench/x183/readers.ts --bundle --platform=node --format=esm --outfile=bench/x183/readers.mjs
node bench/x183/readers.mjs
python3 bench/x183/finalize.py
npx tsc --noEmit > bench/x183/receipts/tsc.log
npm run build > bench/x183/receipts/build.log
