#!/usr/bin/env bash
# X20 runner: bundle a bench TS entry and run it. usage: bench/x20/run.sh <entry.ts> [args...]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENTRY="$1"; shift
BUNDLE="$(mktemp -d /tmp/x20-XXXX)/b.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/$ENTRY" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE" || exit 3
exec node "$BUNDLE" "$@"
