#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/log
npx esbuild bench/logistike-emit.ts --bundle --platform=node --format=esm --outfile=bench/tmp/log-emit.mjs --log-level=error
node bench/tmp/log-emit.mjs bench/tmp/log
python3 bench/syntomia_decode.py --selftest
fail=0
for w in bench/tmp/log/*.wire; do
  src="${w%.wire}.src"
  if ! python3 bench/syntomia_decode.py "$w" --check "$src" >/dev/null 2>&1; then echo "CPYTHON MISMATCH: $w"; fail=1; fi
done
n=$(ls bench/tmp/log/*.wire 2>/dev/null | wc -l)
if [ "$fail" = 0 ]; then echo "CPython cross-decode EXACT on $n LOGISTIKE wires"; else exit 1; fi
