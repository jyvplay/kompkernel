#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/eust
npx esbuild bench/eustochia-emit.ts --bundle --platform=node --format=esm --outfile=bench/tmp/eust-emit.mjs --log-level=error
node bench/tmp/eust-emit.mjs bench/tmp/eust
python3 bench/syntomia_decode.py --selftest
fail=0
for w in bench/tmp/eust/*.wire; do
  src="${w%.wire}.src"
  if ! python3 bench/syntomia_decode.py "$w" --check "$src" >/dev/null 2>&1; then echo "CPYTHON MISMATCH: $w"; fail=1; fi
done
n=$(ls bench/tmp/eust/*.wire 2>/dev/null | wc -l)
if [ "$fail" = 0 ]; then echo "CPython cross-decode EXACT on $n EUSTOCHIA wires"; else exit 1; fi
