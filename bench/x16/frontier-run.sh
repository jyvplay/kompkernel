#!/usr/bin/env bash
# X16: frontier re-run. One (lane, codec) process per run, 420 s cap. usage: frontier-run.sh <lanes> <out.jsonl>
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LANES="$1"; OUT="$2"; TO="${3:-420}"
KEYS="dendrons dendron daedalus daedalus-dual akolouthia2 phalanx-a10"
BUNDLE="$(mktemp -d /tmp/x16-fr-XXXX)/fm.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/z52/frontier-min.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE"
while read -r f; do
  [ -z "$f" ] && continue
  for k in $KEYS; do
    start=$(date +%s)
    res=$(FM_KEYS=$k OMEGA_DET=1 timeout "$TO" node "$BUNDLE" "$f" 2>/dev/null | tail -1)
    secs=$(( $(date +%s) - start ))
    if [ -z "$res" ]; then res="{\"file\":\"$f\",\"status\":\"TIMEOUT_OR_ERROR\"}"; fi
    echo "{\"key\":\"$k\",\"wall_s\":$secs,\"row\":$res}" >> "$OUT"
  done
done < "$LANES"
echo done >> "$OUT.status"
