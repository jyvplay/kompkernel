#!/usr/bin/env bash
# Re-run the requested pre-POLYCHRON frontier, one lane/codec process at a time.
# A timeout is a recorded non-result, never a numeric frontier cell.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LANES="${1:-$ROOT/bench/x16/lanes-all.txt}"
OUT="${2:-$ROOT/bench/polychron/receipts/frontier-recheck.jsonl}"
TO="${3:-120}"
KEYS="dendrons akolouthia2 daedalus-dual phalanx-a10"
mkdir -p "$(dirname "$OUT")"
: > "$OUT"
BUNDLE="$(mktemp -d /tmp/polychron-frontier-XXXX)/fm.mjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/bench/z52/frontier-min.ts" --bundle --platform=node --format=esm \
  --tsconfig="$ROOT/tsconfig.json" --log-level=warning --outfile="$BUNDLE"
while read -r f; do
  [ -z "$f" ] && continue
  for k in $KEYS; do
    start=$(date +%s)
    res=$(FM_KEYS="$k" OMEGA_DET=1 timeout "$TO" node "$BUNDLE" "$ROOT/$f" 2>/dev/null | tail -1)
    secs=$(( $(date +%s) - start ))
    if [ -z "$res" ]; then
      res="{\"file\":\"$f\",\"status\":\"TIMEOUT_OR_ERROR\"}"
    fi
    printf '{"key":"%s","wall_s":%s,"row":%s}\n' "$k" "$secs" "$res" >> "$OUT"
  done
done < "$LANES"
printf 'done\n' > "$OUT.status"
printf 'frontier recheck written to %s\n' "$OUT" >&2
