#!/usr/bin/env bash
# ANAMNESIS full check. Run from the repo root:  bash bench/anamnesis-check.sh
# Exits non-zero on any failure. OMEGA_DET=1 freezes the repo's clock so the
# DAEDALUS/ARIADNE/SIBYL deadlines never bind and every result is reproducible.
set -euo pipefail
cd "$(dirname "$0")/.."
export OMEGA_DET=1
mkdir -p bench/tmp/z44

echo "== 1. typecheck =="
./node_modules/.bin/tsc --noEmit -p .

echo "== 2. in-process assertions (83 checks) =="
./node_modules/.bin/esbuild bench/z44/anamnesis-test.ts --bundle --platform=node --format=esm \
  --outfile=bench/tmp/z44/atest.mjs --log-level=error
node bench/tmp/z44/atest.mjs

echo "== 3. independent CPython cross-decode =="
bash bench/anamnesis-crosscheck.sh

echo
echo "ANAMNESIS: typecheck + 83 in-process checks + CPython cross-decode all green"
