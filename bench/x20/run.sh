#!/usr/bin/env bash
# X20 runner: bundle a TS bench script with esbuild (tsconfig paths) and run it under OMEGA_DET=1.
# usage: bench/x20/run.sh <script.ts> [args...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$1"; shift || true
OUT="$(mktemp -d /tmp/x20-XXXX)/bundle.mjs"
"$ROOT/node_modules/.bin/esbuild" "$SRC" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$OUT"
OMEGA_DET=1 node "$OUT" "$@"
