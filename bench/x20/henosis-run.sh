#!/usr/bin/env bash
# X20: HENOSIS lane run, one process per lane. usage: henosis-run.sh <lanes> <out.jsonl>
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LANES="$1"; OUT="$2"
BUNDLE="$(mktemp -d /tmp/x20-h-XXXX)/b.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/x20/henosis-lanes.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE" || exit 3
while read -r f; do
  [ -z "$f" ] && continue
  start=$(date +%s)
  res=$(OMEGA_DET=1 timeout 1800 node "$BUNDLE" "$ROOT/$f" 2>/dev/null | tail -1)
  secs=$(( $(date +%s) - start ))
  if [ -z "$res" ]; then res="{\"file\":\"$f\",\"status\":\"TIMEOUT_OR_ERROR\"}"; fi
  echo "$res" >> "$OUT"
  echo "done $f ${secs}s" >> "$OUT.log"
done < "$LANES"
echo done >> "$OUT.status"
