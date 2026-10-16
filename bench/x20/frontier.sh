#!/usr/bin/env bash
# X20 frontier re-run: one node process per lane, keys from $FM_KEYS, per-lane cap $3 seconds.
# usage: bench/x20/frontier.sh <lanes.txt> <out.jsonl> [cap_s]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LANES="$1"; OUT="$2"; CAP="${3:-600}"
BUNDLE="$(mktemp -d /tmp/x20-fr-XXXX)/fm.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/z52/frontier-min.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE"
: > "$OUT"
while read -r f; do
  [ -z "$f" ] && continue
  start=$(date +%s)
  res=$(OMEGA_DET=1 timeout "$CAP" node "$BUNDLE" "$f" 2>/dev/null | tail -1)
  secs=$(( $(date +%s) - start ))
  [ -z "$res" ] && res="{\"file\":\"$f\",\"status\":\"TIMEOUT_OR_ERROR\",\"wall_s\":$secs}"
  echo "{\"wall_s\":$secs,\"row\":$res}" >> "$OUT"
done < "$LANES"
echo done > "$OUT.status"
