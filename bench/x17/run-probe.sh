#!/usr/bin/env bash
# X17 runner: esbuild bundle of a TypeScript probe, run under OMEGA_DET=1. usage: run-probe.sh <entry.ts> [args]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(mktemp -d /tmp/x17-XXXX)/bundle.mjs"
"$ROOT/node_modules/.bin/esbuild" "$1" --bundle --platform=node --format=esm --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$OUT"
shift; cd "$ROOT" && OMEGA_DET=1 node "$OUT" "$@"
