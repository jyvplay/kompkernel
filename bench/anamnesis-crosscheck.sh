#!/usr/bin/env bash
# ANAMNESIS cross-check: the TypeScript encoder writes wires, an independent
# CPython reader (bench/anamnesis_decode.py, a second implementation written from
# the wire format) decodes them in a separate process, and diff decides.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/z44/sessions
python3 bench/anamnesis_decode.py --selftest
npx esbuild bench/z44/anamnesis-emit.ts --bundle --platform=node --format=esm \
  --outfile=bench/tmp/z44/ana-emit.mjs --log-level=error
node bench/tmp/z44/ana-emit.mjs
fail=0
n=0
for d in bench/tmp/z44/sessions/*/; do
  name=$(basename "$d")
  rm -rf "$d/decoded" && mkdir -p "$d/decoded"
  if ! python3 bench/anamnesis_decode.py "$d/wires.jsonl" --outdir "$d/decoded"; then
    echo "CPYTHON DECODE FAILED: $name"; fail=1; continue
  fi
  for src in "$d"/src_*.txt; do
    i=$(basename "$src" .txt | sed 's/src_//')
    got="$d/decoded/msg_${i}.txt"
    n=$((n+1))
    if ! cmp -s "$src" "$got"; then echo "CPYTHON MISMATCH: $name msg $i"; fail=1; fi
  done
done
if [ "$fail" = 0 ]; then
  echo "CPython cross-decode BYTE-EXACT on $n messages across $(ls -d bench/tmp/z44/sessions/*/ | wc -l) sessions"
else
  exit 1
fi
