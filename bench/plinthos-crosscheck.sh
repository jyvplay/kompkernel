#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/pli
npx esbuild bench/plinthos-emit.ts --bundle --platform=node --format=esm --outfile=bench/tmp/pli-emit.mjs --log-level=error
node bench/tmp/pli-emit.mjs bench/tmp/pli
python3 bench/plinthos_decode.py --selftest
fail=0
for w in bench/tmp/pli/*.wire; do
  src="${w%.wire}.src"
  if ! python3 bench/plinthos_decode.py "$w" --check "$src" >/dev/null 2>&1; then echo "CPYTHON MISMATCH: $w"; fail=1; fi
done
n=$(ls bench/tmp/pli/*.wire 2>/dev/null | wc -l)
if [ "$fail" = 0 ]; then echo "CPython cross-decode EXACT on $n PLINTHOS transposed wires"; else exit 1; fi
