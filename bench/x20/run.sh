#!/usr/bin/env bash
# X20 bench runner: bundle a bench TS file with esbuild (so the "@/..." alias resolves) and run it.
# usage: bench/x20/run.sh bench/x20/foo.ts [args...]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$1"; shift
BUNDLE="$(mktemp -d /tmp/x20-run-XXXX)/b.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/$SRC" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE" || exit 1
cd "$ROOT" && OMEGA_DET="${OMEGA_DET:-1}" node "$BUNDLE" "$@"
