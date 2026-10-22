#!/usr/bin/env bash
# X16 runner for bench/x16/alias-test-28.ts (esbuild bundle, OMEGA_DET=1). usage: run-alias-28.sh <lanes.txt>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp -d /tmp/x16-alias-XXXX)/bundle.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/x16/alias-test-28.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$OUT"
cd "$ROOT" && OMEGA_DET=1 node "$OUT" $(cat "$1")
