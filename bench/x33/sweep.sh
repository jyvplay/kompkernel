#!/bin/sh
CAP=$1; shift
for f in "$@"; do
  [ -f "$f" ] || continue
  OMEGA_IN_CAP=$CAP F="$f" OMEGA_DET=1 node /tmp/_one1.mjs >> /tmp/cap$CAP.jsonl 2>/dev/null || echo "FAIL $f"
done
echo "DONE cap$CAP"
