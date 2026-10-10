#!/usr/bin/env bash
# HYLE cross-check: emit wires with the TypeScript encoder, read them back with the
# independent CPython reader (bench/hyle_decode.py), byte-compare.
#
#   ./bench/hyle-crosscheck.sh [file ...]
#
# With no arguments it uses the structural holdout set below (21 files covering every
# fold class plus identity controls). The output directory is cleared first so a run can
# never be padded by wires emitted by an older build.
#
# A wire whose payload was produced by a borrowed arm (Bc/Bg/Be/Ba/Bk) is reported
# SKIPPED, not PASSED: this reader verifies HYLE's own protocol only. Fast mode always
# selects arm b, so a SKIP means someone changed the emitter's options.
set -u
cd "$(dirname "$0")/.."

FILES=${*:-"bench/holdout-tbl/df-h.txt bench/holdout-tbl/kubectl-get-pods.txt \
bench/holdout-tbl/psql-output.txt bench/holdout-tbl/markdown-table.md \
bench/holdout-tab/aapl-2014.csv bench/holdout-tab/vix-daily-1990.csv \
bench/holdout-mk/dump.sql bench/holdout-mk/page.html bench/holdout-mk/chart.svg \
bench/holdout-mk/pom.xml bench/holdout-mk/component.jsx \
bench/holdout-ops/git-numstat.txt bench/holdout-ops/package-lock-head.json \
bench/holdout-ops/find-listing.txt bench/holdout-ops/ls-full-iso.txt \
bench/holdout-work/kb-article.txt bench/holdout-work/unified-diff.patch \
bench/holdout/gh-api.json.txt bench/holdout/json-pkg.txt \
bench/holdout/gh-prose.txt bench/holdout/code-ts.txt"}

OUT=bench/tmp/xc
mkdir -p "$OUT"
rm -f "$OUT"/*.wire "$OUT"/*.src
npx esbuild bench/hyle_emit.ts --bundle --platform=node --format=esm \
  --outfile=bench/tmp/hyle_emit.mjs --alias:@=./src --log-level=error --packages=external || exit 1
node bench/tmp/hyle_emit.mjs "--out=$OUT" $FILES || exit 1

pass=0; fail=0; skip=0
for w in "$OUT"/*.wire; do
  src="${w%.wire}.src"
  out=$(python3 bench/hyle_decode.py "$w" --check "$src" 2>&1); rc=$?
  case $rc in
    0) pass=$((pass+1));  echo "PASS $(basename "$w") — $out" ;;
    2) skip=$((skip+1));  echo "SKIP $(basename "$w") — $out" ;;
    *) fail=$((fail+1));  echo "FAIL $(basename "$w")"; echo "$out" | sed 's/^/     /' ;;
  esac
done
echo "----"
echo "hyle cross-check: $pass passed, $fail failed, $skip skipped (borrowed arm)"
[ "$fail" -eq 0 ]
