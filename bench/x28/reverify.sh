#!/bin/sh
cd /home/user/kompkernel
: > bench/x28/reverify.log
for i in $(seq 0 27); do
  IDX="$i" ./bench/tmp/run.sh bench/x28/reverify.ts >> bench/x28/reverify.log 2>&1
  echo "DONE $i" >> bench/x28/reverify.log
done
echo "ALLDONE" >> bench/x28/reverify.log
