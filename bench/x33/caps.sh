#!/bin/sh
for C in 2 3 4; do
  for f in "$@"; do
    [ -f "$f" ] || continue
    OMEGA_DET=1 OMEGA_IN_CAP=$C F="$f" node /tmp/_one1.mjs >> /tmp/caps.jsonl 2>/dev/null || echo "FAIL $f"
  done
done
echo DONE
