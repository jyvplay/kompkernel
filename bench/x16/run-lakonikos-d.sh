#!/usr/bin/env bash
# X16 runner: bundle bench/x16/lakonikos-d-check.ts with esbuild, run under OMEGA_DET=1. usage: run-lakonikos-d.sh <lanes.txt>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp -d /tmp/x16-lkd-XXXX)/bundle.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/x16/lakonikos-d-check.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$OUT"
OMEGA_DET=1 node "$OUT" "$1"
