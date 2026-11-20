#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
git apply --check bench/x142/hash-experiment.patch
git apply bench/x142/hash-experiment.patch
trap 'git apply -R bench/x142/hash-experiment.patch' EXIT
for f in speed hash_unit; do
 node_modules/.bin/esbuild bench/x142/$f.ts --bundle --platform=node --format=esm --outfile=bench/x142/$f.mjs
done
