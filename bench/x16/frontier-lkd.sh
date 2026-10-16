#!/usr/bin/env bash
# X16: registry-path check for lakonikos-d. Runs the frontier runner (bench/z52/frontier-min.ts, registry run())
# with keys daedalus-dual and lakonikos-d, one process per lane, OMEGA_DET=1. usage: frontier-lkd.sh <lanes> <out.jsonl>
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LANES="$1"; OUT="$2"
BUNDLE="$(mktemp -d /tmp/x16-lkd-fm-XXXX)/fm.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/z52/frontier-min.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE"
while read -r f; do
  [ -z "$f" ] && continue
  res=$(FM_KEYS=daedalus-dual,lakonikos-d OMEGA_DET=1 timeout 900 node "$BUNDLE" "$ROOT/$f" 2>/dev/null | tail -1)
  if [ -z "$res" ]; then res="{\"file\":\"$f\",\"status\":\"TIMEOUT_OR_ERROR\"}"; fi
  echo "$res" >> "$OUT"
done < "$LANES"
echo done >> "$OUT.status"
