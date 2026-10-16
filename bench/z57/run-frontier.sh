#!/bin/bash
# X12 frontier re-run: DENS-2 (dendrons), DENDRON, DAEDALUS-D (daedalus-dual), A10 (phalanx-a10), plus DAEDALUS, GRAMMA, AKOLOUTHIA-2 for context.
# Two shards (2 cores). Each shard runs its lanes through bench/z52/frontier-min.ts.
cd /home/user/kompkernel
for part in bench/z57/fl-part-aa bench/z57/fl-part-ab; do
  out=bench/z57/receipts/frontier-$(basename $part).jsonl
  mkdir -p bench/z57/receipts
  FM_KEYS=daedalus,daedalus-dual,phalanx-a10,dendron,dendrons,gramma,akolouthia2 OMEGA_DET=1 \
    bench/tmp/run.sh bench/z52/frontier-min.ts $(cat $part) > $out 2> ${out%.jsonl}.err &
done
wait
echo "shards done" >> bench/z57/receipts/done.txt
