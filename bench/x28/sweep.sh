#!/bin/sh
cd /home/user/kompkernel
: > bench/x28/sweep.log
for i in $(seq 0 27); do
  IDX="$i" ./bench/tmp/run.sh bench/x28/sweep.ts >> bench/x28/sweep.log 2>&1
  echo "DONE $i" >> bench/x28/sweep.log
done
echo "ALLDONE" >> bench/x28/sweep.log
