#!/bin/sh
set -e
cd /home/user/kompkernel
./node_modules/.bin/esbuild "$1" --bundle --platform=node --format=esm --outfile=/tmp/_prof.mjs --alias:@=./src --log-level=error
rm -f /tmp/*.cpuprofile
OMEGA_DET=1 OMEGA_POLYTROPOS_BUDGET_MS=${B:-25000} node --cpu-prof --cpu-prof-dir=/tmp/prof /tmp/_prof.mjs
