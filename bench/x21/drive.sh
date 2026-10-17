#!/usr/bin/env bash
# $1 = shard file, $2 = output jsonl
while read -r f; do
  ./bench/tmp/run.sh bench/x21/fullreg2.ts "$f" 300000 2>>"${2%.jsonl}.err" || echo "FAIL $f" >> "${2%.jsonl}.err"
done < "$1" > "$2"
