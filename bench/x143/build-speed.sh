#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
git apply --check bench/x143/tail-experiment.patch
git apply bench/x143/tail-experiment.patch
trap 'git apply -R bench/x143/tail-experiment.patch' EXIT
for f in speed tail_unit; do
 node_modules/.bin/esbuild bench/x143/$f.ts --bundle --platform=node --format=esm --outfile=bench/x143/$f.mjs
done
