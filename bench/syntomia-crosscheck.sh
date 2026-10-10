#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/synt
npx esbuild bench/syntomia-emit.ts --bundle --platform=node --format=esm --outfile=bench/tmp/synt-emit.mjs --log-level=error
node bench/tmp/synt-emit.mjs bench/tmp/synt
python3 bench/syntomia_decode.py --selftest
fail=0
for w in bench/tmp/synt/*.wire; do
  src="${w%.wire}.src"
  if ! python3 bench/syntomia_decode.py "$w" --check "$src" >/dev/null; then echo "CPYTHON MISMATCH: $w"; fail=1; fi
done
n=$(ls bench/tmp/synt/*.wire 2>/dev/null | wc -l)
if [ "$fail" = 0 ]; then echo "CPython cross-decode EXACT on $n SYNTOMIA wires"; else exit 1; fi
