#!/usr/bin/env bash
# z50: sweep SYNARTESIS over real lockfile excerpts (whole entries, wrapped in valid JSON) and a line-slice.
# Writes bench/z50/receipts/sweep.jsonl (one row per excerpt; every row round-trip checked by bench-syn.ts).
set -euo pipefail
cd "$(dirname "$0")/../.."
export OMEGA_DET=1
: > bench/z50/receipts/sweep.jsonl
for n in 12 16 24; do
  bench/tmp/run.sh bench/z50/make-excerpt.ts package-lock.json $n > bench/z50/corpus/lock-excerpt-$n-entries.json
  bench/tmp/run.sh bench/z50/bench-syn.ts bench/z50/corpus/lock-excerpt-$n-entries.json >> bench/z50/receipts/sweep.jsonl
done
bench/tmp/run.sh bench/z50/bench-syn.ts package-lock.json:600 >> bench/z50/receipts/sweep.jsonl
