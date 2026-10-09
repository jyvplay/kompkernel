#!/usr/bin/env bash
# Cross-decoder check: the TypeScript encoder emits wires, the from-scratch
# CPython reader (bench/synizesis_decode.py) decodes them, and we diff against
# the source bytes.  Two independent implementations, one contract.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p bench/tmp/synx
npx esbuild bench/synizesis-emit.ts --bundle --platform=node --format=esm --outfile=bench/tmp/synx/emit.mjs --log-level=error
node bench/tmp/synx/emit.mjs bench/tmp/synx
python3 bench/synizesis_decode.py --selftest
fail=0
for w in bench/tmp/synx/*.wire; do
  src="${w%.wire}.src"
  if ! python3 bench/synizesis_decode.py "$w" --check "$src" >/dev/null; then
    echo "CPYTHON MISMATCH: $w"; fail=1
  fi
done
n=$(ls bench/tmp/synx/*.wire 2>/dev/null | wc -l)
if [ "$fail" = 0 ]; then echo "CPython cross-decode EXACT on $n wires"; else exit 1; fi
