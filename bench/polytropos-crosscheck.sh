#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/poly
npx esbuild bench/polytropos-emit.ts --bundle --platform=node --format=esm --outfile=bench/tmp/poly-emit.mjs --log-level=error
node bench/tmp/poly-emit.mjs bench/tmp/poly
python3 bench/syntomia_decode.py --selftest
fail=0
for w in bench/tmp/poly/*.wire; do
  src="${w%.wire}.src"
  if ! python3 bench/syntomia_decode.py "$w" --check "$src" >/dev/null 2>&1; then echo "CPYTHON MISMATCH: $w"; fail=1; fi
done
n=$(ls bench/tmp/poly/*.wire 2>/dev/null | wc -l)
if [ "$fail" = 0 ]; then echo "CPython cross-decode EXACT on $n POLYTROPOS wires"; else exit 1; fi
