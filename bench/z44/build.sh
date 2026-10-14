#!/bin/sh
# usage: ./bench/z44/build.sh bench/z44/foo.ts [args...]
set -e
f="$1"; shift
base=$(basename "$f" .ts)
cd /home/user/kompkernel
./node_modules/.bin/esbuild "$f" --bundle --platform=node --format=esm --outfile="/tmp/z44-$base.mjs" --alias:@=/home/user/kompkernel/src --log-level=warning
exec node "/tmp/z44-$base.mjs" "$@"
