#!/bin/sh
for f in "$@"; do
  [ -f "$f" ] || continue
  OMEGA_DET=1 F="$f" node /tmp/_trace.mjs >> /tmp/trace.jsonl 2>/dev/null || echo "FAIL $f"
done
echo DONE
