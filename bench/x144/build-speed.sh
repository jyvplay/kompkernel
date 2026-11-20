#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
git apply --check bench/x144/stream-experiment.patch
git apply bench/x144/stream-experiment.patch
trap 'git apply -R bench/x144/stream-experiment.patch' EXIT
for f in speed stream_unit; do
 node_modules/.bin/esbuild bench/x144/$f.ts --bundle --platform=node --format=esm --outfile=bench/x144/$f.mjs
done
