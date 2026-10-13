#!/bin/sh
# Z39 runner: bundle a TypeScript bench with esbuild (tsconfig paths resolve '@/'), then run it with node.
# Usage: bench/z39/run.sh bench/z39/probe.ts [args...]
set -e
SRC="$1"; shift
OUT="/home/user/z39/bin/$(basename "$SRC" .ts).cjs"
./node_modules/.bin/esbuild "$SRC" --bundle --platform=node --format=cjs --log-level=warning --outfile="$OUT"
exec node "$OUT" "$@"
