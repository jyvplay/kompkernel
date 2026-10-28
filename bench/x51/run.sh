#!/usr/bin/env bash
# X51 runner: bundle one TypeScript entry with esbuild (tsconfig paths), run under OMEGA_DET=1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENTRY="$1"; shift
OUT="$(mktemp -d /tmp/x51-XXXX)/bundle.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ENTRY" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$OUT"
OMEGA_DET=1 node "$OUT" "$@"
