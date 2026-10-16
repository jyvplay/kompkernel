#!/usr/bin/env bash
# X15 runner: bundle one TypeScript entry with esbuild (tsconfig paths, so "@/..." resolves to src/),
# then run it under OMEGA_DET=1. usage: bench/x15/run.sh <entry.ts> [args...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENTRY="$1"; shift
OUT="$(mktemp -d /tmp/x15-XXXX)/bundle.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ENTRY" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$OUT"
OMEGA_DET=1 node "$OUT" "$@"
